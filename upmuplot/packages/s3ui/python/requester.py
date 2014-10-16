from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
from SocketServer import ThreadingMixIn
import json
import os
import requests
import string
import sys
import urllib

from smapx_data import get_smapx_data

if sys.argv[-1] == '-l':
    local = True
else:
    local = False

lowbound = 2000
highbound = 4000

class HTTPRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.find('?') != -1:
            self.path, self.query = self.path.split('?', 1)
        else:
            self.query = ''
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET POST')
        self.send_header('Content-type','text/html')
        self.end_headers()
        if self.query:
            args = self.query
            kvpairs = map(lambda x: x.split('='), args.split('&'))
            kwargs = {pair[0]: pair[1] for pair in kvpairs}
            kwargs['endtime'] = min(int(kwargs['endtime']), highbound * 1000000 if 'fake-data2' in self.path else lowbound * 1000000)
            kwargs['starttime'] = max(int(kwargs['starttime']), 1000000000)
            kwargs['pw'] = int(kwargs['pw'])
            if kwargs['endtime'] <= kwargs['starttime']:
                self.wfile.write('[{"XReadings": []}]')
                print 'Sent empty response'
                return
            kwargs['hole'] = 'fake-data2' in self.path
            data = json.dumps(get_smapx_data(**kwargs))
            self.wfile.write(data)
            print 'Sent response'
        else:
            self.wfile.write('GET communication successful')
            
    def do_POST(self):
        global lowbound, highbound
        self.query = self.rfile.read(int(self.headers['Content-Length']))
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET POST')
        self.send_header('Content-type','text/html')
        self.end_headers()
        print self.query
        if self.query.startswith("select"):
            newquery = self.query
            if newquery == 'select distinct Metadata/SourceName':
                self.wfile.write('["Fake Data"]')
            elif newquery == 'select distinct Path where Metadata/SourceName = "Fake Data"':
                self.wfile.write('["/tests/Data Range Test", "/tests/Data Range Test 2"]')
            elif newquery == 'select * where Metadata/SourceName = "Fake Data" and Path = "/tests/Data Range Test"':
                self.wfile.write('[{"Path": "/tests/Data Range Test", "Metadata": {"SourceName": "Fake Data", "Instrument": {"ModelName": "A Python Program"}}, "uuid": "fake-data", "Properties": {"UnitofTime": "ns", "Timezone": "America/Phoenix", "UnitofMeasure": "N", "ReadingType": "long"}}]')
            elif newquery == 'select * where Metadata/SourceName = "Fake Data" and Path = "/tests/Data Range Test 2"':
                self.wfile.write('[{"Path": "/tests/Data Range Test 2", "Metadata": {"SourceName": "Fake Data", "Instrument": {"ModelName": "A Python Program"}}, "uuid": "fake-data2", "Properties": {"UnitofTime": "ns", "Timezone": "UTC", "UnitofMeasure": "N", "ReadingType": "long"}}]')
            else:
                self.wfile.write('')
        elif 'UUIDS' in self.query:
            lowbound += 1000
            highbound += 2000
            request = eval(self.query)
            response = ''
            if len(request['UUIDS']) == 2:
                if request['UUIDS'][0] == 'fake-data':
                    response = json.dumps({"Brackets": [[1000000000, lowbound * 1000000], [1000000000, highbound * 1000000]], "Merged": [1000000000, highbound * 1000000]})
                else:
                    response = json.dumps({"Brackets": [[1000000000, highbound * 1000000], [1000000000, lowbound * 1000000]], "Merged": [1000000000, highbound * 1000000]})
            elif request['UUIDS'][0] == 'fake-data':
                response = json.dumps({"Brackets": [[1000000000, lowbound * 1000000]], "Merged": [1000000000, lowbound * 1000000]})
            elif request['UUIDS'][0] == 'fake-data2':
                response = json.dumps({"Brackets": [[1000000000, highbound * 1000000]], "Merged": [1000000000, highbound * 1000000]})
            self.wfile.write(response)
            print 'Sent response'
        elif 'fake-data' in self.query:
            qIndex = self.query.find('?')
            args = self.query[qIndex+1:]
            kvpairs = map(lambda x: x.split('='), args.split('&'))
            kwargs = {pair[0]: pair[1] for pair in kvpairs}
            kwargs['hole'] = 'fake-data2' in self.query
            data = string.replace(str(get_smapx_data(**kwargs)).translate(None, 'L'), "'", '"')
            self.wfile.write(data)
            print 'Sent response'
        elif self.query:
            if local:
                prefix = '['
            else:
                f = urllib.urlopen(self.query)
                data = f.read();
                prefix = data[:-1] + ', '
            if ('/backend/api/tags' in self.query):
                data = prefix + '{"Path": "/tests/Data Range Test", "Metadata": {"SourceName": "Fake Data", "Instrument": {"ModelName": "A Python Program"}}, "uuid": "fake-data", "Properties": {"UnitofTime": "ns", "Timezone": "America/Phoenix", "UnitofMeasure": "N", "ReadingType": "long"}}, {"Path": "/tests/Data Range Test 2", "Metadata": {"SourceName": "Fake Data", "Instrument": {"ModelName": "A Python Program"}}, "uuid": "fake-data2", "Properties": {"UnitofTime": "ns", "Timezone": "UTC", "UnitofMeasure": "N", "ReadingType": "long"}}]'
            self.wfile.write(data)
            print 'Sent response'
            if not local:
                f.close()
        else:
            self.wfile.write('POST communication successful')
        
class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    pass
        
serv = ThreadedHTTPServer(('', 7856), HTTPRequestHandler)
serv.serve_forever()

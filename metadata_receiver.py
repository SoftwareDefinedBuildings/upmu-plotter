#this file was plagiarised by MPA from SK
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
from SocketServer import ThreadingMixIn
import json
import os
import pymongo
import requests
import string
import sys
import urllib

client = pymongo.MongoClient()
mongo_collection = client.metadata.metadata

class HTTPRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write('GET request received')
        
    def do_POST(self):
        metadatabody = self.rfile.read(int(self.headers['Content-Length']))
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET POST')
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        try:
            cnt = 0
            mdat = json.loads(metadatabody)
            for entry in mdat:
                try:
                    mongo_collection.update({"uuid":entry["uuid"]},{"$set":entry},True)
                    cnt += 1
                except Exception as ex:
                    print "bad entry:", ex
            print "Inserted %d documents" % cnt
        except Exception as e:
            print "bad posting:", e
                    
class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    pass
        
serv = ThreadedHTTPServer(('', 4524), HTTPRequestHandler)
serv.serve_forever()

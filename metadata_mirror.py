#!/usr/bin/env python

import requests
import sys
import json
import time

if sys.argv != 3:
    print "usage: %s <metadata from> <metadata to>"
    
ses = requests.Session()

while True:
    metadata_body = ses.get(sys.argv[1])
    ses.post(sys.argv[2], metadata_body)
    print "Posted %d bytes" % len(metadata_body)
    time.sleep(120)


#!/usr/bin/env python3

from bottle import route, run

@route('/fetch_blk')
def fetch_blk():
    return "Hello"

run(host="localhost", port=8080)

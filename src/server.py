#!/usr/bin/env python3

import bottle
import sqlite3

conn = sqlite3.connect("../data/blocks.db")

@bottle.route("/fetch_blk")
def fetch_blk():
    return "Hello"

@bottle.route("/list")
def list():
    c = conn.cursor()
    c.execute("""SELECT (dateModifiedMillis, enabled, escapedName, name)
                 FROM blocks""")
    print(c.fetchall())

@bottle.route("/<path:path>")
def static(path):
    return bottle.static_file(path, root="../static")

bottle.run(host="localhost", port=8080)

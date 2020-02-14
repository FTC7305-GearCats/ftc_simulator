#!/usr/bin/env python3

import bottle
import sqlite3
import json

sqlite3.register_converter("BOOLEAN", lambda v: bool(int(v)))
conn = sqlite3.connect("../data/blocks.db",
                       detect_types=sqlite3.PARSE_DECLTYPES)
conn.row_factory = sqlite3.Row

@bottle.route("/fetch_blk")
def fetch_blk():
    return "Hello"

@bottle.route("/list")
def list():
    c = conn.cursor()
    c.execute("""SELECT dateModifiedMillis, enabled, escapedName, name
                 FROM blocks""")
    data = c.fetchall()
    return json.dumps([dict(r) for r in data])

@bottle.route("/<path:path>")
def static(path):
    return bottle.static_file(path, root="../static")

bottle.run(host="localhost", port=8080)

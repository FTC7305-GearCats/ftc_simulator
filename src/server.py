#!/usr/bin/env python3

import bottle
import sqlite3
import json
import os
import html
import datetime

sqlite3.register_converter("BOOLEAN", lambda v: bool(int(v)))
sqlite3.register_converter("JSON", lambda v: json.loads(v))
conn = sqlite3.connect("../data/blocks.db",
                       detect_types=sqlite3.PARSE_DECLTYPES)
conn.row_factory = sqlite3.Row

@bottle.route("/list")
def list():
    c = conn.cursor()
    c.execute("""SELECT dateModifiedMillis, enabled, escapedName, name
                 FROM blocks""")
    data = c.fetchall()
    return json.dumps([dict(r) for r in data])

@bottle.route("/samples")
def samples():
    c = conn.cursor()
    c.execute("""SELECT escapedName, name, requestedCapabilities
                 FROM samples""")
    data = c.fetchall()
    return json.dumps([dict(r) for r in data])

@bottle.route("/get_blocks_java_class_name", method="POST")
def get_blocks_java_class_name():
    # XXX Need to figure out what this endpoint does.
    return "_" + bottle.request.forms.get("name")

@bottle.route("/fetch_blk", method="POST")
def fetch_blk():
    # XXX Look up the encoded filename?
    name = bottle.request.forms.get("name")
    return bottle.static_file(name + ".blk", root="../data/programs")

@bottle.route("/new", method="POST")
def new():
    name = bottle.request.forms.get("name")
    sample = bottle.request.forms.get("sample")
    if not sample:
        sample = "default"

    now_ms = int(round(datetime.datetime.utcnow().timestamp() * 1000))
    prog = {
        "dateModifiedMillis": now_ms,
        "enabled": True,
        "escapedName": html.escape(name),
        "name": name,
    }
    c = conn.cursor()
    c.execute("""INSERT INTO blocks
                 (dateModifiedMillis, enabled, escapedName, name) VALUES
                 (:dateModifiedMillis, :enabled, :escapedName, :name)""",
              prog)
    conn.commit()
    return bottle.static_file(sample + ".blk", root="../data/samples")

@bottle.route("/save", method="POST")
def save():
    name = bottle.request.forms.get("name")
    blk = bottle.request.forms.get("blk")

    now_ms = int(round(datetime.datetime.utcnow().timestamp() * 1000))
    c = conn.cursor()
    c.execute("""UPDATE blocks
                 SET dateModifiedMillis = ?
                 WHERE name = ?""",
              [now_ms, name])
    conn.commit()

    # XXX Fix path traversal.
    with open(os.path.join("../data/programs", name + ".blk"), "w") as f:
        f.write(blk)

@bottle.route("/<path:path>")
def static(path):
    return bottle.static_file(path, root="../static")

bottle.run(host="localhost", port=8080)

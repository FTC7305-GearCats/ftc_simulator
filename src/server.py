#!/usr/bin/env python3

import bottle
import sqlite3
import json
import os
import html
import datetime
import pathlib

sqlite3.register_converter("BOOLEAN", lambda v: bool(int(v)))
sqlite3.register_converter("JSON", lambda v: json.loads(v))
conn = sqlite3.connect("../data/blocks.db",
                       detect_types=sqlite3.PARSE_DECLTYPES)
conn.row_factory = sqlite3.Row

def safe_path(base, path):
    basepath = pathlib.Path(base)
    fn = basepath / path
    basepath = basepath.resolve()
    fn = fn.resolve()
    if fn.parent != basepath:
        raise Error("Invalid path!")
    return fn

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
    # For now, this is good enough, but it's not a real substitute
    # for the real code, which really tries to construct a valid Java
    # class name.
    return "_" + bottle.request.forms.get("name")

@bottle.route("/fetch_blk", method="POST")
def fetch_blk():
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
    prog = {
        "dateModifiedMillis": now_ms,
        "enabled": True,
        "escapedName": html.escape(name),
        "name": name,
    }
    c = conn.cursor()
    c.execute("""INSERT INTO blocks
                   (dateModifiedMillis, enabled, escapedName, name)
                 VALUES
                   (:dateModifiedMillis, :enabled, :escapedName, :name)
                 ON CONFLICT(name) DO UPDATE
                   SET dateModifiedMillis = :dateModifiedMillis""",
              prog)
    conn.commit()

    fn = safe_path("../data/programs", name + ".blk")
    with open(fn, "w") as f:
        f.write(blk)

@bottle.route("/delete", method="POST")
def delete():
    names = bottle.request.forms.get("name").split("*")
    c = conn.cursor()
    for name in names:
        c.execute("DELETE FROM blocks WHERE name = ?", [name])
        fn = safe_path("../data/programs", name + ".blk")
        fn.unlink()
        conn.commit()

@bottle.route("/rename", method="POST")
def rename():
    name = bottle.request.forms.get("name")
    new_name = bottle.request.forms.get("new_name")

    c = conn.cursor()
    c.execute("UPDATE blocks SET name = ?, escapedName = ? WHERE name = ?",
              [new_name, html.escape(new_name), name])
    old_fn = safe_path("../data/programs", name + ".blk")
    new_fn = safe_path("../data/programs", new_name + ".blk")
    old_fn.rename(new_fn)
    conn.commit()

@bottle.route("/")
def static_index():
    # XXX Hack, should just fix below to work correctly.
    return bottle.static_file("index.html", root="../static")

@bottle.route("/<path:path>")
def static(path):
    return bottle.static_file(path, root="../static")

bottle.run(host="localhost", port=8080)

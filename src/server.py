#!/usr/bin/env python3

import bottle
import sqlite3
import json
import os
import html
import datetime
import pathlib
import shutil
import configparser
import urllib

os.umask(0o022)

data_dir = pathlib.Path.home() / "work" / "ftc_simulator" / "data"
program_dir = data_dir / "programs"
samples_dir = data_dir / "samples"

sqlite3.register_converter("BOOLEAN", lambda v: bool(int(v)))
sqlite3.register_converter("JSON", lambda v: json.loads(v))
conn = sqlite3.connect(data_dir / "blocks.db",
                       detect_types=sqlite3.PARSE_DECLTYPES)
conn.row_factory = sqlite3.Row

application = bottle.Bottle()

def safe_path(base, path):
    basepath = pathlib.Path(base)
    fn = basepath / path
    basepath = basepath.resolve()
    fn = fn.resolve()
    if fn.parent != basepath:
        raise Error("Invalid path!")
    return fn

class Config:
    def __init__(self):
        config = configparser.ConfigParser()
        try:
            with open("/etc/hostapd/hostapd.conf") as f:
                data = f.read()
        except FileNotFoundError:
            data = ""
        config.read_string("[top]\n" + data)
        top = config["top"]
        self.ssid = top.get("ssid", "")
        self.passphrase = top.get("wpa_passphrase", "")

config = Config()

@application.route("/list")
def list():
    c = conn.cursor()
    c.execute("""SELECT dateModifiedMillis, enabled, escapedName, name
                 FROM blocks""")
    data = c.fetchall()
    return json.dumps([dict(r) for r in data])

@application.route("/samples")
def samples():
    c = conn.cursor()
    c.execute("""SELECT escapedName, name, requestedCapabilities
                 FROM samples""")
    data = c.fetchall()
    return json.dumps([dict(r) for r in data])

@application.route("/get_blocks_java_class_name", method="POST")
def get_blocks_java_class_name():
    # For now, this is good enough, but it's not a real substitute
    # for the real code, which really tries to construct a valid Java
    # class name.
    return "_" + bottle.request.forms.get("name")

@application.route("/fetch_blk", method="POST")
def fetch_blk():
    name = bottle.request.forms.get("name")
    return bottle.static_file(name + ".blk", root=program_dir)

@application.route("/new", method="POST")
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
    return bottle.static_file(sample + ".blk", root=samples_dir)

@application.route("/save", method="POST")
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

    fn = safe_path(program_dir, name + ".blk")
    with open(fn, "w") as f:
        f.write(blk)

@application.route("/delete", method="POST")
def delete():
    names = bottle.request.forms.get("name").split("*")
    c = conn.cursor()
    for name in names:
        c.execute("DELETE FROM blocks WHERE name = ?", [name])
        fn = safe_path(program_dir, name + ".blk")
        fn.unlink()
        conn.commit()

@application.route("/rename", method="POST")
def rename():
    name = bottle.request.forms.get("name")
    new_name = bottle.request.forms.get("new_name")

    c = conn.cursor()
    c.execute("UPDATE blocks SET name = ?, escapedName = ? WHERE name = ?",
              [new_name, html.escape(new_name), name])
    old_fn = safe_path(program_dir, name + ".blk")
    new_fn = safe_path(program_dir, new_name + ".blk")
    old_fn.rename(new_fn)
    conn.commit()

@application.route("/copy", method="POST")
def copy():
    name = bottle.request.forms.get("name")
    new_name = bottle.request.forms.get("new_name")

    now_ms = int(round(datetime.datetime.utcnow().timestamp() * 1000))
    prog = {
        "dateModifiedMillis": now_ms,
        "enabled": True,
        "escapedName": html.escape(new_name),
        "name": new_name,
    }
    c = conn.cursor()
    c.execute("""INSERT INTO blocks
                 (dateModifiedMillis, enabled, escapedName, name) VALUES
                 (:dateModifiedMillis, :enabled, :escapedName, :name)""",
              prog)
    conn.commit()

    old_fn = safe_path(program_dir, name + ".blk")
    new_fn = safe_path(program_dir, new_name + ".blk")
    shutil.copy(old_fn, new_fn)
    conn.commit()
    # XXX Not sure is this is the right return...
    return bottle.static_file(new_name + ".blk", root=program_dir)

@application.route("/js/rcInfo.json")
def rc_info():
    parsed_url = urllib.parse.urlparse(bottle.request.url)
    url = urllib.parse.urlunparse((parsed_url[0], parsed_url[1],
                                   "", "", "", ""))
    return {
        "appUpdateRequiresReboot": True,
        "deviceName": "7305-C-RC",
        "ftcUserAgentCategory":"OTHER",
        "isREVControlHub": False,
        "networkName": config.ssid,
        "passphrase": config.passphrase,
        "serverIsAlive": True,
        "serverUrl": url,
        "supports5GhzAp": False,
        "supportsOtaUpdate": False,
        "timeServerStarted": "Feb 12, 8:33 PM",
        "timeServerStartedMillis": 1581557600059,
    }

@application.route("/")
def static_index():
    # XXX Hack, should just fix below to work correctly.
    return bottle.static_file("index.html", root="../static")

@application.route("/<path:path>")
def static(path):
    return bottle.static_file(path, root="../static")

if __name__ == "__main__":
    application.run(host="localhost", port=8080)

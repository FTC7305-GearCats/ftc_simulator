#!/usr/bin/env python3

import httpx
import sqlite3
import os

conn = sqlite3.connect("../data/blocks.db")
c = conn.cursor()

r = httpx.get("http://192.168.49.1:8080/list")
programs = r.json()
for prog in programs:
    print(prog)
    c.execute("""INSERT INTO blocks
                 (dateModifiedMillis, enabled, escapedName, name) VALUES
                 (:dateModifiedMillis, :enabled, :escapedName, :name)""",
              prog)
    data = {"name": prog["name"]}
    r = httpx.post("http://192.168.49.1:8080/fetch_blk", data=data)
    with open(os.path.join("../data/programs", prog["escapedName"]), "w") as f:
        f.write(r.text)

conn.commit()
conn.close()
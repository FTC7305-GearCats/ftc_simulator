CREATE TABLE blocks(id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dateModifiedMillis INTEGER,
                    enabled BOOLEAN,
                    escapedName TEXT,
                    name TEXT UNIQUE);
CREATE TABLE samples(id INTEGER PRIMARY KEY AUTOINCREMENT,
                     escapedName TEXT,
                     name TEXT UNIQUE,
                     requestedCapabilities JSON);

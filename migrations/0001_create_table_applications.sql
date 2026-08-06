-- Migration number: 0001 	 2026-08-06T02:02:09.161Z
CREATE TABLE applications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL
);
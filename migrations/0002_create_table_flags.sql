-- Migration number: 0002 	 2026-08-06T02:07:05.627Z
CREATE TABLE flags (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    application_id TEXT NOT NULL,
    key TEXT NOT NULL,
    enabled TEXT NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);
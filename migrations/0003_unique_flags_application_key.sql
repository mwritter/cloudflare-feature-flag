-- Migration number: 0003 	 2026-08-11T20:52:55.365Z
CREATE UNIQUE INDEX flags_application_id_key_unique
ON flags (application_id, key);

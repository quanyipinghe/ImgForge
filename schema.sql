CREATE TABLE IF NOT EXISTS images (
  id          TEXT    PRIMARY KEY,
  filename    TEXT    NOT NULL,
  r2_key      TEXT    NOT NULL UNIQUE,
  mime_type   TEXT    NOT NULL,
  size_bytes  INTEGER NOT NULL,
  width       INTEGER,
  height      INTEGER,
  uploaded_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_uploaded_at ON images(uploaded_at DESC);

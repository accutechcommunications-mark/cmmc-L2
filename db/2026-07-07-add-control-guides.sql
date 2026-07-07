PRAGMA defer_foreign_keys = true;

CREATE TABLE IF NOT EXISTS control_guides (
  id TEXT PRIMARY KEY,
  control_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  how_to_markdown TEXT,
  pdf_artifact_id TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (control_id) REFERENCES controls(id) ON DELETE CASCADE,
  FOREIGN KEY (pdf_artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_control_guides_control_published
  ON control_guides(control_id, status)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_control_guides_control_id
  ON control_guides(control_id);

CREATE INDEX IF NOT EXISTS idx_control_guides_pdf_artifact_id
  ON control_guides(pdf_artifact_id);

ALTER TABLE artifacts ADD COLUMN artifact_role TEXT NOT NULL DEFAULT 'evidence'
  CHECK (artifact_role IN ('evidence', 'guide_pdf', 'template', 'reference'));

ALTER TABLE artifacts ADD COLUMN display_name TEXT;
ALTER TABLE artifacts ADD COLUMN description TEXT;

CREATE INDEX IF NOT EXISTS idx_artifacts_control_role
  ON artifacts(control_id, artifact_role);

CREATE VIEW IF NOT EXISTS v_control_guide_current AS
SELECT
  cg.id,
  cg.control_id,
  cg.title,
  cg.summary,
  cg.how_to_markdown,
  cg.version,
  cg.status,
  cg.pdf_artifact_id,
  a.display_name AS pdf_display_name,
  a.file_name AS pdf_file_name,
  a.mime_type AS pdf_mime_type,
  a.storage_key AS pdf_storage_key,
  cg.updated_at
FROM control_guides cg
LEFT JOIN artifacts a ON a.id = cg.pdf_artifact_id
WHERE cg.status = 'published';

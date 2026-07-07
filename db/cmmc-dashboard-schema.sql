PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  identity_provider TEXT NOT NULL CHECK (identity_provider IN ('azure_ad', 'google', 'other')),
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE CHECK (name IN ('super_admin', 'admin', 'editor', 'auditor', 'viewer')),
  description TEXT
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  assigned_by_user_id INTEGER,
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS control_families (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Not Started' CHECK (
    status IN (
      'Not Started',
      'In Progress',
      'Partially Met',
      'Implemented',
      'Needs Evidence',
      'Ready for Review',
      'Blocked',
      'At Risk'
    )
  ),
  completion_percent REAL NOT NULL DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100),
  owner_user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS controls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  control_id TEXT NOT NULL UNIQUE,
  family_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  official_text TEXT,
  status TEXT NOT NULL DEFAULT 'Not Started' CHECK (
    status IN (
      'Not Started',
      'In Progress',
      'Partially Met',
      'Implemented',
      'Needs Evidence',
      'Ready for Review',
      'Blocked',
      'At Risk'
    )
  ),
  implementation_notes TEXT,
  assessor_notes TEXT,
  owner_user_id INTEGER,
  due_date TEXT,
  last_reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES control_families(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS control_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  control_id INTEGER NOT NULL,
  author_user_id INTEGER,
  note_type TEXT NOT NULL DEFAULT 'internal' CHECK (note_type IN ('implementation', 'assessor', 'internal', 'remediation', 'commentary')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (control_id) REFERENCES controls(id) ON DELETE CASCADE,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS review_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  control_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL CHECK (
    new_status IN (
      'Not Started',
      'In Progress',
      'Partially Met',
      'Implemented',
      'Needs Evidence',
      'Ready for Review',
      'Blocked',
      'At Risk'
    )
  ),
  reviewer_user_id INTEGER,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (control_id) REFERENCES controls(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  control_id INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  latest_version_id INTEGER,
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0,1)),
  is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0,1)),
  created_by_user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (control_id) REFERENCES controls(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS artifact_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artifact_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  file_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  uploaded_by_user_id INTEGER,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  contains_sensitive_flag INTEGER NOT NULL DEFAULT 0 CHECK (contains_sensitive_flag IN (0,1)),
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0,1)),
  archived_at TEXT,
  archive_reason TEXT,
  FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (artifact_id, version_number)
);

CREATE TABLE IF NOT EXISTS dashboard_exports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  export_type TEXT NOT NULL CHECK (export_type IN ('csv', 'pdf')),
  requested_by_user_id INTEGER,
  filter_json TEXT,
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details_json TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_controls_family_id ON controls(family_id);
CREATE INDEX IF NOT EXISTS idx_controls_status ON controls(status);
CREATE INDEX IF NOT EXISTS idx_control_notes_control_id ON control_notes(control_id);
CREATE INDEX IF NOT EXISTS idx_review_events_control_id ON review_events(control_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_control_id ON artifacts(control_id);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_artifact_id ON artifact_versions(artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_uploaded_at ON artifact_versions(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

INSERT OR IGNORE INTO roles (name, description) VALUES
  ('super_admin', 'Full access including archive/delete, user administration, and role management'),
  ('admin', 'Administrative access except archive/delete and role management'),
  ('editor', 'Can update controls, notes, statuses, and upload/download artifacts'),
  ('auditor', 'Read-only access to dashboard, controls, notes, and artifact metadata without downloads'),
  ('viewer', 'Read-only access to dashboard and control views without artifact access');

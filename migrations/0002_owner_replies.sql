ALTER TABLE reviews ADD COLUMN owner_reply TEXT CHECK (owner_reply IS NULL OR length(owner_reply) BETWEEN 1 AND 1000);
ALTER TABLE reviews ADD COLUMN owner_reply_actor TEXT;
ALTER TABLE reviews ADD COLUMN owner_reply_updated_at INTEGER;

CREATE TABLE owner_reply_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id TEXT NOT NULL REFERENCES reviews(id),
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('publish','edit','remove')),
  old_reply TEXT,
  new_reply TEXT,
  review_version INTEGER NOT NULL,
  changed_at INTEGER NOT NULL
);
CREATE INDEX owner_reply_audit_review ON owner_reply_audit(review_id, id DESC);

CREATE TRIGGER reviews_owner_reply_audit AFTER UPDATE OF owner_reply ON reviews
WHEN OLD.owner_reply IS NOT NEW.owner_reply
BEGIN
  INSERT INTO owner_reply_audit(review_id, actor_email, action, old_reply, new_reply, review_version, changed_at)
  VALUES (NEW.id, NEW.owner_reply_actor,
    CASE WHEN OLD.owner_reply IS NULL THEN 'publish' WHEN NEW.owner_reply IS NULL THEN 'remove' ELSE 'edit' END,
    OLD.owner_reply, NEW.owner_reply, NEW.version, COALESCE(NEW.owner_reply_updated_at, unixepoch()));
END;

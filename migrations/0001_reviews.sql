CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  submission_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 80),
  stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
  comment TEXT NOT NULL CHECK(length(comment) BETWEEN 10 AND 2000),
  created_at INTEGER NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'visible' CHECK(visibility IN ('visible','hidden','removed')),
  version INTEGER NOT NULL DEFAULT 1,
  moderation_actor TEXT,
  moderation_reason TEXT
);
CREATE INDEX reviews_public_page ON reviews(visibility, created_at DESC, id DESC);
CREATE INDEX reviews_admin_page ON reviews(created_at DESC, id DESC);
CREATE TABLE review_summary (
  singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
  total INTEGER NOT NULL DEFAULT 0 CHECK(total >= 0),
  rating_sum INTEGER NOT NULL DEFAULT 0 CHECK(rating_sum >= 0)
);
INSERT INTO review_summary(singleton) VALUES (1);
CREATE TRIGGER reviews_insert_summary AFTER INSERT ON reviews WHEN NEW.visibility = 'visible'
BEGIN UPDATE review_summary SET total = total + 1, rating_sum = rating_sum + NEW.stars WHERE singleton = 1; END;
CREATE TRIGGER reviews_delete_summary AFTER DELETE ON reviews WHEN OLD.visibility = 'visible'
BEGIN UPDATE review_summary SET total = total - 1, rating_sum = rating_sum - OLD.stars WHERE singleton = 1; END;
CREATE TRIGGER reviews_update_summary AFTER UPDATE OF visibility, stars ON reviews
BEGIN
  UPDATE review_summary SET
    total = total + (NEW.visibility = 'visible') - (OLD.visibility = 'visible'),
    rating_sum = rating_sum + CASE WHEN NEW.visibility = 'visible' THEN NEW.stars ELSE 0 END - CASE WHEN OLD.visibility = 'visible' THEN OLD.stars ELSE 0 END
    WHERE singleton = 1;
END;
CREATE TABLE moderation_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id TEXT NOT NULL REFERENCES reviews(id),
  actor_email TEXT NOT NULL,
  reason TEXT NOT NULL,
  old_visibility TEXT NOT NULL,
  new_visibility TEXT NOT NULL,
  review_version INTEGER NOT NULL,
  changed_at INTEGER NOT NULL
);
CREATE INDEX moderation_audit_review ON moderation_audit(review_id, id DESC);
CREATE TRIGGER reviews_moderation_audit AFTER UPDATE OF visibility ON reviews WHEN OLD.visibility != NEW.visibility
BEGIN
  INSERT INTO moderation_audit(review_id, actor_email, reason, old_visibility, new_visibility, review_version, changed_at)
  VALUES (NEW.id, NEW.moderation_actor, NEW.moderation_reason, OLD.visibility, NEW.visibility, NEW.version, unixepoch());
END;
CREATE TABLE review_rate_limits (
  bucket TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX review_rate_expiry ON review_rate_limits(expires_at);

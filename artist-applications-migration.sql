CREATE TABLE IF NOT EXISTS artist_applications (
  user_id INT NOT NULL PRIMARY KEY,
  portfolio_url VARCHAR(500) NULL,
  artist_bio TEXT NOT NULL,
  statement TEXT NOT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_artist_applications_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);
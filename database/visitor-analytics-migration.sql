CREATE TABLE IF NOT EXISTS visitor_daily (
  visit_date DATE NOT NULL,
  country_code CHAR(2) NOT NULL,
  visits BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (visit_date, country_code),
  KEY idx_visitor_daily_date (visit_date)
);

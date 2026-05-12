CREATE TABLE IF NOT EXISTS query_counts_daily (
  query TEXT NOT NULL,
  date DATE NOT NULL,
  count BIGINT NOT NULL DEFAULT 1,
  PRIMARY KEY (query, date)
);

CREATE INDEX IF NOT EXISTS idx_query_counts_date
ON query_counts_daily(date);

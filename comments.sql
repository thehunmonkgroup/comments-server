-- -------------------------------
-- Table to store comments.
-- -------------------------------

CREATE TABLE IF NOT EXISTS comments (
  id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  api_key VARCHAR(255) NOT NULL DEFAULT '',
  created_at datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  item_id VARCHAR(255) NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  parent_id VARCHAR(72) NOT NULL DEFAULT '',
  page_url VARCHAR(255) NOT NULL DEFAULT '',
  username VARCHAR(255) NOT NULL DEFAULT '',
  user_email VARCHAR(255) NOT NULL DEFAULT '',
  comment_id VARCHAR(72) NOT NULL DEFAULT '',
  comment_url VARCHAR(255) NOT NULL DEFAULT '',
  hidden TINYINT UNSIGNED NOT NULL DEFAULT '0',
  PRIMARY KEY (id),
  KEY api_key (api_key),
  KEY created_at (created_at),
  KEY item_id (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

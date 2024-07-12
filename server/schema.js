const pages = require("./pages");
const pool = require("./pool");

module.exports = {
  async init() {
    const client = await pool.pool.connect();
    try {
      /*await client.query(`
-- DROP TABLE IF EXISTS sessions;
-- DROP TABLE IF EXISTS browsers;
-- DROP TABLE IF EXISTS users;
-- DROP TABLE IF EXISTS user_sessions;
-- DROP TABLE IF EXISTS reset_tokens;
-- DROP TABLE IF EXISTS articles;
-- DROP TABLE IF EXISTS comments;
-- DROP TABLE IF EXISTS votes;

CREATE TABLE IF NOT EXISTS sessions (
session_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
session_uuid CHAR(36) NOT NULL,
spam BOOL DEFAULT false,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS browsers (
browser_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
session_id INT NOT NULL,
user_agent VARCHAR(255) NOT NULL,
ip_address VARCHAR(39) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
user_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
display_name VARCHAR(50),
display_name_index INT DEFAULT 0,
votes_raw INT DEFAULT 0,
votes_weighted FLOAT DEFAULT 0.0,
email VARCHAR(255),
password_hash BYTEA,
email_notifications BOOL DEFAULT false,
admin BOOL DEFAULT false,
spam BOOL DEFAULT false,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
user_id INT NOT NULL,
session_id INT NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW(),
PRIMARY KEY (user_id, session_id)
);

CREATE TABLE IF NOT EXISTS reset_tokens (
token_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
user_id INT NOT NULL,
token_uuid CHAR(36) NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS articles (
article_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
parent_article_id INT,
title VARCHAR(140),
body VARCHAR(4000),
note VARCHAR(500),
slug VARCHAR(140),
user_id INT NOT NULL,
votes_raw INT DEFAULT 0,
votes_weighted FLOAT DEFAULT 0.0,
admin BOOL DEFAULT false,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_articles_create_date ON articles(create_date);
CREATE INDEX idx_articles_user_id_create_date ON articles(user_id, create_date);


CREATE TABLE IF NOT EXISTS comments (
comment_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
parent_article_id INT,
parent_article_paragraph_index INT,
parent_comment_id INT,
body VARCHAR(1000),
note VARCHAR(500),
user_id INT NOT NULL,
votes_raw INT DEFAULT 0,
votes_weighted FLOAT DEFAULT 0.0,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_comments_create_date ON comments(create_date);
CREATE INDEX idx_comments_user_id_create_date ON comments(user_id, create_date);
CREATE INDEX idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_parent_article_id ON comments(parent_article_id);

CREATE TABLE IF NOT EXISTS comment_ancestors (
comment_id INT NOT NULL,
ancestor_id INT NOT NULL
);
CREATE INDEX idx_comment_ancestor ON comment_ancestors (comment_id, ancestor_id);
-- CREATE INDEX idx_ancestor_comment ON comment_ancestors (ancestor_id, comment_id);
ALTER TABLE comment_ancestors
ADD CONSTRAINT unique_comment_ancestor UNIQUE (comment_id, ancestor_id);

CREATE TABLE IF NOT EXISTS article_images (
article_image_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
article_id INT NOT NULL,
image_uuid CHAR(36) NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_article_images_article_id ON article_images(article_id) STORING (image_uuid);

CREATE TABLE IF NOT EXISTS comment_images (
comment_image_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
comment_id INT NOT NULL,
image_uuid CHAR(36) NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_comment_images_comment_id ON comment_images(comment_id) STORING (image_uuid);

CREATE TABLE IF NOT EXISTS subscriptions (
subscription_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
user_id INT NOT NULL,
subscription_json VARCHAR(1024) NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id) STORING (subscription_json);

CREATE TABLE IF NOT EXISTS votes (
vote_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
article_id INT,
comment_id INT,
user_id INT NOT NULL,
create_date TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_votes_create_date ON votes(create_date);
CREATE INDEX idx_votes_user_id_create_date ON votes(user_id, create_date);

      `);*/
      const found_root_user = await client.query(
        `
        SELECT user_id,email FROM users
        WHERE
          admin = true
        ORDER BY create_date ASC
        `,
      );
      if (found_root_user.rows.length) {
        const root_user_id = found_root_user.rows[0].user_id;
        const page_paths = Object.keys(pages);
        for (const page_path of page_paths) {
          const page = pages[page_path];
          const found_page = await client.query(
            `
            SELECT article_id, body
            FROM articles
            WHERE title = $1 AND user_id = $2 AND admin = true;
            `,
            [page.title, root_user_id],
          );
          if (found_page.rows.length) {
            page.article_id = found_page.rows[0].article_id;
            if (page.body !== found_page.rows[0].body) {
              await client.query(
                `
                UPDATE articles
                SET body = $1
                WHERE article_id = $2;
                `,
                [page.body, found_page.rows[0].article_id],
              );
            }
          } else {
            const new_page = await client.query(
              `
              INSERT INTO articles
                (title, slug, body, user_id, parent_article_id, admin)
              VALUES
                ($1, $2, $3, $4, 0, true)
              RETURNING article_id;
              `,
              [page.title, page.title, page.body, root_user_id],
            );
            page.article_id = new_page.rows[0].article_id;
          }
        }
      }
    } catch (err) {
      console.error("error executing query:", err);
    } finally {
      client.release();
    }
  },
};

const http = require("node:http");
const fs = require("node:fs");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const email = require("./email");
const pages = require("./pages");
const ai = require("./ai");
const pool = require("./pool");


module.exports = {
  async validateSessionUuid(req, res) {
    if (req.body.session_uuid) {
      const session_results = await req.client.query(
        `
        SELECT
          sessions.session_uuid,
          sessions.session_id,
          users.email,
          users.display_name,
          users.admin,
          users.user_id
        FROM sessions
        LEFT JOIN user_sessions ON sessions.session_id = user_sessions.session_id
        LEFT JOIN users ON user_sessions.user_id = users.user_id
        WHERE sessions.session_uuid = $1
        `,
        [req.body.session_uuid],
      );
      if (session_results.rows.length > 0) {
        req.session.session_uuid = session_results.rows[0].session_uuid;
        req.session.session_id = session_results.rows[0].session_id;
        req.session.email = session_results.rows[0].email;
        req.session.display_name = session_results.rows[0].display_name;
        req.session.display_name_index =
          session_results.rows[0].display_name_index;
        req.session.admin = session_results.rows[0].admin || false;
        req.session.user_id = session_results.rows[0].user_id || "";
      }
    }
  },
  async createUserIfNotExists(req, res) {
    if (
      !req.writableEnded &&
      req.session.session_id &&
      !req.session.user_id &&
      (req.body.display_name || req.body.title)
    ) {
      const user_inserted = await req.client.query(
        `
        INSERT INTO users
          (email, display_name)
        VALUES
          ($1, $2)
        RETURNING user_id;
        `,
        ["", ""],
      );
      await req.client.query(
        `
        INSERT INTO user_sessions
          (user_id, session_id)
        VALUES
          ($1, $2)
        `,
        [user_inserted.rows[0].user_id, req.session.session_id],
      );
      req.session.user_id = user_inserted.rows[0].user_id;
    }
  },
  async signUpOrSignIn(req, res) {
    if (
      !req.writableEnded &&
      req.session.session_id &&
      req.body.email &&
      req.body.password
    ) {
      const user_found = await req.client.query(
        `
        SELECT password_hash, user_id
        FROM users
        WHERE lower(email) = lower($1)
        `,
        [req.body.email],
      );
      if (user_found.rows.length > 0) {
        const password_hash = user_found.rows[0].password_hash;
        const password_match = await bcrypt.compare(
          req.body.password,
          password_hash.toString(),
        );
        if (password_match) {
          await req.client.query(
            `
            INSERT INTO user_sessions
              (user_id, session_id)
            VALUES
              ($1, $2)
            `,
            [user_found.rows[0].user_id, req.session.session_id],
          );
          res.end(
            JSON.stringify({
              success: true,
            }),
          );
        } else {
          res.end(
            JSON.stringify({
              error: "Incorrect password",
            }),
          );
        }
      } else {
        const make_admin = process.env["ROOT_EMAIL"] === req.body.email;
        const password_hash = await bcrypt.hash(req.body.password, 12);
        const user_inserted = await req.client.query(
          `
          INSERT INTO users
            (email, password_hash, display_name, admin)
          VALUES
            (lower($1), $2, $3, $4)
          RETURNING user_id
          `,
          [req.body.email, password_hash, "", make_admin],
        );
        await req.client.query(
          `
          INSERT INTO user_sessions
            (user_id, session_id)
          VALUES
            ($1, $2)
          `,
          [user_inserted.rows[0].user_id, req.session.session_id],
        );
        res.end(
          JSON.stringify({
            success: true,
          }),
        );
      }
    }
  },
  async generateResetToken(req, res) {
    if (!req.writableEnded && req.session.session_id && req.body.email && !req.body.password) {
      const user_found = await req.client.query(
        `
        SELECT user_id
        FROM users
        WHERE lower(email) = lower($1)
        `,
        [req.body.email],
      );
      if (user_found.rows.length > 0) {
        const token_uuid = crypto.randomUUID();
        await req.client.query(
          `
          INSERT INTO reset_tokens
            (user_id, token_uuid)
          VALUES
            ($1, $2)
          `,
          [user_found.rows[0].user_id, token_uuid],
        );
        const token_url = `https://firstchristianatheist.org/reset/${token_uuid}`;
        email.send(
          req.body.email,
          "Reset your password on FirstChristianAtheist.org",
          `A password reset request was made for your email on FirstChristianAtheist.org.

To reset your password, please open the link below:
${token_url}

This link will expire after 30 minutes.

If you did not request this, please ignore this email.`,
          `
<p>A password reset request was made for your email on FirstChristianAtheist.org.</p>
<p>To reset your password, please click the link below:</p>
<p><a href="${token_url}">${token_url}</a></p>
<p>This link will expire after 30 minutes.</p>
<p>If you did not request this, please ignore this email.</p>
                `,
        );
      }
      res.end(
        JSON.stringify({
          success: true,
        }),
      );
    }
  },
  async useResetToken(req, res) {
    if (
      !req.writeableEnded &&
      req.session.session_id &&
      req.body.password &&
      req.body.reset_token_uuid
    ) {
      const token_found = await req.client.query(
        `
        SELECT reset_tokens.user_id
        FROM reset_tokens
        WHERE
          reset_tokens.token_uuid = $1
          AND reset_tokens.create_date > NOW() - INTERVAL '60 minutes'
        `,
        [req.body.reset_token_uuid],
      );
      if (token_found.rows.length > 0) {
        const user_id_found = token_found.rows[0].user_id;
        const password_hash = await bcrypt.hash(req.body.password, 12);
        await client.query(
          `
          UPDATE users
            SET password_hash = $1
          WHERE user_id = $2
          `,
          [password_hash, user_id_found],
        );
        res.end(
          JSON.stringify({
            success: true,
          }),
        );
      } else {
        res.end(
          JSON.stringify({
            session_uuid: req.session.session_uuid,
            error: "Reset link expired",
          }),
        );
      }
    }
  },
  async saveArticle(req, res) {
    if (
      !req.writableEnded &&
      req.session.user_id &&
      req.body.title &&
      req.body.body &&
      req.body.path
    ) {
      // Get page context if modifying an article from its slug page
      //   where path is no longer the page slug
      if (req.body.article_id) {
        const page_result = await req.client.query(
          `
          SELECT slug
          FROM articles
          WHERE article_id = (
            SELECT parent_article_id
            FROM articles
            WHERE article_id = $1
          )
          `,
          [req.body.article_id],
        );
        req.body.path = "/" + page_result.rows[0].slug.toLowerCase();
      }

      // Always moderate based on page context
      const page = pages[req.body.path];
      const ai_response_text = await ai.ask(`"""CONTEXT
${page.title}
${page.body}
"""
"""USER
${req.body.title}
${req.body.body}
"""`);
      if (ai_response_text === "OK") {
        const slug = req.body.title
          .replace(/[^a-z0-9 ]/gi, "")
          .replace(/ {1,}/g, "_");
        // Update existing
        if (req.body.article_id) {
          await req.client.query(
            `
            UPDATE articles
            SET title = $1, slug = $2, body = $3
            WHERE
              article_id = $4
              AND user_id = $5
            `,
            [
              req.body.title,
              slug,
              req.body.body,
              req.body.article_id,
              req.session.user_id,
            ],
          );

          // Add new
        } else {
          await req.client.query(
            `
            INSERT INTO articles
              (title, slug, body, parent_article_id, user_id)
            VALUES
              ($1, $2, $3, $4, $5)
            `,
            [
              req.body.title,
              slug,
              req.body.body,
              page.article_id,
              req.session.user_id,
            ],
          );
        }

        // Respond with success so the client reloads
        res.end(
          JSON.stringify({
            success: true,
          }),
        );
      } else {
        res.end(
          JSON.stringify({
            error: ai_response_text,
          }),
        );
      }
    }
  },
  async saveComment(req, res) {
    if (
      !req.writeableEnded &&
      req.session.user_id &&
      req.body.display_name &&
      req.body.body &&
      req.body.path
    ) {
      const page = pages[req.body.path] || pages["/"];
      let article_id = page.article_id;
      if (req.body.path.substr(0, 8) === "/article") {
        const slug = req.body.path.substr(9);
        const article_results = await req.client.query(
          `
          SELECT article_id
          FROM articles
          WHERE slug = $1
          `,
          [slug],
        );
        if (article_results.rows.length) {
          article_id = article_results.rows[0].article_id;
        } else {
          res.end(
            JSON.stringify({
              error: "Path not found",
            }),
          );
          return;
        }
      }
      let context = page.title;
      context += "\n" + page.body;
      const article_results = await req.client.query(
        `
        SELECT title, body
        FROM articles
        WHERE parent_article_id = $1
        ORDER BY create_date ASC
        `,
        [article_id],
      );
      for (const article of article_results.rows) {
        context += "\n" + article.title;
        context += "\n" + article.body;
      }
      const ancestor_ids = [];
      if (req.body.parent_comment_id) {
        context += "\n\n" + "Comment thread:";
        const comment_ancestors = await req.client.query(
          `
          SELECT
            users.display_name,
            comments.body,
            comments.note,
            comments.comment_id
          FROM comments
          INNER JOIN users ON comments.user_id = users.user_id
          WHERE comments.comment_id = $1
          OR comments.comment_id IN (
            SELECT ancestor_id
            FROM comment_ancestors
            WHERE comment_id = $1
          )
          ORDER BY comments.create_date ASC
          `,
          [req.body.parent_comment_id],
        );
        for (const comment_ancestor of comment_ancestors.rows) {
          context += "\n\n" + comment_ancestor.display_name + ":";
          context += "\n" + comment_ancestor.body;
          if (comment_ancestor.note) {
            context += "\n\nChatGPT:";
            context += "\n" + comment_ancestor.note;
          }
        }
        ancestor_ids.push(...comment_ancestors.rows.map((c) => c.comment_id));
      }
      const ai_response_text = await ai.ask(`"""CONTEXT
${context}
"""
"""USER
${req.body.display_name}:
${req.body.body}
"""`);
      if (ai_response_text === "SPAM") {
        res.end(
          JSON.stringify({
            error: ai_response_text,
          }),
        );
        return;
      }
      let comment_id = req.body.comment_id;
      if (ai_response_text === "OK") {
        if (req.body.comment_id) {
          await req.client.query(
            `
            UPDATE comments
            SET body = $1, note = NULL
            WHERE
              comment_id = $2
              AND user_id = $3
            `,
            [req.body.body, req.body.comment_id, req.session.user_id],
          );
        } else {
          const comment_inserted = await req.client.query(
            `
            INSERT INTO comments
              (body, parent_article_id, user_id, parent_comment_id)
            VALUES
              ($1, $2, $3, $4)
            RETURNING comment_id
            `,
            [
              req.body.body,
              article_id,
              req.session.user_id,
              req.body.parent_comment_id,
            ],
          );
          comment_id = comment_inserted.rows[0].comment_id;
        }
      } else {
        if (req.body.comment_id) {
          await req.client.query(
            `
            UPDATE comments
            SET body = $1, note = $2
            WHERE
              comment_id = $3
              AND user_id = $4
            `,
            [
              req.body.body,
              ai_response_text,
              req.body.comment_id,
              req.session.user_id,
            ],
          );
        } else {
          const comment_inserted = await req.client.query(
            `
            INSERT INTO comments
              (body, note, parent_article_id, user_id, parent_comment_id)
            VALUES
              ($1, $2, $3, $4, $5)
            RETURNING comment_id
            `,
            [
              req.body.body,
              ai_response_text,
              article_id,
              req.session.user_id,
              req.body.parent_comment_id,
            ],
          );
          comment_id = comment_inserted.rows[0].comment_id;
        }
      }
      const update_result = await req.client.query(
        `
        UPDATE users
        SET
          display_name = $1,
          display_name_index = -1
        WHERE
          user_id = $2
          AND display_name <> $1
        RETURNING user_id
        `,
        [req.body.display_name, req.session.user_id],
      );
      if (update_result.rows.length) {
        await req.client.query(
          `
          UPDATE users
          SET display_name_index = (
            SELECT max(display_name_index)
            FROM users
            WHERE lower(display_name) = lower($1)
          ) + 1
          WHERE user_id = $2
          `,
          [req.body.display_name, req.session.user_id],
        );
      }
      // Insert all of the ancestors
      if (ancestor_ids.length > 0 && !req.body.comment_id) {
        // Create a values string for the bulk insert
        const values = ancestor_ids
          .map((ancestor_id, index) => `($1, $${index + 2})`)
          .join(", ");

        // Execute the bulk insert query
        await req.client.query(
          `
          INSERT INTO comment_ancestors (comment_id, ancestor_id)
          VALUES ${values}
          `,
          [comment_id, ...ancestor_ids],
        );
      }

      // Respond with success so the client reloads
      res.end(
        JSON.stringify({
          success: true,
        }),
      );
    }
  },
  async saveDisplayName(req, res) {
    if (!req.writeableEnded && req.session.user_id && req.body.display_name) {
      const ai_response_text = await ai.ask(
        req.body.display_name,
        "display_name",
      );
      if (ai_response_text === "OK") {
        const update_result = await req.client.query(
          `
          UPDATE users
          SET
            display_name = $1,
            display_name_index = -1
          WHERE
            user_id = $2
            AND display_name <> $1
          RETURNING user_id
          `,
          [req.body.display_name, req.session.user_id],
        );
        if (update_result.rows.length) {
          await req.client.query(
            `
            UPDATE users
            SET display_name_index = (
              SELECT max(display_name_index)
              FROM users
              WHERE lower(display_name) = lower($1)
            ) + 1
            WHERE user_id = $2
              `,
            [req.body.display_name, req.session.user_id],
          );
        }
        res.end(
          JSON.stringify({
            success: true,
          }),
        );
      } else {
        res.end(
          JSON.stringify({
            error: ai_response_text,
          }),
        );
      }
    }
  },
  async createSessionIfNotExists(req, res) {
    if (!req.writableEnded && !req.session.session_uuid) {
      req.session.session_uuid = crypto.randomUUID();
      const insert_session = await req.client.query(
        `
        INSERT INTO sessions (session_uuid)
        VALUES ($1) returning session_id;
        `,
        [req.session.session_uuid],
      );
      req.session.session_id = insert_session.rows[0].session_id;
      const user_agent = req.headers["user-agent"];
      const ip_address = req.headers["x-forwarded-for"].split(",")[0];
      await req.client.query(
        `
        INSERT INTO browsers
          (session_id, user_agent, ip_address)
        VALUES
          ($1, $2, $3);
        `,
        [req.session.session_id, user_agent, ip_address],
      );
    }
  },
  async getSingleArticle(req, res) {
    if (
      !req.writableEnded &&
      req.body.path &&
      req.body.path.substr(0, 8) === "/article"
    ) {
      const slug = req.body.path.substr(9);
      const article_results = await req.client.query(
        `
        SELECT article_id, title, slug, body,
          CASE WHEN user_id = $1 THEN true ELSE false END AS edit
        FROM articles
        WHERE slug = $2
        `,
        [req.session.user_id || 0, slug],
      );
      if (article_results.rows.length) {
        req.results.path = `/article/${slug}`;
        req.results.articles.push(...article_results.rows);
        const comment_results = await req.client.query(
          `
          SELECT
            comments.comment_id,
            comments.body,
            comments.note,
            comments.parent_comment_id,
            users.display_name,
            users.display_name_index,
            CASE WHEN comments.user_id = $1 THEN true ELSE false END AS edit
          FROM comments
          INNER JOIN users ON comments.user_id = users.user_id
          WHERE comments.parent_article_id = $2
          ORDER BY comments.create_date ASC
          `,
          [req.session.user_id || 0, article_results.rows[0].article_id],
        );
        req.results.comments.push(...comment_results.rows);
      }
    }
  },
  async getRecentActivity(req, res) {
    if (!req.writableEnded && req.body.path === "/recent") {
      req.results.path = req.body.path;
      const activity_results = await req.client.query(
        `
        WITH combined AS (
          SELECT 
            a.article_id AS id,
            a.create_date,
            a.title,
            LEFT(a.body, 1000) as body,
            a.note,
            a.slug,
            a.user_id,
            NULL AS parent_comment_id,
            NULL AS parent_article_id,
            'article' AS type
          FROM articles a
          UNION ALL
          SELECT 
            c.comment_id AS id,
            c.create_date,
            NULL AS title,
            c.body,
            c.note,
            NULL as slug,
            c.user_id,
            c.parent_comment_id,
            c.parent_article_id,
            'comment' AS type
          FROM comments c
        )
        SELECT 
          combined.id,
          combined.create_date,
          combined.title,
          combined.body,
          combined.note,
          combined.slug,
          combined.type,
          u.display_name,
          u.display_name_index,
          pa.title AS parent_article_title,
          pa.slug AS parent_article_slug,
          pc.body AS parent_comment_body,
          pc.note AS parent_comment_note,
          pcu.display_name AS parent_comment_display_name,
          pcu.display_name_index AS parent_comment_display_name_index
        FROM combined
        LEFT JOIN users u ON combined.user_id = u.user_id
        LEFT JOIN articles pa ON combined.parent_article_id = pa.article_id
        LEFT JOIN users pu ON pa.user_id = pu.user_id
        LEFT JOIN comments pc ON combined.parent_comment_id = pc.comment_id
        LEFT JOIN users pcu ON pc.user_id = pcu.user_id
        WHERE (combined.create_date < $1 OR $1 IS NULL)
        ORDER BY combined.create_date DESC
        LIMIT $2;
        `,
        [null, 50],
      );
      req.results.activities.push(...activity_results.rows);
    }
  },
  async getPageArticles(req, res) {
    if (!req.writableEnded && pages[req.results.path]) {
      const page = pages[req.results.path];
      const article_results = await req.client.query(
        `
        SELECT article_id, title, slug, LEFT(body, 1000) as body,
          CASE WHEN user_id = $1 THEN true ELSE false END AS edit
        FROM articles
        WHERE parent_article_id = $2
        ORDER BY create_date ASC
        `,
        [req.session.user_id || 0, page.article_id],
      );
      req.results.articles.push(...article_results.rows);
      const comment_results = await req.client.query(
        `
        SELECT
          comments.comment_id,
          comments.body,
          comments.note,
          comments.parent_comment_id,
          users.display_name,
          users.display_name_index,
          CASE WHEN comments.user_id = $1 THEN true ELSE false END AS edit
        FROM comments
        INNER JOIN users ON comments.user_id = users.user_id
        WHERE comments.parent_article_id = $2
        ORDER BY comments.create_date ASC
        `,
        [req.session.user_id || 0, page.article_id],
      );
      req.results.comments.push(...comment_results.rows);
    }
  },
  async promptToUsePasswordReset(req, res) {
    if (!req.writableEnded && req.body.reset_token_uuid) {
      const user_found = await req.client.query(
        `
        SELECT reset_tokens.user_id, users.email, user_sessions.session_id
        FROM reset_tokens
        INNER JOIN users ON reset_tokens.user_id = users.user_id
        LEFT JOIN sessions ON sessions.session_uuid = $1
        LEFT JOIN user_sessions ON user_sessions.user_id = users.user_id AND user_sessions.session_id = sessions.session_id
        WHERE
          reset_tokens.token_uuid = $2
          AND reset_tokens.create_date > NOW() - INTERVAL '60 minutes'
        `,
        [req.session.session_uuid, req.body.reset_token_uuid],
      );

      if (user_found.rows.length > 0) {
        if (!user_found.rows[0].session_id) {
          await req.client.query(
            `
            INSERT INTO user_sessions
              (user_id, session_id)
            VALUES
              ($1, $2)
            `,
            [user_found.rows[0].user_id, req.session.session_id],
          );
        }
        req.results.email = user_found.rows[0].email;
        res.end(JSON.stringify(req.results));
      } else {
        req.results.error = "Reset link expired";
        res.end(JSON.stringify(req.results));
      }
    }
  },
  async handleSession(req, res) {
    try {
      // Common for all responses from /session
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");

      // Init req state
      req.client = await pool.pool.connect();
      req.body = JSON.parse(req.body);
      req.session = {
        session_uuid: "",
        session_id: "",
        admin: false,
        email: "",
        user_id: "",
        display_name: "",
      };
      req.results = {
        articles: [],
        comments: [],
        activities: [],
        path: pages[req.body.path] ? req.body.path : "/",
      };

      await this.validateSessionUuid(req, res);
      await this.createUserIfNotExists(req, res);
      await this.signUpOrSignIn(req, res);
      await this.generateResetToken(req, res);
      await this.useResetToken(req, res);
      await this.saveArticle(req, res);
      await this.saveComment(req, res);
      await this.saveDisplayName(req, res);
      await this.createSessionIfNotExists(req, res);
      await this.getSingleArticle(req, res);
      await this.getRecentActivity(req, res);
      await this.getPageArticles(req, res);
      await this.promptToUsePasswordReset(req, res);

      // Default response if nothing else responded sooner
      if (!req.writableEnded) {
        req.results.session_uuid = req.session.session_uuid;
        req.results.email = req.session.email;
        req.results.display_name = req.session.display_name;
        req.results.display_name_index = req.session.display_name_index;
        res.end(JSON.stringify(req.results));
      }
    } catch (err) {
      console.error("Session error", err);
      res.end(JSON.stringify({ error: "Database error" }));
    } finally {
      req.client.release();
    }
  },
  handleRequest(req, res) {
    // Path is always useful
    req.path = req.url.split("/").join("").split("?")[0];

    // Always get the body sent
    req.body = "";
    req.on("readable", () => {
      req.body += req.read() || "";
    });
    req.on("end", () => {
      // Start an async function
      (async () => {
        // PATH session
        if (req.path === "session") {
          await this.handleSession(req, res);
          return;
        }

        // PATH for files
        res.statusCode = 200;
        let filename = "index.html";
        let content_type = "text/html; charset=utf-8";
        let encoding = "utf-8";
        if (this.resources.indexOf(req.path) > -1) {
          filename = "resources/" + req.path;
          res.setHeader("Cache-Control", "public, max-age=31536000");
        }
        const extension = filename.split(".").pop();
        const content_types = {
          ico: "image/x-icon",
          png: "image/png",
          svg: "image/svg+xml",
          xml: "application/xml",
          gif: "image/gif",
          webmanifest: "application/manifest+json",
          ttf: "font/ttf",
        };
        const encodings = {
          ico: "binary",
          png: "binary",
          gif: "binary",
          ttf: "binary",
        };
        if (content_types[extension]) {
          content_type = content_types[extension];
        }
        if (encodings[extension]) {
          encoding = encodings[extension];
        }

        res.setHeader("Content-Type", content_type);
        fs.readFile(filename, encoding, (err, data) => {
          if (err) {
            console.error(err);
            res.end("Error reading file\n");
            return;
          }
          res.end(data, encoding);
        });
      })();
    });
  },
  init() {
    const hostname = "0.0.0.0";
    const port = 3000;

    this.resources = [];
    fs.readdir("resources", (err, files) => {
      this.resources = this.resources.concat(files);
    });

    const server = http.createServer(this.handleRequest.bind(this));
    server.listen(port, hostname, () => {
      console.log(`Server running at http://${hostname}:${port}/`);
    });
    server.on("error", (err) => {
      console.error(err);
    });
  },
};

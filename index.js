const http = require("node:http");
const fs = require("node:fs");
const nodemailer = require("nodemailer");
const OpenAI = require("openai");
const { Pool } = require("pg");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const { text } = require("stream/consumers");

const pages = {
  "/": {
    title: "Home",
    body: "This is the home page of FirstChristianAtheist.org",
    admin_only: true,
  },
  "/topics": {
    title: "Topics",
    body: `A list of topics related to answering the question:

"What can be done to demonstrate unconditional love for all?"

And exploring answers to that question together without judgement or authority or theistic baggage.`,
    admin_only: false,
  },
};
let root_user_id = null;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

(async () => {
  const client = await pool.connect();
  try {
    await client.query(`
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
  create_date TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS browsers (
  browser_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  session_id INT NOT NULL,
  user_agent VARCHAR(255) NOT NULL,
  ip_address CHAR(39) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  user_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  display_name CHAR(50) NOT NULL,
  display_name_calculated CHAR(60),
  votes_raw INT DEFAULT 0,
  votes_weighted FLOAT DEFAULT 0.0,
  email CHAR(255),
  password_hash BYTEA,
  email_notifications BOOL DEFAULT false,
  admin BOOL DEFAULT false,
  spam BOOL DEFAULT false,
  create_date TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  user_id INT NOT NULL,
  session_id INT NOT NULL,
  create_date TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, session_id)
);

CREATE TABLE IF NOT EXISTS reset_tokens (
  token_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  user_id INT NOT NULL,
  token_uuid CHAR(36) NOT NULL,
  create_date TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS articles (
  article_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  parent_article_id INT,
  title CHAR(140) NOT NULL,
  body CHAR(4000) NOT NULL,
  note CHAR(500),
  user_id INT NOT NULL,
  votes_raw INT DEFAULT 0,
  votes_weighted FLOAT DEFAULT 0.0,
  admin BOOL DEFAULT false,
  create_date TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  comment_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  parent_article_id INT,
  parent_article_paragraph_index INT,
  parent_comment_id INT,
  body CHAR(1000) NOT NULL,
  note CHAR(500),
  user_id INT NOT NULL,
  votes_raw INT DEFAULT 0,
  votes_weighted FLOAT DEFAULT 0.0,
  create_date TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS votes (
  vote_id INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  article_id INT,
  comment_id INT,
  session_id INT NOT NULL,
  create_date TIMESTAMP NOT NULL DEFAULT NOW()
);
    `);
    const found_root_user = await client.query(`
      SELECT user_id FROM users
      WHERE
        admin = true;
    `);
    if (found_root_user.rows.length === 0) {
      root_user_id = found_root_user.rows[0].user_id;
    }
    if (root_user_id) {
      const page_paths = Object.keys(pages);
      for (const page_path of page_paths) {
        const page = pages[page_path];
        const found_page = await client.query(
          `
          SELECT article_id
          FROM articles
          WHERE title = $1 AND user_id = $2 AND admin = true;
        `,
          [page.title, root_user_id],
        );
        if (found_page.rows.length === 0) {
          page.article_id = found_page.rows[0].article_id;
        } else {
          const new_page = await client.query(
            `
            INSERT INTO articles
              (title, body, user_id, parent_article_id)
            VALUES
              ($1, $2, $3, 0)
            RETURNING article_id;
          `,
            [page.title, page.body, root_user_id],
          );
          page.article_id = new_page.rows[0].article_id;
        }
      }
    }
    /*const results = await client.query(`
      SELECT user_agent, ip_address, create_date
      FROM browsers
      INNER JOIN sessions ON browsers.session_id = sessions.session_id
      ORDER BY create_date DESC
    `);
    console.log(results.rows);*/
  } catch (err) {
    console.error("error executing query:", err);
  } finally {
    client.release();
  }
})();

const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 465,
  secure: true,
  auth: {
    user: process.env["SMTP_USER"],
    pass: process.env["SMTP_PASS"],
  },
});

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

/*openai.chat.completions
.create({
  model: "gpt-4o",
  messages: [
    {
      role: "system",
      content: [
        {
          text: "You will perform content moderation for FirstChristianAtheist.org\n\nYou always respond with a single word of either OKAY or NOTE or BLOCK.\n\nWith NOTE, you will follow that single word with some additional text. This additional text will be shown in addition to the original text, similar to the community notes feature on Twitter.\n\nFor example “Lying is bad” gets a response of “NOTE The use of the word bad here may be judgemental.”\n\nThe goal of discussion on the site is always focused this one question “What can be done to demonstrate unconditional love for all?” and exploring answers to that question together without judgement. Please use Marshall Rosenberg's Nonviolent Communication as a guide. Specifically to be avoided are any statements of judgements (right or wrong or too much or too little) or statements of oughts (should and shouldn’t, do this, do that), with an emphasis on constructively contributing to the dialogue on the site.\n\nIf a user makes a judgement or command, add a note that affirms some value in what they said in a less judgemental way.\n\nFor example “don’t lie” gets a response of “NOTE Lying makes trust and communication difficult.”\n\nFor example “Christian atheism is a paradox” gets a response of “NOTE For some, what christianity is about is not believing in God as entity, but instead about believing in love as an effective way to cooperate with others.”\n\nFor example ”It is a fact that Jesus existed” gets a response of “NOTE The evidence we have for the existence of Jesus are the gospels and secondary sources mentioning Christians as a group.“\n\nThe intent is to be as permissive as possible, but with notes to soften and guide discussion towards the Christian Atheist goals of unconditional love for all without the baggage of theism and its judgements.\n\nThe intent is to be permissive as possible, adding notes to soften harsh words and guide discussion to a more constructive place, but even allowing links when they are relevant. Only if the text is complete spam should you reply BLOCK",
          type: "text",
        },
      ],
    },
    {
      role: "user",
      content: [
        {
          text: "Christianity as it is today does not accept unrepentant atheists, with the exception of Unitarian Universalists whose services are still only focused on a theistic audience, focusing on the joys of worshipping God together.\n\nPerhaps here we can have a home, for those few of us who have some value (unconditional love) that we seek to retain from the Christian tradition, without the theistic baggage.",
          type: "text",
        },
      ],
    },
  ],
  temperature: 0,
  max_tokens: 2048,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
})
.then((response) => {
  console.log(response.choices[0].message.content);
})
.catch((error) => {
  console.error(error);
});*/

const sendEmail = (to, subject, text, html) => {
  transporter.sendMail(
    {
      from: '"Derek Bredensteiner" <derek@firstchristianatheist.org>',
      to,
      subject,
      text,
      html,
    },
    (error, info) => {
      if (error) {
        console.error(error);
      } else {
        console.log("Email sent", to, subject, info.response);
      }
    },
  );
};

let resources = [];
fs.readdir("resources", (err, files) => {
  resources = resources.concat(files);
});

const server = http.createServer((req, res) => {
  // Path is always useful
  const path = req.url.split("/").join("").split("?")[0];

  // Always get the body sent
  let body = "";
  req.on("readable", function () {
    body += req.read() || "";
  });
  req.on("end", function () {
    // Start an async function
    (async () => {
      // PATH session
      if (path === "session") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        const client = await pool.connect();
        try {
          body = JSON.parse(body);
          let session_uuid = "";
          let session_id = "";
          let admin = false;
          let email = "";

          // Check the body session_uuid
          if (body.session_uuid) {
            const results = await client.query(
              `
              SELECT sessions.session_uuid, sessions.session_id, users.email, users.admin
              FROM sessions
              LEFT JOIN user_sessions ON sessions.session_id = user_sessions.session_id
              LEFT JOIN users ON user_sessions.user_id = users.user_id
              WHERE sessions.session_uuid = $1
            `,
              [body.session_uuid],
            );
            if (results.rows.length > 0) {
              session_uuid = results.rows[0].session_uuid;
              session_id = results.rows[0].session_id;
              email = results.rows[0].email.trim();
              admin = results.rows[0].admin || false;
            }
          }

          // Here we might perform additional actions using session_id
          // (sign up, articling, commenting, voting, etc)
          if (body.email && body.password && session_id) {
            const user_found = await client.query(
              `
              SELECT password_hash, user_id
              FROM users
              WHERE lower(email) = lower($1)
            `,
              [body.email],
            );
            if (user_found.rows.length > 0) {
              const password_hash = user_found.rows[0].password_hash;
              const password_match = await bcrypt.compare(
                body.password,
                password_hash.toString(),
              );
              if (password_match) {
                await client.query(
                  `
                  INSERT INTO user_sessions
                    (user_id, session_id)
                  VALUES
                    ($1, $2)
                `,
                  [user_found.rows[0].user_id, session_id],
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
              const admin = process.env["ROOT_EMAIL"] === body.email;
              const password_hash = await bcrypt.hash(body.password, 12);
              const user_inserted = await client.query(
                `
                INSERT INTO users
                  (email, password_hash, display_name, display_name_calculated, admin)
                VALUES
                  (lower($1), $2, $3, $4, $5)
                RETURNING user_id
              `,
                [body.email, password_hash, "", "", admin],
              );
              await client.query(
                `
                INSERT INTO user_sessions
                  (user_id, session_id)
                VALUES
                  ($1, $2)
              `,
                [user_inserted.rows[0].user_id, session_id],
              );
              res.end(
                JSON.stringify({
                  success: true,
                }),
              );
            }

            // Request Password Reset
          } else if (body.email && session_id) {
            const user_found = await client.query(
              `
              SELECT user_id
              FROM users
              WHERE lower(email) = lower($1)
            `,
              [body.email],
            );
            if (user_found.rows.length > 0) {
              const token_uuid = crypto.randomUUID();
              await client.query(
                `
                INSERT INTO reset_tokens
                  (user_id, token_uuid)
                VALUES
                  ($1, $2)
              `,
                [user_found.rows[0].user_id, token_uuid],
              );
              const token_url = `https://firstchristianatheist.org/reset/${token_uuid}`;
              sendEmail(
                body.email,
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
              res.end(
                JSON.stringify({
                  success: true,
                }),
              );
            } else {
              res.end(
                JSON.stringify({
                  success: true,
                }),
              );
            }

            // Resetting Password with token
          } else if (body.password && body.reset_token_uuid && session_id) {
            const token_found = await client.query(
              `
              SELECT reset_tokens.user_id
              FROM reset_tokens
              WHERE reset_tokens.token_uuid = $1
            `,
              [body.reset_token_uuid],
            );
            if (token_found.rows.length > 0) {
              const user_id = token_found.rows[0].user_id;
              const password_hash = await bcrypt.hash(body.password, 12);
              await client.query(
                `
                UPDATE users
                  SET password_hash = $1
                WHERE user_id = $2
              `,
                [password_hash, user_id],
              );
              res.end(
                JSON.stringify({
                  success: true,
                }),
              );
            } else {
              res.end(
                JSON.stringify({
                  session_uuid,
                  error: "Reset link expired",
                }),
              );
            }

            // Default session response
          } else {
            // If no valid session_uuid, create one
            if (session_uuid === "") {
              session_uuid = crypto.randomUUID();
              const insert_session = await client.query(
                `
                INSERT INTO sessions (session_uuid)
                VALUES ($1) returning session_id;
              `,
                [session_uuid],
              );
              session_id = insert_session.rows[0].session_id;
              const user_agent = req.headers["user-agent"];
              const ip_address = req.headers["x-forwarded-for"].split(",")[0];
              await client.query(
                `
                INSERT INTO browsers
                  (session_id, user_agent, ip_address)
                VALUES
                  ($1, $2, $3);
              `,
                [session_id, user_agent, ip_address],
              );
            }

            // Get articles for path
            const articles = [];
            let path_to_use = "/";
            if (pages["/" + body.path]) {
              path_to_use = "/" + body.path;
            }
            const page = pages[path_to_use];
            const add_new = !page.admin || admin;
            if (page.article_id) {
              const article_results = await client.query(`
                SELECT article_id, title, body
                FROM articles
                WHERE parent_article_id = $1
                ORDER BY create_date ASC
              `, [page.article_id]);
              articles.push(...article_results.rows);
            }

            // Using password reset
            if (body.reset_token_uuid) {
              const user_found = await client.query(
                `
                SELECT reset_tokens.user_id, users.email, user_sessions.session_id
                FROM reset_tokens
                INNER JOIN users ON reset_tokens.user_id = users.user_id
                LEFT JOIN sessions ON sessions.session_uuid = $1
                LEFT JOIN user_sessions ON user_sessions.user_id = users.user_id AND user_sessions.session_id = sessions.session_id
                WHERE reset_tokens.token_uuid = $2
              `,
                [session_uuid, body.reset_token_uuid],
              );

              if (user_found.rows.length > 0) {
                if (!user_found.rows[0].session_id) {
                  await client.query(
                    `
                    INSERT INTO user_sessions
                      (user_id, session_id)
                    VALUES
                      ($1, $2)
                  `,
                    [user_found.rows[0].user_id, session_id],
                  );
                }
                res.end(
                  JSON.stringify({
                    session_uuid,
                    email: user_found.rows[0].email,
                    articles,
                    path: path_to_use,
                    add_new,
                  }),
                );
              } else {
                res.end(
                  JSON.stringify({
                    session_uuid,
                    articles,
                    path: path_to_use,
                    add_new,
                    error: "Reset link expired",
                  }),
                );
              }
            } else {
              // Return the valid session_uuid
              res.end(JSON.stringify({
                session_uuid,
                email,
                articles,
                path: path_to_use,
                add_new,
            }));
            }
          }
        } catch (err) {
          console.error("error executing query:", err);
          res.end(JSON.stringify({ error: "Database error" }));
        } finally {
          client.release();
        }
        return;
      }

      // PATH for files
      res.statusCode = 200;
      let filename = "index.html";
      let content_type = "text/html; charset=utf-8";
      let encoding = "utf-8";
      if (resources.indexOf(path) > -1) {
        filename = "resources/" + path;
      }
      const extension = filename.split(".").pop();
      const content_types = {
        ico: "image/x-icon",
        png: "image/png",
        svg: "image/svg+xml",
        xml: "application/xml",
        gif: "image/gif",
        webmanifest: "application/manifest+json",
      };
      const encodings = {
        ico: "binary",
        png: "binary",
        gif: "binary",
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
});

const hostname = "0.0.0.0";
const port = 3000;
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

server.on("error", (err) => {
  console.error(err);
});

const http = require("node:http");
const fs = require("node:fs");
const pages = require("./pages");
const pool = require("./pool");

module.exports = {
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

      // Call all middleware in a specific order
      await require("./session/validateSessionUuid")(req, res);
      await require("./session/createUserIfNotExists")(req, res);
      await require("./session/signUpOrSignIn")(req, res);
      await require("./session/generateResetToken")(req, res);
      await require("./session/useResetToken")(req, res);
      await require("./session/saveArticle")(req, res);
      await require("./session/saveComment")(req, res);
      await require("./session/saveDisplayName")(req, res);
      await require("./session/createSessionIfNotExists")(req, res);
      await require("./session/getSingleArticle")(req, res);
      await require("./session/getRecentActivity")(req, res);
      await require("./session/getPageArticles")(req, res);
      await require("./session/promptToUsePasswordReset")(req, res);

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

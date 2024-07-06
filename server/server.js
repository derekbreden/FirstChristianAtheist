const http = require("node:http");
const fs = require("node:fs/promises");

module.exports = {
  handleRequest(req, res) {
    // Path is always useful
    req.path = req.url.split("/").join("").split("?")[0];

    // Always get the body sent
    req.body = "";
    req.on("readable", () => {
      req.body += req.read() || "";
    });
    req.on("end", async () => {
      try {
        // PATH session
        if (req.path === "session") {
          await require("./handleSession")(req, res);
          return;
        }

        // Path image
        if (req.path.substr(0, 5) === "image" && req.path.length > 20) {
          await require("./handleImage")(req, res);
          return;
        }

        // PATH test
        if (req.path === "test_cleanup") {
          await require("./handleTest")(req, res);
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
        const data = await fs.readFile(filename, encoding);

        // Handle Server Side Includes for .html files
        if (extension === "html") {
          const lines = data.split("\n");
          for (const line of lines) {
            if (line.indexOf('<!--#include file="') > -1) {
              const file = line.split('"')[1];

              // Tests are skipped when not on the test path
              const dir = file.split("/")[0];
              if (dir === "tests" && req.path !== "test") {
                continue;
              }

              const file_content = await fs.readFile(file, encoding);
              res.write(file_content + "\n", encoding);
            } else {
              res.write(line + "\n", encoding);
            }
          }
          res.end("", encoding);

          // Return any other file as is
        } else {
          res.end(data, encoding);
        }
      } catch ($error) {
        console.error($error);
        res.end("Error reading file\n");
      }
    });
  },
  async init() {
    const hostname = "0.0.0.0";
    const port = 3000;

    this.resources = [];
    this.resources = await fs.readdir("resources");

    const server = http.createServer(this.handleRequest.bind(this));
    server.listen(port, hostname, () => {
      console.log(`Server running at http://${hostname}:${port}/`);
    });
    server.on("error", (err) => {
      console.error(err);
    });
  },
};

// Server
const schema = require("./server/schema");
const email = require("./server/email");
const ai = require("./server/ai");
const server = require("./server/server");
const pool = require("./server/pool");

// Init
pool.init();
schema.init();
email.init();
ai.init();
server.init();
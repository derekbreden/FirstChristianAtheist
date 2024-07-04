const pages = require("./pages");
const pool = require("./pool");

module.exports = async (req, res) => {
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
    await require("./session/getAdminImage")(req, res);
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
}
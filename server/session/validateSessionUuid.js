module.exports = async (req, res) => {
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
};
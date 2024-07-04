const bcrypt = require("bcrypt");

module.exports = async (req, res) => {
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
};
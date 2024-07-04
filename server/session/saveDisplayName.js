const ai = require("../ai");

module.exports = async (req, res) => {
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
};

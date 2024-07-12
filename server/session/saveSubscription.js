module.exports = async (req, res) => {
  if (!req.writableEnded && req.session.user_id && req.body.subscription) {
    if (req.body.remove) {
      await req.client.query(
        `
        DELETE FROM subscriptions
        WHERE
          user_id = $1
          AND subscription_json = $2
        `,
        [req.session.user_id, JSON.stringify(req.body.subscription)],
      );
    } else {
      const existing = await req.client.query(
        `
        SELECT subscription_id FROM subscriptions
        WHERE
          user_id = $1
          AND subscription_json = $2
        `,
        [req.session.user_id, JSON.stringify(req.body.subscription)],
      );
      if (!existing.rows.length) {
        await req.client.query(
          `
          INSERT INTO subscriptions (user_id, subscription_json)
          VALUES ($1, $2)
          `,
          [req.session.user_id, JSON.stringify(req.body.subscription)],
        );
      }
    }
    res.end(
      JSON.stringify({
        success: true,
      }),
    );
  }
};

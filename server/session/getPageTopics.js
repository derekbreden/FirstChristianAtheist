const pages = require("../pages");

module.exports = async (req, res) => {
  if (!req.writableEnded && pages[req.results.path]) {
    const page = pages[req.results.path];
    const topic_results = await req.client.query(
      `
      SELECT
        a.create_date,
        a.topic_id,
        a.title,
        a.slug,
        LEFT(a.body, 1000) as body,
        CASE WHEN a.user_id = $1 THEN true ELSE false END AS edit,
        STRING_AGG(DISTINCT i.image_uuid, ',') as image_uuids,
        COUNT(DISTINCT c.comment_id) as comments
      FROM topics a
      LEFT JOIN topic_images i ON a.topic_id = i.topic_id
      LEFT JOIN comments c ON a.topic_id = c.parent_topic_id
      WHERE
        a.parent_topic_id = $2
        AND (a.create_date > $3 OR $3 IS NULL)
        AND (a.create_date < $4 OR $4 IS NULL)
      GROUP BY
        a.create_date,
        a.topic_id,
        a.title,
        a.slug,
        LEFT(a.body, 1000),
        CASE WHEN a.user_id = $1 THEN true ELSE false END
      ORDER BY a.create_date DESC
      LIMIT 20
      `,
      [
        req.session.user_id || 0,
        page.topic_id,
        req.body.min_topic_create_date || null,
        req.body.max_topic_create_date || null,
      ],
    );
    req.results.topics.push(...topic_results.rows);
    if (req.results.path === "/") {
      const comment_results = await req.client.query(
        `
          SELECT
            c.create_date,
            c.comment_id,
            c.body,
            c.note,
            c.parent_comment_id,
            u.display_name,
            u.display_name_index,
            CASE WHEN c.user_id = $1 THEN true ELSE false END AS edit,
            STRING_AGG(i.image_uuid, ',') AS image_uuids
          FROM comments c
          INNER JOIN users u ON c.user_id = u.user_id
          LEFT JOIN comment_images i ON c.comment_id = i.comment_id
          WHERE
            c.parent_topic_id = $2
            AND (c.create_date > $3 OR $3 IS NULL)
          GROUP BY
            c.create_date,
            c.comment_id,
            c.body,
            c.note,
            c.parent_comment_id,
            u.display_name,
            u.display_name_index,
            CASE WHEN c.user_id = $1 THEN true ELSE false END
          ORDER BY c.create_date ASC
        `,
        [
          req.session.user_id || 0,
          page.topic_id,
          req.body.min_comment_create_date || null,
        ],
      );
      req.results.comments.push(...comment_results.rows);
    }
  }
};

module.exports = async (req, res) => {
  if (
    !req.writableEnded &&
    req.body.path &&
    req.body.path.substr(0, 8) === "/article"
  ) {
    const slug = req.body.path.substr(9);
    const article_results = await req.client.query(
      `
      SELECT
        a.create_date,
        a.article_id,
        a.title,
        a.slug,
        a.body,
        CASE WHEN a.user_id = $1 THEN true ELSE false END AS edit,
        STRING_AGG(i.image_uuid, ',') AS image_uuids
      FROM articles a
      LEFT JOIN article_images i ON a.article_id = i.article_id
      WHERE
        a.slug = $2
        AND (a.create_date > $3 OR $3 IS NULL)
      GROUP BY
        a.create_date,
        a.article_id,
        a.title,
        a.slug,
        a.body,
        CASE WHEN a.user_id = $1 THEN true ELSE false END
      `,
      [
        req.session.user_id || 0,
        slug,
        req.body.min_article_create_date || null,
      ],
    );

    // We set path here to ensure the path goes to a default if there are no results
    if (article_results.rows.length) {
      req.results.path = `/article/${slug}`;
      req.results.articles.push(...article_results.rows);
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
          c.parent_article_id = $2
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
          article_results.rows[0].article_id,
          req.body.min_comment_create_date || null,
        ],
      );
      req.results.comments.push(...comment_results.rows);
    }

    // But, now that we are checking for most recent, the path is also good if a min_article_create_date was passed
    if (req.body.min_article_create_date) {
      req.results.path = `/article/${slug}`;
    }
  }
};

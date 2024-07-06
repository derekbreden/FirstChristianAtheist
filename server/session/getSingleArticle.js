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
        a.article_id,
        a.title,
        a.slug,
        a.body,
        CASE WHEN a.user_id = $1 THEN true ELSE false END AS edit,
        STRING_AGG(i.image_uuid, ',') AS image_uuids
      FROM articles a
      LEFT JOIN article_images i ON a.article_id = i.article_id
      WHERE a.slug = $2
      GROUP BY
        a.article_id,
        a.title,
        a.slug,
        a.body,
        CASE WHEN a.user_id = $1 THEN true ELSE false END
      `,
      [req.session.user_id || 0, slug],
    );
    if (article_results.rows.length) {
      req.results.path = `/article/${slug}`;
      req.results.articles.push(...article_results.rows);
      const comment_results = await req.client.query(
        `
        SELECT
          comments.comment_id,
          comments.body,
          comments.note,
          comments.parent_comment_id,
          users.display_name,
          users.display_name_index,
          CASE WHEN comments.user_id = $1 THEN true ELSE false END AS edit
        FROM comments
        INNER JOIN users ON comments.user_id = users.user_id
        WHERE comments.parent_article_id = $2
        ORDER BY comments.create_date ASC
        `,
        [req.session.user_id || 0, article_results.rows[0].article_id],
      );
      req.results.comments.push(...comment_results.rows);
    }
  }
};
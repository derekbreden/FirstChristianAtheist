const pages = require("../pages");

module.exports = async (req, res) => {
  if (!req.writableEnded && pages[req.results.path]) {
    const page = pages[req.results.path];
    const article_results = await req.client.query(
      `
      SELECT
        a.article_id,
        a.title,
        a.slug,
        LEFT(a.body, 1000) as body,
        CASE WHEN a.user_id = $1 THEN true ELSE false END AS edit,
        STRING_AGG(i.image_uuid, ',') as image_uuids
      FROM articles a
      LEFT JOIN article_images i ON a.article_id = i.article_id
      WHERE a.parent_article_id = $2
      GROUP BY
        a.article_id,
        a.title,
        a.slug,
        LEFT(a.body, 1000),
        CASE WHEN a.user_id = $1 THEN true ELSE false END
      ORDER BY a.create_date ASC
      `,
      [req.session.user_id || 0, page.article_id],
    );
    req.results.articles.push(...article_results.rows);
    const comment_results = await req.client.query(
      `
        SELECT
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
        WHERE c.parent_article_id = $2
        GROUP BY
          c.comment_id,
          c.body,
          c.note,
          c.parent_comment_id,
          u.display_name,
          u.display_name_index,
          CASE WHEN c.user_id = $1 THEN true ELSE false END
        ORDER BY c.create_date ASC
      `,
      [req.session.user_id || 0, page.article_id],
    );
    req.results.comments.push(...comment_results.rows);
  }
};
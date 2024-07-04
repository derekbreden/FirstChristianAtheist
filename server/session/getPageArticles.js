const pages = require("../pages");

module.exports = async (req, res) => {
  if (!req.writableEnded && pages[req.results.path]) {
    const page = pages[req.results.path];
    const article_results = await req.client.query(
      `
      SELECT article_id, title, slug, LEFT(body, 1000) as body,
        CASE WHEN user_id = $1 THEN true ELSE false END AS edit
      FROM articles
      WHERE parent_article_id = $2
      ORDER BY create_date ASC
      `,
      [req.session.user_id || 0, page.article_id],
    );
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
      [req.session.user_id || 0, page.article_id],
    );
    req.results.comments.push(...comment_results.rows);
  }
};
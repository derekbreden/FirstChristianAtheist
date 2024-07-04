const ai = require("../ai");
const pages = require("../pages");

module.exports = async (req, res) => {
  if (
    !req.writableEnded &&
    req.session.user_id &&
    req.body.title &&
    req.body.body &&
    req.body.path
  ) {
    // Get page context if modifying an article from its slug page
    //   where path is no longer the page slug
    if (req.body.article_id) {
      const page_result = await req.client.query(
        `
        SELECT slug
        FROM articles
        WHERE article_id = (
          SELECT parent_article_id
          FROM articles
          WHERE article_id = $1
        )
        `,
        [req.body.article_id],
      );
      req.body.path = "/" + page_result.rows[0].slug.toLowerCase();
    }

    // Always moderate based on page context
    const page = pages[req.body.path];
    const ai_response_text = await ai.ask(`"""CONTEXT
${page.title}
${page.body}
"""
"""USER
${req.body.title}
${req.body.body}
"""`);
    if (ai_response_text === "OK") {
      const slug = req.body.title
        .replace(/[^a-z0-9 ]/gi, "")
        .replace(/ {1,}/g, "_");
      // Update existing
      if (req.body.article_id) {
        await req.client.query(
          `
          UPDATE articles
          SET title = $1, slug = $2, body = $3
          WHERE
            article_id = $4
            AND user_id = $5
          `,
          [
            req.body.title,
            slug,
            req.body.body,
            req.body.article_id,
            req.session.user_id,
          ],
        );

        // Add new
      } else {
        await req.client.query(
          `
          INSERT INTO articles
            (title, slug, body, parent_article_id, user_id)
          VALUES
            ($1, $2, $3, $4, $5)
          `,
          [
            req.body.title,
            slug,
            req.body.body,
            page.article_id,
            req.session.user_id,
          ],
        );
      }

      // Respond with success so the client reloads
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
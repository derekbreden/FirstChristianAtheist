const ai = require("../ai");
const pages = require("../pages");
const crypto = require("node:crypto");
const { Client } = require("@replit/object-storage");
const object_client = new Client();

module.exports = async (req, res) => {
  if (
    !req.writableEnded &&
    req.session.user_id &&
    req.body.title &&
    req.body.body &&
    req.body.path &&
    req.body.pngs
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
    const ai_response_text = await ai.ask(
      `"""CONTEXT
${page.title}
${page.body}
"""
"""USER
${req.body.title}
${req.body.body}
"""`,
      "common",
      req.body.pngs,
    );
    if (ai_response_text === "OK") {
      const slug = req.body.title
        .replace(/[^a-z0-9 ]/gi, "")
        .replace(/ {1,}/g, "_");
      let article_id = 0;
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
        article_id = req.body.article_id;

        // Add new
      } else {
        const article_result = await req.client.query(
          `
          INSERT INTO articles
            (title, slug, body, parent_article_id, user_id)
          VALUES
            ($1, $2, $3, $4, $5)
          RETURNING article_id;
          `,
          [
            req.body.title,
            slug,
            req.body.body,
            page.article_id,
            req.session.user_id,
          ],
        );
        article_id = article_result.rows[0].article_id;
      }

      // Remove existing images
      const existing_images = await req.client.query(
        `
        DELETE FROM article_images
        WHERE article_id = $1
        RETURNING image_uuid
        `,
        [article_id],
      );
      for (const existing_image of existing_images.rows) {
        const { ok, error } = await object_client.delete(
          `${existing_image.image_uuid}.png`,
        );
        if (!ok) {
          console.error(error);
        }
      }
      for (const png of req.body.pngs) {
        const image_uuid = crypto.randomUUID();
        const image_name = image_uuid + ".png";
        const { ok, error } = await object_client.uploadFromBytes(
          `${image_uuid}.png`,
          png.url,
        );
        if (!ok) {
          console.error(error);
        } else {
          await req.client.query(
            `
            INSERT INTO article_images
              (article_id, image_uuid)
            VALUES
              ($1, $2)
            `,
            [article_id, image_uuid],
          );
        }
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

const ai = require("../ai");
const pages = require("../pages");
const crypto = require("node:crypto");
const { Client } = require("@replit/object-storage");
const object_client = new Client();

module.exports = async (req, res) => {
  if (
    !req.writeableEnded &&
    req.session.user_id &&
    req.body.display_name &&
    req.body.body &&
    req.body.path &&
    req.body.pngs
  ) {
    const page = pages[req.body.path] || pages["/"];
    let article_id = page.article_id;
    if (req.body.path.substr(0, 8) === "/article") {
      const slug = req.body.path.substr(9);
      const article_results = await req.client.query(
        `
        SELECT article_id
        FROM articles
        WHERE slug = $1
        `,
        [slug],
      );
      if (article_results.rows.length) {
        article_id = article_results.rows[0].article_id;
      } else {
        res.end(
          JSON.stringify({
            error: "Path not found",
          }),
        );
        return;
      }
    }

    const messages = [];
    messages.push({
      role: "user",
      name: "Admin",
      content: page.title + "\n\n" + page.body,
    });
    const article_results = await req.client.query(
      `
      SELECT a.title, a.body, u.display_name
      FROM articles a
      INNER JOIN users u ON a.user_id = u.user_id
      WHERE a.parent_article_id = $1
      ORDER BY a.create_date ASC
      `,
      [article_id],
    );
    for (const article of article_results.rows) {
      messages.push({
        role: "user",
        name: (article.display_name || "Anonymous").replace(
          /[^a-z0-9_\-]/g,
          "",
        ),
        content: article.title + "\n\n" + article.body,
      });
      messages.push({
        role: "system",
        content: "OK",
      });
    }
    const ancestor_ids = [];
    if (req.body.parent_comment_id) {
      messages.push({
        role: "user",
        name: "Admin",
        content: [{ type: "text", text: "Comments:" }],
      });
      const comment_ancestors = await req.client.query(
        `
        SELECT
          users.display_name,
          comments.body,
          comments.note,
          comments.comment_id
        FROM comments
        INNER JOIN users ON comments.user_id = users.user_id
        WHERE comments.comment_id = $1
        OR comments.comment_id IN (
          SELECT ancestor_id
          FROM comment_ancestors
          WHERE comment_id = $1
        )
        ORDER BY comments.create_date ASC
        `,
        [req.body.parent_comment_id],
      );
      for (const comment_ancestor of comment_ancestors.rows) {
        messages.push({
          role: "user",
          name: comment_ancestor.display_name.replace(/[^a-z0-9_\-]/g, ""),
          content:
            comment_ancestor.display_name + ":\n" + comment_ancestor.body,
        });
        if (comment_ancestor.note) {
          messages.push({
            role: "system",
            content: comment_ancestor.note,
          });
        } else {
          messages.push({
            role: "system",
            content: "OK",
          });
        }
      }
      ancestor_ids.push(...comment_ancestors.rows.map((c) => c.comment_id));
    }
    messages.push({
      role: "user",
      name: req.body.display_name.replace(/[^a-z0-9_\-]/g, ""),
      content: [
        { type: "text", text: req.body.display_name + ":\n" + req.body.body },
        ...req.body.pngs.map((png) => {
          return {
            image_url: {
              url: png.url,
            },
            type: "image_url",
          };
        }),
      ],
    });
    const ai_response_text = await ai.ask(messages, "common");
    if (ai_response_text === "SPAM") {
      res.end(
        JSON.stringify({
          error: ai_response_text,
        }),
      );
      return;
    }
    let comment_id = req.body.comment_id;
    if (ai_response_text === "OK") {
      if (req.body.comment_id) {
        await req.client.query(
          `
          UPDATE comments
          SET body = $1, note = NULL
          WHERE
            comment_id = $2
            AND user_id = $3
          `,
          [req.body.body, req.body.comment_id, req.session.user_id],
        );
      } else {
        const comment_inserted = await req.client.query(
          `
          INSERT INTO comments
            (body, parent_article_id, user_id, parent_comment_id)
          VALUES
            ($1, $2, $3, $4)
          RETURNING comment_id
          `,
          [
            req.body.body,
            article_id,
            req.session.user_id,
            req.body.parent_comment_id,
          ],
        );
        comment_id = comment_inserted.rows[0].comment_id;
      }
    } else {
      if (req.body.comment_id) {
        await req.client.query(
          `
          UPDATE comments
          SET body = $1, note = $2
          WHERE
            comment_id = $3
            AND user_id = $4
          `,
          [
            req.body.body,
            ai_response_text,
            req.body.comment_id,
            req.session.user_id,
          ],
        );
      } else {
        const comment_inserted = await req.client.query(
          `
          INSERT INTO comments
            (body, note, parent_article_id, user_id, parent_comment_id)
          VALUES
            ($1, $2, $3, $4, $5)
          RETURNING comment_id
          `,
          [
            req.body.body,
            ai_response_text,
            article_id,
            req.session.user_id,
            req.body.parent_comment_id,
          ],
        );
        comment_id = comment_inserted.rows[0].comment_id;
      }
    }

    // Update the display name
    await require("./updateDisplayName")(req, res);

    // Insert all of the ancestors
    if (ancestor_ids.length > 0 && !req.body.comment_id) {
      // Create a values string for the bulk insert
      const values = ancestor_ids
        .map((ancestor_id, index) => `($1, $${index + 2})`)
        .join(", ");

      // Execute the bulk insert query
      await req.client.query(
        `
        INSERT INTO comment_ancestors (comment_id, ancestor_id)
        VALUES ${values}
        `,
        [comment_id, ...ancestor_ids],
      );
    }

    // Remove existing images
    if (req.body.comment_id) {
      const existing_images = await req.client.query(
        `
        DELETE FROM comment_images
        WHERE comment_id = $1
        RETURNING image_uuid
        `,
        [comment_id],
      );
      for (const existing_image of existing_images.rows) {
        const { ok, error } = await object_client.delete(
          `${existing_image.image_uuid}.png`,
        );
        if (!ok) {
          console.error(error);
        }
      }
    }

    // Add new images
    for (const png of req.body.pngs) {
      const image_uuid = crypto.randomUUID();
      const { ok, error } = await object_client.uploadFromBytes(
        `${image_uuid}.png`,
        png.url,
      );
      if (!ok) {
        console.error(error);
      } else {
        await req.client.query(
          `
          INSERT INTO comment_images
            (comment_id, image_uuid)
          VALUES
            ($1, $2)
          `,
          [comment_id, image_uuid],
        );
      }
    }

    // Respond with success so the client reloads
    res.end(
      JSON.stringify({
        success: true,
      }),
    );
  }
};

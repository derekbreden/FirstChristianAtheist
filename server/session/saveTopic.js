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
    // Get page context if modifying an topic from its slug page
    //   where path is no longer the page slug
    if (req.body.topic_id) {
      const page_result = await req.client.query(
        `
        SELECT slug
        FROM topics
        WHERE topic_id = (
          SELECT parent_topic_id
          FROM topics
          WHERE topic_id = $1
        )
        `,
        [req.body.topic_id],
      );
      req.body.path = "/" + page_result.rows[0].slug.toLowerCase();
    }

    // Always moderate based on page context
    const page = pages[req.body.path] || pages["/"];
    const messages = [];
    messages.push({
      role: "user",
      name: "Admin",
      content: page.title + "\n\n" + page.body,
    });

    messages.push({
      role: "user",
      name: (req.session.display_name || "Anonymous").replace(/[^a-z0-9_\-]/g, ""),
      content: [
        { type: "text", text: req.body.title + "\n\n" + req.body.body },
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
    if (ai_response_text === "OK") {
      const slug = req.body.title
        .replace(/[^a-z0-9 ]/gi, "")
        .replace(/ {1,}/g, "_");
      let topic_id = 0;
      // Update existing
      if (req.body.topic_id) {
        await req.client.query(
          `
          UPDATE topics
          SET
            title = $1,
            slug = $2,
            body = $3,
            create_date = NOW()
          WHERE
            topic_id = $4
            AND user_id = $5
          `,
          [
            req.body.title,
            slug,
            req.body.body,
            req.body.topic_id,
            req.session.user_id,
          ],
        );
        topic_id = req.body.topic_id;

        // Add new
      } else {
        const topic_result = await req.client.query(
          `
          INSERT INTO topics
            (title, slug, body, parent_topic_id, user_id)
          VALUES
            ($1, $2, $3, $4, $5)
          RETURNING topic_id;
          `,
          [
            req.body.title,
            slug,
            req.body.body,
            page.topic_id,
            req.session.user_id,
          ],
        );
        topic_id = topic_result.rows[0].topic_id;
      }

      // Remove existing images
      if (req.body.topic_id) {
        const existing_images = await req.client.query(
          `
          DELETE FROM topic_images
          WHERE topic_id = $1
          RETURNING image_uuid
          `,
          [topic_id],
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
            INSERT INTO topic_images
              (topic_id, image_uuid)
            VALUES
              ($1, $2)
            `,
            [topic_id, image_uuid],
          );
        }
      }

      // Send websocket update
      req.sendWsMessage("UPDATE", topic_id);

      // Respond with success so the client reloads
      res.end(
        JSON.stringify({
          success: true,
          slug,
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

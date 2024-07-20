const pages = require("../pages");

module.exports = async (req, res) => {
  if (!req.writableEnded && pages[req.results.path]) {
    const page = pages[req.results.path];
    if (!req.body.max_comment_create_date) {
      const topic_results = await req.client.query(
        `
        SELECT
          a.create_date,
          a.topic_id,
          a.title,
          a.slug,
          LEFT(a.body, 1000) as body,
          a.comment_count,
          a.comment_count_max_create_date,
          CASE WHEN a.user_id = $1 THEN true ELSE false END AS edit,
          STRING_AGG(DISTINCT i.image_uuid, ',') as image_uuids
        FROM topics a
        LEFT JOIN topic_images i ON a.topic_id = i.topic_id
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
          a.comment_count,
          a.comment_count_max_create_date,
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
    }
  
    // Get updated comment counts when requested
    if (
      req.body.min_topic_create_date_for_comment_count
      && req.body.min_comment_count_create_date
    ) {
      const topic_comment_counts = await req.client.query(
        `
        SELECT
          topic_id,
          comment_count
        FROM topics
        WHERE
          create_date > $1
          AND comment_count_max_create_date > $2
        `,
        [req.body.min_topic_create_date_for_comment_count, req.body.min_comment_count_create_date ]
      );
      req.results.topic_comment_counts = topic_comment_counts.rows;
    }

    
    // Comments for / only
    if (req.results.path === "/") {
      const root_comments = await req.client.query(
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
            AND c.parent_comment_id IS NULL
            AND (c.create_date > $3 OR $3 IS NULL)
            AND (c.create_date < $4 OR $4 IS NULL)
          GROUP BY
            c.create_date,
            c.comment_id,
            c.body,
            c.note,
            c.parent_comment_id,
            u.display_name,
            u.display_name_index,
            CASE WHEN c.user_id = $1 THEN true ELSE false END
          ORDER BY c.create_date DESC
          LIMIT 10
        `,
        [
          req.session.user_id || 0,
          page.topic_id,
          req.body.min_comment_create_date || null,
          req.body.max_comment_create_date || null,
        ],
      );
      const reply_comments = await req.client.query(
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
            AND c.comment_id IN (
              SELECT comment_id
              FROM comment_ancestors
              WHERE ancestor_id = ANY($3::int[])
            )
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
          root_comments.rows.map((c) => c.comment_id),
        ],
      );
      req.results.comments.push(...root_comments.rows);
      req.results.comments.push(...reply_comments.rows);
    }
  }
};

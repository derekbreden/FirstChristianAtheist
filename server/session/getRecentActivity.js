module.exports = async (req, res) => {
  if (!req.writableEnded && req.body.path === "/recent") {
    req.results.path = req.body.path;
    const activity_results = await req.client.query(
      `
      WITH combined AS (
        SELECT 
          a.topic_id AS id,
          a.create_date,
          a.title,
          LEFT(a.body, 1000) as body,
          a.note,
          a.slug,
          a.user_id,
          NULL AS parent_comment_id,
          NULL AS parent_topic_id,
          STRING_AGG(DISTINCT i.image_uuid, ',') as image_uuids,
          COUNT(DISTINCT c.comment_id) as comments,
          'topic' AS type
        FROM topics a
        LEFT JOIN topic_images i ON a.topic_id = i.topic_id
        LEFT JOIN comments c ON a.topic_id = c.parent_topic_id
        GROUP BY
          a.topic_id,
          a.create_date,
          a.title,
          LEFT(a.body, 1000),
          a.note,
          a.slug,
          a.user_id
        UNION ALL
        SELECT 
          c.comment_id AS id,
          c.create_date,
          NULL AS title,
          c.body,
          c.note,
          NULL as slug,
          c.user_id,
          c.parent_comment_id,
          c.parent_topic_id,
          STRING_AGG(i.image_uuid, ',') as image_uuids,
          NULL as comments,
          'comment' AS type
        FROM comments c
        LEFT JOIN comment_images i ON c.comment_id = i.comment_id
        GROUP BY
          c.comment_id,
          c.create_date,
          c.body,
          c.note,
          c.user_id,
          c.parent_comment_id,
          c.parent_topic_id
      )
      SELECT 
        combined.id,
        combined.create_date,
        combined.title,
        combined.body,
        combined.note,
        combined.slug,
        combined.type,
        combined.image_uuids,
        combined.comments,
        u.display_name,
        u.display_name_index,
        pa.title AS parent_topic_title,
        pa.slug AS parent_topic_slug,
        pc.body AS parent_comment_body,
        pc.note AS parent_comment_note,
        pcu.display_name AS parent_comment_display_name,
        pcu.display_name_index AS parent_comment_display_name_index
      FROM combined
      LEFT JOIN users u ON combined.user_id = u.user_id
      LEFT JOIN topics pa ON combined.parent_topic_id = pa.topic_id
      LEFT JOIN users pu ON pa.user_id = pu.user_id
      LEFT JOIN comments pc ON combined.parent_comment_id = pc.comment_id
      LEFT JOIN users pcu ON pc.user_id = pcu.user_id
      WHERE
        (combined.create_date < $1 OR $1 IS NULL)
        AND (combined.create_date > $2 OR $2 IS NULL)
      ORDER BY combined.create_date DESC
      LIMIT 30;
      `,
      [req.body.max_create_date || null, req.body.min_create_date || null],
    );
    req.results.activities.push(...activity_results.rows);
  }
};

module.exports = async (req, res) => {
  if (!req.writableEnded && req.body.path === "/recent") {
    req.results.path = req.body.path;
    const activity_results = await req.client.query(
      `
      WITH combined AS (
        SELECT 
          a.article_id AS id,
          a.create_date,
          a.title,
          LEFT(a.body, 1000) as body,
          a.note,
          a.slug,
          a.user_id,
          NULL AS parent_comment_id,
          NULL AS parent_article_id,
          STRING_AGG(i.image_uuid, ',') as image_uuids,
          'article' AS type
        FROM articles a
        LEFT JOIN article_images i ON a.article_id = i.article_id
        GROUP BY
          a.article_id,
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
          c.parent_article_id,
          NULL as image_uuids,
          'comment' AS type
        FROM comments c
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
        u.display_name,
        u.display_name_index,
        pa.title AS parent_article_title,
        pa.slug AS parent_article_slug,
        pc.body AS parent_comment_body,
        pc.note AS parent_comment_note,
        pcu.display_name AS parent_comment_display_name,
        pcu.display_name_index AS parent_comment_display_name_index
      FROM combined
      LEFT JOIN users u ON combined.user_id = u.user_id
      LEFT JOIN articles pa ON combined.parent_article_id = pa.article_id
      LEFT JOIN users pu ON pa.user_id = pu.user_id
      LEFT JOIN comments pc ON combined.parent_comment_id = pc.comment_id
      LEFT JOIN users pcu ON pc.user_id = pcu.user_id
      WHERE (combined.create_date < $1 OR $1 IS NULL)
      ORDER BY combined.create_date DESC
      LIMIT $2;
      `,
      [null, 50],
    );
    req.results.activities.push(...activity_results.rows);
  }
};

module.exports = async (req, res) => {
  if (!req.writableEnded && req.session.user_id) {
    // Updating an array of notification_ids that are read and seen
    if (req.body.mark_as_read) {
      await req.client.query(
        `
        UPDATE notifications
        SET read = TRUE, seen = TRUE
        WHERE notification_id = ANY($1::int[]) AND user_id = $2;
        `,
        [req.body.mark_as_read, req.session.user_id],
      );
      res.end(JSON.stringify({ success: true }));
    }

    // Update all notifications as read and seen
    if (req.body.mark_all_as_read) {
      await req.client.query(
        `
        UPDATE notifications
        SET read = TRUE, seen = TRUE
        WHERE user_id = $1;
        `,
        [req.session.user_id],
      );
      res.end(JSON.stringify({ success: true }));
    }

    // Updating an array of notification_ids that are seen
    if (req.body.mark_as_seen) {
      await req.client.query(
        `
        UPDATE notifications
        SET seen = TRUE
        WHERE notification_id = ANY($1::int[]) AND user_id = $2;
        `,
        [req.body.mark_as_seen, req.session.user_id],
      );
      res.end(JSON.stringify({ success: true }));
    }

    // Returning the unread_count
    if (req.body?.path === "/unread_count") {
      const unread_count = await req.client.query(
        `
        SELECT COUNT(*) AS unread_count
        FROM notifications
        WHERE user_id = $1 AND read = FALSE;;
        `,
        [req.session.user_id],
      );
      res.end(JSON.stringify({ unread_count: unread_count.rows[0].unread_count}));

      // Returning the complete notifications list
    } else if (req.body?.path === "/notifications") {
      req.results.path = "/notifications";
      const notifications_unread = await req.client.query(
        `
        SELECT
          n.notification_id,
          n.read,
          n.seen,
          n.create_date,
          u.display_name,
          u.display_name_index,
          c.comment_id,
          c.body,
          c.note,
          a.title,
          CASE
            WHEN c.parent_comment_id is NULL THEN 'article'
            ELSE 'comment'
          END AS reply_type
        FROM notifications n
        INNER JOIN comments c ON c.comment_id = n.comment_id
        INNER JOIN users u ON u.user_id = c.user_id
        INNER JOIN articles a ON a.article_id = c.parent_article_id
        WHERE
          n.user_id = $1
          AND read = FALSE
          AND (n.create_date < $2 OR $2 IS NULL)
          AND (c.create_date > $3 OR $3 IS NULL)
        ORDER BY n.create_date DESC
        LIMIT 20
        `,
        [
          req.session.user_id,
          req.body.max_notification_unread_create_date || null,
          req.body.min_notification_unread_create_date || null,
        ],
      );
      const notifications_read = await req.client.query(
        `
        SELECT
          n.notification_id,
          n.read,
          n.seen,
          n.create_date,
          u.display_name,
          u.display_name_index,
          c.comment_id,
          c.body,
          c.note,
          a.title,
          CASE
            WHEN c.parent_comment_id is NULL THEN 'article'
            ELSE 'comment'
          END AS reply_type
        FROM notifications n
        INNER JOIN comments c ON c.comment_id = n.comment_id
        INNER JOIN users u ON u.user_id = c.user_id
        INNER JOIN articles a ON a.article_id = c.parent_article_id
        WHERE
          n.user_id = $1
          AND read = TRUE
          AND (n.create_date < $2 OR $2 IS NULL)
          AND (c.create_date > $3 OR $3 IS NULL)
        ORDER BY n.create_date DESC
        LIMIT 20
        `,
        [
          req.session.user_id,
          req.body.max_notification_read_create_date || null,
          req.body.min_notification_read_create_date || null,
        ],
      );
      req.results.notifications = [
        ...notifications_unread.rows,
        ...notifications_read.rows,
      ];
    }
  }
};

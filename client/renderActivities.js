const renderActivities = (activities) => {
  $("activities").replaceChildren(
    ...activities.map((activity) => {
      if (activity.type === "comment") {
        const $comment = renderComment(activity);
        $comment.$("reply-wrapper")?.remove();
        let preamble = `${renderName(activity.display_name, activity.display_name_index)} commented on ${activity.parent_article_title}`;
        if (activity.parent_comment_display_name) {
          preamble = `${renderName(activity.display_name, activity.display_name_index)} replied to ${renderName(activity.parent_comment_display_name, activity.parent_comment_display_name_index)} on ${activity.parent_article_title}`;
        }
        let $comment_wrapper = $comment;
        if (activity.parent_comment_body) {
          const parent_comment = {
            display_name: activity.parent_comment_display_name,
            body: activity.parent_comment_body,
            note: activity.parent_comment_note,
          };
          const $parent_comment = renderComment(parent_comment);
          $parent_comment.setAttribute("parent-comment", "");
          $parent_comment.$("reply-wrapper")?.remove();
          $parent_comment.appendChild($comment);
          $comment_wrapper = $parent_comment;
        }
        const $activity = $(
          `
            activity
              h2 $1
              $2
          `,
          [preamble, $comment_wrapper],
        );
        $activity.on("click", ($event) => {
          $event.preventDefault();
          goToPath("/comment/" + activity.id);
        });
        return $activity;
      } else {
        const $article = renderArticle(activity);
        let preamble = `A new topic was posted`;
        const $activity = $(
          `
            activity
              h2 $1
              $2
          `,
          [preamble, $article],
        );
        return $activity;
      }
    }),
  );

  // Restore previous scroll position if tracked and returning to /recent
  if (state.recent_scroll_top && state.path === "/recent") {
    const body = document.scrollingElement || document.documentElement;
    body.scrollTop = state.recent_scroll_top;
    delete state.recent_scroll_top;
  }
};
const renderPage = (page_path, articles, comments, activities) => {

  // Update global state
  if (state.path !== page_path) {
    state.path = page_path;
    history.replaceState({}, "", page_path);
  }
  state.path_history.push(state.path);

  // Hide and show constant elements
  $("articles-loading").style.display = "none";
  $("articles").style.display = "flex";
  $("comments").style.display = "flex";
  $("activities").style.display = "flex";

  // Render Articles
  $("articles").replaceChildren(...articles.map(renderArticle));
  $("articles a")?.forEach(($a) => {
    const new_path = $a.getAttribute("href");
    if (new_path.substr(0, 1) === "/") {
      $a.on("click", ($event) => {
        $event.preventDefault();
        if (state.path !== new_path) {
          state.path = new_path;
          history.pushState({}, "", state.path);
          loadingPage();
        }
        startSession();
      });
    }
  });
  if (state.path === "/topics") {
    showAddNewArticle();
  }

  // Render Comments
  comments.forEach(renderComment);
  const $root_comments = comments
    .filter((c) => !c.parent_comment_id)
    .map((c) => c.$comment);
  comments.forEach((comment) => {
    if (comment.parent_comment_id) {
      const parent = comments.find(
        (c) => c.comment_id === comment.parent_comment_id,
      );

      // When all ancestors are an only child we act like a sibling instead of a child
      let ancestor = parent;
      let found_siblings = false;
      while (!found_siblings && ancestor.parent_comment_id) {
        const siblings = comments.filter(
          (c) =>
            c.parent_comment_id === ancestor.parent_comment_id &&
            c.comment_id !== ancestor.comment_id,
        );
        if (siblings.length === 0) {
          ancestor = comments.find(
            (c) => c.comment_id === ancestor.parent_comment_id,
          );
        } else {
          siblings.forEach((sibling) => {
            const $reply = sibling.$comment.$(
              ":scope > reply-wrapper [reply]",
            );
            $reply.setAttribute("alt", "");
            $reply.setAttribute("faint", "");
          });
          found_siblings = true;
        }
      }
      ancestor.$comment.appendChild(comment.$comment);
      const $reply = parent.$comment.$(":scope > reply-wrapper [reply]");
      $reply.setAttribute("alt", "");
      $reply.setAttribute("faint", "");
    }
  });
  $("comments").replaceChildren(...$root_comments);
  if (state.path !== "/recent") {
    showAddNewCommentButton();
  }

  // Render activities
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
          state.path = "/article/" + activity.parent_article_slug;
          if (activity.parent_article_slug === "Home") {
            state.path = "/";
          }
          if (activity.parent_article_slug === "Topics") {
            state.path = "/topics";
          }
          history.pushState({}, "", state.path);
          loadingPage();
          startSession();
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

  // Emit rendered event
  $("body").dispatchEvent(new CustomEvent("page-rendered"));
};
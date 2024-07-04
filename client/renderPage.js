const renderPage = (page_path, articles, comments, activities) => {

  // Update global state
  if (path !== page_path) {
    path = page_path;
    history.replaceState({}, "", page_path);
  }
  path_history.push(path);

  // Hide and show constant elements
  if (path !== "/recent") {
    $("[add-new-comment]").style.display = "flex";
  }
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
        if (path !== new_path) {
          path = new_path;
          history.pushState({}, "", path);
          loadingPage();
        }
        startSession();
      });
    }
  });
  if (path === "/topics") {
    showAddNewArticle();
  }

  // Render Comments
  const $comments = comments.map(renderComment);
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
          path = "/article/" + activity.parent_article_slug;
          if (activity.parent_article_slug === "Home") {
            path = "/";
          }
          if (activity.parent_article_slug === "Topics") {
            path = "/topics";
          }
          history.pushState({}, "", path);
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
};
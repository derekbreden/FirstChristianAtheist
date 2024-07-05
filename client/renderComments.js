const renderComments = (comments) => {
  // Creates a $comment element on each comment in the array
  comments.forEach(renderComment);

  // Attach the comment elements to each other in a hierarchy
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
            const $reply = sibling.$comment.$(":scope > reply-wrapper [reply]");
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

  // Identify the root comments (threads) to be displayed
  const $root_comments = comments
    .filter((c) => !c.parent_comment_id)
    .map((c) => c.$comment);

  // Collapse all the intermediates in each thread, if present
  $root_comments.forEach(($root_comment) => {
    const $child_comments = Array.from($root_comment.$("comment") || []);
    if ($child_comments.length > 1) {
      const $last_comment = $child_comments.pop();
      const $original_parent = $last_comment.parentElement;
      $root_comment.appendChild($last_comment);
      $child_comments.forEach(($child_comment) => {
        $child_comment.style.display = "none";
      });
      const $expand_button = $(
        `
        expand-wrapper
          button[expand-up]
          p $1
          button[expand-down]
        `,
        [`Show ${$child_comments.length} hidden comments`]
      );
      $expand_button.on("click", ($event) => {
        const original_rect = $last_comment.getBoundingClientRect();
        $expand_button.remove();

        // Bring all the collapsed nodes back and flash them
        $child_comments.forEach(($child_comment) => {
          $child_comment.style.display = "";
          $child_comment.setAttribute("flash-focus", "");
        });

        // Slightly shift the last element horizontally after that flash finishes
        setTimeout(() => {
          $original_parent.appendChild($last_comment);
        }, 500);

        // When they click down, keep focus on the last comment
        if ($event.target.hasAttribute("expand-down")) {
          const final_rect = $last_comment.getBoundingClientRect();
          const body = document.scrollingElement || document.documentElement;
          body.scrollTop = body.scrollTop + (final_rect.y - original_rect.y);
        }
      });
      $last_comment.before($expand_button);
    }
  });

  // Add each thread to the DOM
  $("comments").replaceChildren(...$root_comments);

  // Show add new comment button
  if (state.path !== "/recent" && state.path !== "/image") {
    showAddNewCommentButton();
  }
};

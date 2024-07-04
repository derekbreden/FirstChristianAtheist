const renderComments = (comments) => {
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
  if (state.path !== "/recent" && state.path !== "/image") {
    showAddNewCommentButton();
  }
};
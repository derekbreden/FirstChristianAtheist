const loadingPage = (first_render) => {
  $("[add-new-comment]")?.remove();
  if (!first_render) {
    $("main-content").appendChild(
      $(
        `
        topics-loading
          h2
          p
          p
        `,
      ),
    );
  }
  $("topics")?.remove();
  $("comments")?.remove();
  $("main-content activities")?.remove();
  $("main-content-2 activities")?.remove();
  $("notifications")?.remove();
  if (state.path === "/topics") {
    if (!state.active_add_new_topic?.is_root) {
      $("main-content > add-new:first-child")?.remove();
      $("main-content").prepend(showAddNewTopic());
    }
  } else {
    $("main-content > add-new:first-child")?.remove();
  }

  // Render Back Button
  renderBack();

  // Render Share Button on topic
  renderShare();
};

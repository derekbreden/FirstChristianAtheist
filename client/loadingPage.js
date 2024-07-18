const loadingPage = (first_render) => {
  $("[add-new-comment]")?.remove();
  if (!first_render) {
    $("topics-loading").style.display = "flex";
  }
  $("topics").style.display = "none";
  $("comments").style.display = "none";
  $("activities").style.display = "none";
  $("notifications").style.display = "none";
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

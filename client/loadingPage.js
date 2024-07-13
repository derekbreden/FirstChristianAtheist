const loadingPage = () => {
  $("[add-new-comment]")?.remove();
  $("articles-loading").style.display = "flex";
  $("articles").style.display = "none";
  $("comments").style.display = "none";
  $("activities").style.display = "none";
  $("notifications").style.display = "none";
  if (state.path === "/topics") {
    if (!state.active_add_new_article?.is_root) {
      $("main-content > add-new:first-child")?.remove();
      $("main-content").prepend(showAddNewArticle());
    }
  } else {
    $("main-content > add-new:first-child")?.remove();
  }

  // Render Back Button
  renderBack();
};

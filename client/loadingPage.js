const loadingPage = () => {
  $("[add-new-comment]")?.remove();
  $("articles-loading").style.display = "flex";
  $("articles").style.display = "none";
  $("comments").style.display = "none";
  $("activities").style.display = "none";
  if (state.path === "/topics") {
    showAddNewArticle();
  } else {
    $("main-content > add-new:first-child")?.remove();
  }

  // Render Back Button
  renderBack();
};

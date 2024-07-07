const renderArticles = (articles) => {
  $("articles").replaceChildren(...articles.map(renderArticle));
  $("articles a")?.forEach(($a) => {
    const new_path = $a.getAttribute("href");
    if (new_path.substr(0, 1) === "/") {
      $a.on("click", ($event) => {
        $event.preventDefault();
        goToPath(new_path);
      });
    }
  });
  if (state.path === "/topics") {
    showAddNewArticle();
  }

  // Restore previous scroll position if tracked and returning to /topcs
  if (state.topics_scroll_top && state.path === "/topics") {
    const body = document.scrollingElement || document.documentElement;
    body.scrollTop = state.topics_scroll_top;
    delete state.topics_scroll_top;
  }
};
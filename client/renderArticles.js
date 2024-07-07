const renderArticles = (articles) => {
  $("articles").replaceChildren(...articles.map(renderArticle));
  $("articles a")?.forEach(($a) => {
    const new_path = $a.getAttribute("href");
    if (new_path.substr(0, 1) === "/") {
      $a.on("click", ($event) => {
        $event.preventDefault();
        if (state.path !== new_path) {
          state.path = new_path;
          state.path_index++;
          history.pushState({path_index: state.path_index}, "", state.path);
          loadingPage();
        }
        startSession();
      });
    }
  });
  if (state.path === "/topics") {
    showAddNewArticle();
  }
};
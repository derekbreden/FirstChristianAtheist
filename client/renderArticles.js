const renderArticles = (articles) => {
  beforeDomUpdate();
  $("articles").replaceChildren(...articles.map(renderArticle));

  if (state.active_add_new_article?.is_edit) {
    const article = articles.find(
      (a) => a.article_id === state.active_add_new_article.is_edit,
    );
    article.$article.replaceWith(state.active_add_new_article);
  }
  afterDomUpdate();
  $("articles a")?.forEach(($a) => {
    const new_path = $a.getAttribute("href");
    if (new_path.substr(0, 1) === "/") {
      $a.on("click", ($event) => {
        $event.preventDefault();
        $event.stopPropagation();
        goToPath(new_path);
      });
    }
  });
};
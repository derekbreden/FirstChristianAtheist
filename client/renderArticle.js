const renderArticle = (article) => {
  let $article_body = markdownToElements(article.body);
  let characters_used = 0;
  let trimmed = false;
  if (state.path === "/topics" || state.path === "/recent") {
    article.edit = false;
    $article_body = $article_body.reduce((acc, child) => {
      characters_used += child.textContent.length;
      if (characters_used < 280) {
        acc.push(child);
      } else {
        trimmed = true;
      }
      return acc;
    }, []);
    if (trimmed) {
      $article_body.push(
        $(
          `
          p[ellipsis] ...
          button[alt][small] Read more
          `,
        ),
      );
    }
  }
  const $article = $(
    `
    article
      h2
        $1
        $2
      $3
    `,
    [
      article.title,
      article.edit
        ? $(
            `
            button[edit][small][alt][faint] Edit
            `,
            [],
          )
        : [],
      $article_body,
    ],
  );
  if (article.edit) {
    $article.$("[edit]").on("click", ($event) => {
      $event.preventDefault();
      showAddNewArticle(article, $article);
    });
  }
  if (state.path === "/topics" || state.path === "/recent") {
    $article.on("click", ($event) => {
      $event.preventDefault();
      state.path = "/article/" + article.slug;
      history.pushState({}, "", state.path);
      loadingPage();
      startSession();
    });
  }
  return $article;
};
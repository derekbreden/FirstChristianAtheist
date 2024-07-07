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
    $article_body.push(
      $(
        `
        expand-wrapper
          p Read more
          button[expand-down]
        `,
      ),
    );
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
  if (article.image_uuids) {
    const image_uuids = article.image_uuids.split(",").reverse();
    for (const image_uuid of image_uuids) {
      const $image = $(
        `
        p[img]
          img[src=$1]
        `,
        [ "/image/" + image_uuid]
      );
      $article.$("h2").after($image);
    }
  }
  if (state.path === "/topics" || state.path === "/recent") {
    $article.setAttribute("trimmed", "");
    $article.on("click", ($event) => {
      $event.preventDefault();
      goToPath("/article/" + article.slug);
    });
  }
  return $article;
};
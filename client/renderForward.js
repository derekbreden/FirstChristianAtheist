const renderForward = (parent_article) => {
  if (parent_article) {
    const $forward = $(
      `
      forward-wrapper
        p $1
        button[expand-right]
      `,
      [
        `Continue to ${parent_article.title}`,
      ],
    );
    $("back-forward-wrapper").appendChild($forward);
    $forward.on("click", () => {
      const new_path = `/article/${parent_article.slug}`;
      if (parent_article.slug === "Home") {
        new_path = "/";
      } else if (parent_article.slug === "Topics") {
        new_path = "/topics";
      }
      goToPath(new_path);
    });
  }
};
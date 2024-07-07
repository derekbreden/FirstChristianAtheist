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
      if (parent_article.slug === "Home") {
        state.path = "/";
      } else if (parent_article.slug === "Topics") {
        state.path = "/topics";
      } else {
        state.path = "/article/" + parent_article.slug;
      }
      history.pushState({}, "", state.path);
      loadingPage();
      startSession();
    });
  }
};
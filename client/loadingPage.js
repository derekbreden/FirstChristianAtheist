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
  if (state.path.substr(0, 8) === "/article") {
    const previous_path = state.path_history[state.path_history.length - 1];
    const $back = $(
      `
      back-wrapper
        button[expand-left]
        p $1
      `,
      [
        previous_path === "/topics"
          ? "Back to topics"
          : previous_path === "/recent"
            ? "Back to recent"
            : "Back to topics",
      ],
    );
    $("main-content").prepend($back);
    $back.on("click", () => {
      state.path_history = state.path_history.slice(0, -2);
      state.path = previous_path || "/topics";
      history.pushState({}, "", state.path);
      loadingPage();
      startSession();
    });
  } else {
    $("main-content back-wrapper")?.remove();
  }
};
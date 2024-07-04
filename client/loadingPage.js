const loadingPage = () => {
  $("[add-new-comment]").style.display = "none";
  $("articles-loading").style.display = "flex";
  $("articles").style.display = "none";
  $("comments").style.display = "none";
  $("activities").style.display = "none";
  if (path === "/topics") {
    showAddNewArticle();
  } else {
    $("main-content > add-new:first-child")?.remove();
  }
  if (path.substr(0, 8) === "/article") {
    const previous_path = path_history[path_history.length - 1];
    const $back = $(
      `
      back-wrapper
        button[back][small][alt] $1
      `,
      [
        previous_path === "/topics"
          ? "‹ Back to topics"
          : previous_path === "/recent"
            ? "‹ Back to recent activity"
            : "‹ Back to topics",
      ],
    );
    $("main-content").prepend($back);
    $back.on("click", () => {
      path_history = path_history.slice(0, -2);
      path = previous_path || "/topics";
      history.pushState({}, "", path);
      loadingPage();
      startSession();
    });
  } else {
    $("main-content back-wrapper")?.remove();
  }
};
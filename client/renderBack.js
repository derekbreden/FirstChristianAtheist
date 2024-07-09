const renderBack = () => {
  // Always remove previous wrapper
  $("main-content back-forward-wrapper")?.remove();

  // Sometimes add new wrapper
  if (
    state.path.substr(0, 8) === "/article" ||
    state.path.substr(0, 8) === "/comment"
  ) {
    const previous_path = state.path_history[state.path_history.length - 1];
    const $back_forward = $(
      `
      back-forward-wrapper
        back-wrapper
          button[expand-left]
          p $1
      `,
      [
        previous_path === "/topics"
          ? "Back to topics"
          : previous_path === "/recent"
            ? "Back to recent"
            : previous_path?.substr(0, 8) === "/comment"
              ? "Back to comment thread"
              : previous_path?.substr(0, 8) === "/article"
                ? "Back to article"
                : "Back to topics",
      ],
    );
    $("main-content").prepend($back_forward);
    $back_forward.$("back-wrapper").on("click", () => {
      state.path_index--;
      state.path_index--;
      state.path_history = state.path_history.slice(0, -2);
      goToPath(previous_path || "/topics");
    });
  }
};

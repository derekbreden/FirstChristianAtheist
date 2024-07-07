const goToPath = (new_path) => {
  if (state.path !== new_path) {
    // If navigating away from /recent and towards /comment or /article
    if (
      state.path === "/recent" &&
      (new_path.substr(0, 8) === "/comment" ||
        new_path.substr(0, 8) === "/article")
    ) {
      // Then track the current scroll position before navigating
      const body = document.scrollingElement || document.documentElement;
      state.recent_scroll_top = body.scrollTop;
    }

    // If navigating away from /topics and towards /article
    if (state.path === "/topics" && new_path.substr(0, 8) === "/article") {

      // Then track the current scroll position before navigating
      const body = document.scrollingElement || document.documentElement;
      state.topics_scroll_top = body.scrollTop;      
    }

    // Set the new path
    state.path = new_path;
    state.path_index++;
    history.pushState({ path_index: state.path_index }, "", state.path);
    loadingPage();
  }

  // Load the page
  startSession();
};

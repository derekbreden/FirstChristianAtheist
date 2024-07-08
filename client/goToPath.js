const goToPath = (new_path, skip_state) => {
  if (state.path !== new_path) {

    // Always track scroll position on cached paths
    if (state.cache[state.path]) {
      const body = document.scrollingElement || document.documentElement;
      state.cache[state.path].scroll_top = body.scrollTop;
    }

    // Set the new path
    state.path = new_path;
    if (!skip_state) {
      state.path_index++;
      history.pushState({ path_index: state.path_index }, "", state.path);
    }
    loadingPage();
  }

  // Load the page
  startSession();
};

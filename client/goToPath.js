const goToPath = (new_path, skip_state) => {
  if (state.path !== new_path) {

    // Cancel any open active comment or topic
    delete state.active_add_new_comment;
    delete state.active_add_new_topic;

    // Always track scroll position on cached paths
    if (state.cache[state.path]) {
      state.cache[state.path].scroll_top = $body.scrollTop;
    }

    // Set the new path
    state.path = new_path;
    if (!skip_state) {
      state.path_index++;
      history.pushState({ path_index: state.path_index }, "", state.path);
    }
    loadingPage();

    // Tell the websocket we are on a new path
    try {
      state.ws.send(JSON.stringify({ path: new_path }));
    } catch(e) {
      console.error(e);
    }
  }

  // Load the page
  startSession();
};

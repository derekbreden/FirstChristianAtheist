const goToPath = (new_path) => {
  if (state.path !== new_path) {
    state.path = new_path;
    state.path_index++;
    history.pushState({path_index: state.path_index}, "", state.path);
    loadingPage();
  }
  startSession();
};
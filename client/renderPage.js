const renderPage = (data) => {

  // Update global state
  if (state.path !== data.path) {
    state.path = data.path;
    history.replaceState({}, "", data.path);
  }
  state.path_history.push(state.path);

  // Hide and show constant elements
  $("articles-loading").style.display = "none";
  $("articles").style.display = "flex";
  $("comments").style.display = "flex";
  $("activities").style.display = "flex";

  // Render Articles
  renderArticles(data.articles);

  // Render Comments
  renderComments(data.comments);

  // Render Activities
  renderActivities(data.activities);

  // Render Images
  renderImages();

  // Emit rendered event
  $("body").dispatchEvent(new CustomEvent("page-rendered"));
};
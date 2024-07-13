const renderPage = (data) => {
  // Update global state
  if (state.path !== data.path) {
    state.path = data.path;
    history.replaceState({ path_index: state.path_index }, "", data.path);
  }
  state.path_history.push(state.path);

  // Hide and show constant elements
  $("articles-loading").style.display = "none";
  $("articles").style.display = "flex";
  $("comments").style.display = "flex";
  $("activities").style.display = "flex";
  if (state.path === "/notifications") {
    $("notifications").style.display = "flex";
  }

  // Render Articles
  renderArticles(data.articles);

  // Render Comments
  renderComments(data.comments);

  // Render Activities
  renderActivities(data.activities);

  // Render Notifications
  renderNotifications(data.notifications);

  // Render Images
  renderImages();

  // Render Forward Button on comment thread
  renderForward(data.parent_article);

  // Render Share Button on article
  renderShare();

  // Render Mark all as read on notifications
  renderMarkAllAsRead();

  // Emit rendered event
  $("body").dispatchEvent(new CustomEvent("page-rendered"));
};

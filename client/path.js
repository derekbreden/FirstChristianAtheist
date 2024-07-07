// Read URL into path
const parsePath = () => {
  let new_path = "/";
  const new_paths = window.location.pathname.split("/").filter((x) => x);
  if (new_paths[0] === "reset") {
    state.reset_token_uuid = new_paths[1] || "";
  } else if (new_paths[0] === "article" && new_paths[1]) {
    new_path = "/" + new_paths[0] + "/" + new_paths[1];
  } else if (new_paths[0] === "comment" && new_paths[1]) {
    new_path = "/" + new_paths[0] + "/" + new_paths[1];
  } else if (new_paths[0]) {
    new_path = "/" + new_paths[0];
  }
  return new_path;
}
state.path = parsePath();


// Update page contents when the user hits the back button
window.addEventListener("popstate", () => {
  const new_path = parsePath();
  if (state.path !== new_path) {
    state.path = new_path;
    loadingPage();
    startSession();
  }
});
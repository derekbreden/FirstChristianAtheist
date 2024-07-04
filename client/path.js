// Read URL into path
const paths = window.location.pathname.split("/").filter((x) => x);
if (paths[0] === "reset") {
  reset_token_uuid = paths[1] || "";
} else if (paths[0] === "article" && paths[1]) {
  path = "/" + paths[0] + "/" + paths[1];
} else if (paths[0]) {
  path = "/" + paths[0];
}

// Update page contents when the user hits the back button
window.addEventListener("popstate", () => {
  const new_paths = window.location.pathname.split("/").filter((x) => x);
  let new_path = "/";
  if (new_paths[0]) {
    new_path = "/" + new_paths[0];
  }
  if (path !== new_path) {
    path = new_path;
    loadingPage();
    startSession();
  }
});
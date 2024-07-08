// Workaround for replit Webview not supporting Set-Cookie
const original_fetch_2 = fetch;
fetch = function (url, options) {
  const session_uuid = localStorage.getItem("session_uuid");
  if (session_uuid) {
    options.headers = options.headers || {};
    options.headers["Authorization"] = `Bearer ${session_uuid}`;
  }
  return original_fetch_2(url, options);
};
// END Workaround

const startSession = () => {

  // If cache available, render from that first
  if (state.cache[state.path]) {
    renderPage(state.cache[state.path]);

    // Restore scroll position if found
    if (state.cache[state.path].scroll_top) {
      $body.scrollTop = state.cache[state.path].scroll_top;
      delete state.cache[state.path].scroll_top;
    }
    return;
  }

  // Otherwise, make a network call for the entire path results
  const postBody = {
    path: state.path,
  };
  if (state.reset_token_uuid) {
    postBody.reset_token_uuid = state.reset_token_uuid;
  }
  fetch("/session", {
    method: "POST",
    body: JSON.stringify(postBody),
  })
    .then((response) => response.json())
    .then(function (data) {

      // Workaround for replit Webview not supporting Set-Cookie
      if (data.session_uuid) {
        localStorage.setItem("session_uuid", data.session_uuid);
      }
      // END Workaround
      
      if (data.email) {
        state.email = data.email;
        if (state.reset_token_uuid) {
          showResetPassword();
        }
      }
      if (data.display_name) {
        state.display_name = data.display_name;
      }
      if (data.error) {
        modalError(data.error);
      }
      if (data.path) {
        state.cache[data.path] = data;
        renderPage(data);
      }
    })
    .catch(function (error) {
      debug(error);
    });
};
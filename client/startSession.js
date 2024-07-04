
const startSession = () => {
  const postBody = {
    session_uuid: state.session_uuid,
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
      state.session_uuid = data.session_uuid;
      localStorage.setItem("session_uuid", state.session_uuid);
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
        renderPage(data);
      }
    })
    .catch(function (error) {
      debug(error);
    });
};
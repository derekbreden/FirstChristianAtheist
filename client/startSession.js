
const startSession = () => {
  const postBody = {
    session_uuid,
    path,
  };
  if (reset_token_uuid) {
    postBody.reset_token_uuid = reset_token_uuid;
  }
  fetch("/session", {
    method: "POST",
    body: JSON.stringify(postBody),
  })
    .then((response) => response.json())
    .then(function (data) {
      session_uuid = data.session_uuid;
      localStorage.setItem("session_uuid", session_uuid);
      if (data.email) {
        signInSuccess(data.email);
        if (reset_token_uuid) {
          $("modal[password-reset]").style.display = "flex";
          $("modal-bg").style.display = "flex";
        }
      }
      if (data.display_name) {
        display_name = data.display_name;
      }
      if (data.error) {
        modalError(data.error);
      }
      if (data.path) {
        renderPage(
          data.path,
          data.articles,
          data.comments,
          data.activities,
        );
      }
    })
    .catch(function (error) {
      debug(error);
    });
};
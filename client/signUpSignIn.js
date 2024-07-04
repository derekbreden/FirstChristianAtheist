const signInError = (error) => {
  if (error) {
    $("sign-in error").style.display = "flex";
    $("sign-in error").innerHTML = error;
  } else {
    $("sign-in error").style.display = "none";
  }
};
const signInSuccess = (email) => {
  localStorage.setItem("email", email);
  $("sign-in").style.display = "none";
  $("signed-in").style.display = "flex";
};
$("sign-in [type=email]").on("focus", () => {
  signInError();
});
$("sign-in [type=password]").on("focus", () => {
  signInError();
});
$("sign-in [type=email]").on("keyup", (ev) => {
  if (ev.key === "Enter") {
    $("sign-in [submit]").click();
  }
});
$("sign-in [type=password]").on("keyup", (ev) => {
  if (ev.key === "Enter") {
    $("sign-in [submit]").click();
  }
});
$("sign-in [submit]").on("click", () => {
  signInError();
  const email = $("sign-in [type=email]").value;
  if (!$("sign-in [type=email]").checkValidity() || !email) {
    signInError("Please enter a valid email address");
    return;
  }
  const password = $("sign-in [type=password]").value;
  if (!password) {
    signInError("Please enter a password");
    return;
  }
  $("sign-in info").innerHTML = "Validating...";
  $("sign-in info").style.display = "flex";
  fetch("/session", {
    method: "POST",
    body: JSON.stringify({
      session_uuid,
      email,
      password,
    }),
  })
    .then((response) => response.json())
    .then(function (data) {
      $("sign-in info").style.display = "none";
      if (data.error || !data.success) {
        signInError(data.error || "Server error");
        return;
      }
      startSession();
      menuCancel();
    })
    .catch(function (error) {
      $("sign-in info").style.display = "none";
      signInError("Network error");
    });
});
$("signed-in button[sign-out]").on("click", () => {
  session_uuid = "";
  reset_token_uuid = "";
  startSession();
  $("sign-in").style.display = "flex";
  $("signed-in").style.display = "none";
});
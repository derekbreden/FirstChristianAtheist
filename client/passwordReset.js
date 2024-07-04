// Forgot Password
const passwordHelpCancel = () => {
  $("modal[password-help]").style.display = "none";
  $("modal-bg").style.display = "none";
  $("modal[password-help] error").style.display = "none";
  $("modal[password-help] [type=email]").value = "";
};
const passwordHelpError = (error) => {
  if (error) {
    $("modal[password-help] error").style.display = "flex";
    $("modal[password-help] error").innerHTML = error;
  } else {
    $("modal[password-help] error").style.display = "none";
  }
};
$("modal[password-help] [type=email]").on("focus", () => {
  passwordHelpError();
});
$("modal[password-help] [type=email]").on("keyup", (ev) => {
  if (ev.key === "Enter") {
    $("modal[password-help] [submit]").click();
  }
});
$("password-help").on("click", () => {
  menuCancel();
  $("modal-bg").style.display = "flex";
  $("modal[password-help]").style.display = "flex";
});
$("modal-bg").on("click", passwordHelpCancel);
$("modal[password-help] [cancel]").on("click", passwordHelpCancel);
$("modal[password-help] [submit]").on("click", () => {
  passwordHelpError();
  const email = $("modal[password-help] [type=email]").value;
  if (!$("modal[password-help] [type=email]").checkValidity() || !email) {
    passwordHelpError("Please enter a valid email address");
    return;
  }
  $("modal[password-help] info").innerHTML = "Validating...";
  $("modal[password-help] info").style.display = "flex";
  fetch("/session", {
    method: "POST",
    body: JSON.stringify({
      session_uuid,
      email,
    }),
  })
    .then((response) => response.json())
    .then(function (data) {
      $("modal[password-help] info").style.display = "none";
      if (data.error || !data.success) {
        passwordHelpError(data.error || "Server error");
        return;
      }
      passwordHelpCancel();
      modalInfo("An email was sent with password reset instructions.");
    })
    .catch(function (error) {
      $("modal[password-help] info").style.display = "none";
      passwordHelpError("Network error");
    });
});

// Resetting Password
const passwordResetCancel = () => {
  $("modal[password-reset]").style.display = "none";
  $("modal-bg").style.display = "none";
  $("modal[password-reset] error").style.display = "none";
  $("modal[password-reset] [type=password]").value = "";
  reset_token_uuid = "";
};
const passwordResetError = (error) => {
  if (error) {
    $("modal[password-reset] error").style.display = "flex";
    $("modal[password-reset] error").innerHTML = error;
  } else {
    $("modal[password-reset] error").style.display = "none";
  }
};
$("modal[password-reset] [type=password]").on("focus", () => {
  passwordResetError();
});
$("modal[password-reset] [type=password]").on("keyup", (ev) => {
  if (ev.key === "Enter") {
    $("modal[password-reset] [submit]").click();
  }
});
$("modal-bg").on("click", passwordResetCancel);
$("modal[password-reset] [cancel]").on("click", passwordResetCancel);
$("modal[password-reset] [submit]").on("click", () => {
  passwordResetError();
  const password = $("modal[password-reset] [type=password]").value;
  if (!password) {
    passwordResetError("Please enter a new password");
    return;
  }
  $("modal[password-reset] info").innerHTML = "Validating...";
  $("modal[password-reset] info").style.display = "flex";
  fetch("/session", {
    method: "POST",
    body: JSON.stringify({
      session_uuid,
      reset_token_uuid,
      password,
    }),
  })
    .then((response) => response.json())
    .then(function (data) {
      $("modal[password-reset] info").style.display = "none";
      if (data.error || !data.success) {
        passwordResetError(data.error || "Server error");
        return;
      }
      passwordResetCancel();
      modalInfo("Your password has been set");
    })
    .catch(function (error) {
      $("modal[password-reset] info").style.display = "none";
      passwordResetError("Network error");
    });
});
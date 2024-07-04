const showMenu = () => {
  const $menu = $(
    `
    modal-bg
    menu
      links
        a[href=/] Home
        a[href=/topics] Topics
        a[href=/recent] Recent activity
    `
  );
  const menuCancel = () => {
    $menu.remove();
  }
  $menu.$("modal-bg").on("click", menuCancel);

  $menu.$("links a").forEach(($el) => {
    $el.on("click", ($event) => {
      $event.preventDefault();
      menuCancel();
      const new_path = $el.getAttribute("href");
      if (state.path !== new_path) {
        state.path = new_path;
        history.pushState({}, "", state.path);
        loadingPage();
      }
      startSession();
    });
  });
  if (state.email) {
    const $signed_in = $(
      `
      signed-in
        button[sign-out] Log out
      `
    );
    $signed_in.$("[sign-out]").on("click", () => {
      menuCancel();
      state.email = "";
      state.session_uuid = "";
      state.reset_token_uuid = "";
      startSession();
    });
    $menu.$("menu").appendChild($signed_in);
  } else {
    const $sign_in = $(
      `
      sign-in
        input[type=email][placeholder=Email][autocomplete=email][maxlength=255]
        password-wrapper
          input[type=password][placeholder=Password][autocomplete=current-password][maxlength=255]
          password-help
        button[submit] Sign up / Sign in
        button[alt][cancel] Cancel
      `
    );
    $sign_in.$("password-help").on("click", () => {
      menuCancel();
      showForgotPassword();
    });
    $sign_in.$("[cancel]").on("click", menuCancel);
    const signInError = (error) => {
      $sign_in.appendChild(
        $(
          `
          error[show]
            $1
          `,
          [error],
        ),
      );
    };
    $sign_in.$("[type=email]").on("focus", () => {
      $sign_in.$("error")?.remove();
    });
    $sign_in.$("[type=password]").on("focus", () => {
      $sign_in.$("error")?.remove();
    });
    $sign_in.$("[type=email]").on("keyup", (ev) => {
      if (ev.key === "Enter") {
        $sign_in.$("[submit]").click();
      }
    });
    $sign_in.$("[type=password]").on("keyup", (ev) => {
      if (ev.key === "Enter") {
        $sign_in.$("[submit]").click();
      }
    });
    $sign_in.$("[submit]").on("click", () => {
      $sign_in.$("error")?.remove();
      const email = $sign_in.$("[type=email]").value;
      if (!$sign_in.$("[type=email]").checkValidity() || !email) {
        signInError("Please enter a valid email address");
        return;
      }
      const password = $sign_in.$("[type=password]").value;
      if (!password) {
        signInError("Please enter a password");
        return;
      }
      $sign_in.appendChild($(
        `
        info[show] Validating...
        `
      ));
      fetch("/session", {
        method: "POST",
        body: JSON.stringify({
          session_uuid: state.session_uuid,
          email,
          password,
        }),
      })
        .then((response) => response.json())
        .then(function (data) {
          $sign_in.$("info")?.remove();
          if (data.error || !data.success) {
            signInError(data.error || "Server error");
            return;
          }
          state.email = email;
          startSession();
          menuCancel();
        })
        .catch(function (error) {
          $sign_in.$("info")?.remove();
          signInError("Network error");
        });
    });
    $menu.$("menu").appendChild($sign_in);
  }
  $("body").appendChild($menu);
}
$("header hamburger").on("click", () => {
  showMenu();
});
$("h1").forEach(($el) => {
  $el.on("click", ($event) => {
    $event.preventDefault();
    const new_path = $el.getAttribute("href");
    if (state.path !== new_path) {
      state.path = new_path;
      history.pushState({}, "", state.path);
      loadingPage();
    }
    startSession();
  });
});
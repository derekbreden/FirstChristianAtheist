const showMenu = () => {
  const $menu = $(
    `
    modal-bg
    menu
      links
        a[href=/] Home
        a[href=/topics] Topics
        a[href=/recent] Recent
    `,
  );
  const menuCancel = () => {
    $menu.remove();
  };
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
      `,
    );
    $signed_in.$("[sign-out]").on("click", () => {
      $signed_in.$("[sign-out]").setAttribute("disabled", "");
      state.email = "";
      state.reset_token_uuid = "";

      // Workaround for replit Webview not supporting Set-Cookie
      localStorage.removeItem("session_uuid");
      // END Workaround

      // Tell server to clear the cookie and set a new one
      fetch("/session", {
        method: "POST",
        body: JSON.stringify({
          logout: true,
        }),
      })
        .then((response) => response.json())
        .then(function (data) {
          startSession();
          menuCancel();
        });
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
      `,
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
      $sign_in.appendChild(
        $(
          `
        info[show] Validating...
        `,
        ),
      );
      $sign_in.$("[type=email]").setAttribute("disabled", "");
      $sign_in.$("[type=password]").setAttribute("disabled", "");
      $sign_in.$("[submit]").setAttribute("disabled", "");
      $sign_in.$("[cancel]").setAttribute("disabled", "");
      fetch("/session", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      })
        .then((response) => response.json())
        .then(function (data) {
          $sign_in.$("info")?.remove();
          if (data.error || !data.success) {
            $sign_in.$("[type=email]").removeAttribute("disabled");
            $sign_in.$("[type=password]").removeAttribute("disabled");
            $sign_in.$("[submit]").removeAttribute("disabled");
            $sign_in.$("[cancel]").removeAttribute("disabled");
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
};
$("hamburger").forEach(($el) => {
  $el.on("click", () => {
    showMenu();
  });
});
$("[href]").forEach(($el) => {
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

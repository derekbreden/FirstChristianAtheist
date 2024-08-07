const showMenu = () => {
  const $menu = $(
    `
    menu-wrapper
      modal-bg
      menu
        links
          a[href=/] Introduction
          a[href=/topics] Topics
          a[href=/recent] Recent
    `,
  );
  if (state.push_active || state.fcm_push_active) {
    $menu.$("links").appendChild(
      $(
        `
        a[href=/notifications][unread=$1] $2
        `,
        [
          Boolean(state.unread_count),
          state.unread_count
            ? `Notifications (${state.unread_count})`
            : "Notifications",
        ],
      ),
    );
  }
  const menuCancel = () => {
    $menu.remove();
  };
  $menu.$("modal-bg").on("click", menuCancel);

  $menu.$("links a").forEach(($el) => {
    $el.on("click", ($event) => {
      $event.preventDefault();
      menuCancel();
      goToPath($el.getAttribute("href"));
    });
  });
  if (state.email) {
    const $remove_account = $(
      `
        a[href=/] Remove account
      `,
    );
    $remove_account.on("click", ($event) => {
      $event.preventDefault();
      menuCancel();
      const $modal = $(
        `
        modal-wrapper
          modal[info]
            error
              b Warning
              p This will permanently remove your account. This action cannot be undone.
            p Everything you posted will be deleted:
            ul
              li Comments
              li Topics
              li Images
              li Display name
            p Tap remove to confirm.
            button-wrapper
              button[remove] Remove
              button[alt][cancel] Cancel
          modal-bg
        `,
      );
      const modalCancel = () => {
        $modal.remove();
      };
      $modal.$("[remove]").on("click", () => {
        modalCancel();
        modalInfo("Removing account...");
        fetch("/session", {
          method: "POST",
          body: JSON.stringify({
            remove_account: true,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (!data || !data.success) {
              modalError("Server error removing account");
            } else {
              $("modal-wrapper")?.remove();
              modalInfo("Account removed");
              state.email = "";
              state.reset_token_uuid = "";
              localStorage.removeItem("session_uuid");
              state.cache = {};
              cacheIntroduction();
              goToPath("/");
            }
          })
          .catch((error) => {
            modalError("Network error removing account");
          });
      });
      $modal.$("[cancel]").on("click", modalCancel);
      $modal.$("modal-bg").on("click", modalCancel);
      $("modal-wrapper")?.remove();
      $("body").appendChild($modal);
    });
    $menu.$("links").appendChild($remove_account);
    const $signed_in = $(
      `
      signed-in
        toggle-wrapper[disabled=$1][active=$2]
          toggle-text Subscribe to replies
          toggle-button
            toggle-circle
        button[sign-out] Log out
      `,
      [
        !state.push_available && !state.fcm_push_available,
        state.push_active || state.fcm_push_active,
      ],
    );
    $signed_in.$("toggle-wrapper").on("click", () => {
      if (state.push_active) {
        state.push_active = false;
        $("toggle-wrapper").removeAttribute("active");
        navigator.serviceWorker.ready
          .then((registration) => {
            return registration.pushManager.getSubscription();
          })
          .then((subscription) => {
            subscription.unsubscribe();
            fetch("/session", {
              method: "POST",
              body: JSON.stringify({
                remove: true,
                subscription,
              }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (!data || !data.success) {
                  modalError("Server error saving subscription");
                }
              })
              .catch((error) => {
                modalError("Network error saving subscription");
              });
          });
        return;
      }
      if (state.fcm_push_active) {
        state.fcm_push_active = false;
        $("toggle-wrapper").removeAttribute("active");
        fetch("/session", {
          method: "POST",
          body: JSON.stringify({
            fcm_subscription: state.fcm_token,
            deactivate: true,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (!data || !data.success) {
              modalError("Server error saving subscription");
            }
          })
          .catch(() => {
            modalError("Network error saving subscription");
          });
        return;
      }
      if (state.fcm_push_available) {
        state.fcm_push_active = true;
        getUnreadCountUnseenCount();
        $("toggle-wrapper").setAttribute("active", "");
        if (state.fcm_token) {
          fetch("/session", {
            method: "POST",
            body: JSON.stringify({
              fcm_subscription: state.fcm_token,
              reactivate: true,
            }),
          })
            .then((response) => response.json())
            .then((data) => {
              if (!data || !data.success) {
                modalError("Server error saving subscription");
              }
            })
            .catch(() => {
              modalError("Network error saving subscription");
            });
        }
        window.webkit.messageHandlers["push-permission-request"].postMessage(
          "push-permission-request",
        );
      } else if (state.push_available) {
        state.push_active = true;
        $("toggle-wrapper").setAttribute("active", "");
        navigator.serviceWorker.ready
          .then(async (registration) => {
            registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: (function () {
                const raw = window.atob(
                  "BNu3qAqkBwD0A5AbY1XP/mPlbGXkI6qdL57O+tchgT3Wl4YWAQt5w+/eQTgGBctvoTmFGJlRQkRnYYiX+NyCH04=",
                );
                const array = new Uint8Array(new ArrayBuffer(raw.length));
                for (let i = 0; i < raw.length; i++) {
                  array[i] = raw.charCodeAt(i);
                }
                return array;
              })(),
            });
            let retries = 0;
            const check_for_success = () => {
              registration.pushManager
                .getSubscription()
                .then((subscription) => {
                  fetch("/session", {
                    method: "POST",
                    body: JSON.stringify({
                      subscription,
                    }),
                  })
                    .then((response) => response.json())
                    .then((data) => {
                      if (!data || !data.success) {
                        if (retries < 20) {
                          retries++;
                          setTimeout(check_for_success, retries * 1000);
                        } else {
                          modalError("Server error saving subscription");
                          state.push_active = false;
                          $("toggle-wrapper").removeAttribute("active");
                          subscription.unsubscribe();
                        }
                      }
                    })
                    .catch(() => {
                      if (retries < 20) {
                        retries++;
                        setTimeout(check_for_success, retries * 1000);
                      } else {
                        modalError("Error enabling notifications");
                        state.push_active = false;
                        $("toggle-wrapper").removeAttribute("active");
                        subscription.unsubscribe();
                      }
                    });
                });
            };
            setTimeout(check_for_success, 1000);
          })
          .catch(() => {
            modalError("Subscription error");
            state.push_active = false;
            $("toggle-wrapper").removeAttribute("active");
          });
      } else {
        menuCancel();
        if (state.fcm_push_denied) {
          modalError(`You must enable notifications in settings.`);
        } else {
          modalError(`You must "Add to Home Screen" to enable notifications.`);
        }
      }
    });
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
          state.cache = {};
          cacheIntroduction();
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
          state.cache = {};
          cacheIntroduction();
          startSession();
          menuCancel();
          if (data.signed_in) {
            modalInfo("You have been signed in to your existing account")
          } else if (data.created_account) {
            modalInfo("You have created a new account")
          }
        })
        .catch(function (error) {
          $sign_in.$("info")?.remove();
          signInError("Network error");
        });
    });
    $menu.$("menu").appendChild($sign_in);
  }
  $("modal-bg")?.parentElement?.remove();
  $("body").appendChild($menu);
};
$("hamburger").forEach(($el) => {
  $el.on("click", () => {
    if ($("menu-wrapper")) {
      $("menu-wrapper").remove();
    } else {
      showMenu();
    }
  });
});
$("[href]").forEach(($el) => {
  $el.on("click", ($event) => {
    $("menu-wrapper")?.remove();
    $event.preventDefault();
    goToPath($el.getAttribute("href"));
  });
});

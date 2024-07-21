if (navigator.serviceWorker) {
  navigator.serviceWorker
    .register("/worker.js?v=11")
    .then((registration) => {
      // Listen for push updates
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.push_update) {
          if (state.push_active) {
            getUnreadCountUnseenCount();
          }
        }
      });

      if (registration.pushManager) {
        return registration.pushManager.getSubscription();
      } else {
        return Promise.reject("Push not supported");
      }
    })
    .then((subscription) => {
      state.push_available = true;
      if (subscription) {
        state.push_active = true;
        getUnreadCountUnseenCount();
        fetch("/session", {
          method: "POST",
          body: JSON.stringify({
            subscription,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (!data || !data.success) {
              modalError("Server error saving subscription");
              state.push_active = false;
              subscription.unsubscribe();
            }
          })
          .catch(() => {
            modalError("Network error saving subscription");
            state.push_active = false;
            subscription.unsubscribe();
          });
      } else {
        state.push_active = false;
      }
    })
    .catch(() => {
      state.push_available = false;
      state.push_active = false;
    });
} else {
  state.push_available = false;
  state.push_active = false;
}

if (
  window.webkit &&
  window.webkit.messageHandlers &&
  window.webkit.messageHandlers["push-permission-request"] &&
  window.webkit.messageHandlers["push-permission-state"]
) {
  state.fcm_push_available = true;
  window.addEventListener("push-permission-state", ($event) => {
    if ($event && $event.detail) {
      switch ($event.detail) {
        case "notDetermined":
          // permission not asked
          state.fcm_push_active = false;
          break;
        case "denied":
          // permission denied
          state.fcm_push_denied = true;
          state.fcm_push_available = false;
          state.fcm_push_active = false;
          break;
        case "authorized":
        case "ephemeral":
        case "provisional":
          // permission granted
          state.fcm_push_active = true;
          window.webkit.messageHandlers["push-token"].postMessage("push-token");
          break;
        case "unknown":
        default:
          // something wrong
          state.fcm_push_denied = true;
          state.fcm_push_available = false;
          state.fcm_push_active = false;
          break;
      }
    }
  });
  window.webkit.messageHandlers["push-permission-state"].postMessage(
    "push-permission-state",
  );
  window.addEventListener("push-token", ($event) => {
    if ($event && $event.detail && !$event.detail.startsWith("ERROR")) {
      getUnreadCountUnseenCount();
      fetch("/session", {
        method: "POST",
        body: JSON.stringify({
          fcm_subscription: $event.detail,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (!data || !data.success) {
            modalError("Server error saving subscription");
            state.fcm_push_active = false;
          }
        })
        .catch(() => {
          modalError("Network error saving subscription");
          state.fcm_push_active = false;
        });
    } else {
      debug($event);
    }
  });
} else {
  state.fcm_push_available = false;
  state.fcm_push_active = false;
}

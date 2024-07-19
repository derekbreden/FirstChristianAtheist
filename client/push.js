if (navigator.serviceWorker) {
  navigator.serviceWorker
    .register("/worker.js?v=11")
    .then((registration) => {

      // Listen for push updates
      navigator.serviceWorker.addEventListener('message', event => {
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

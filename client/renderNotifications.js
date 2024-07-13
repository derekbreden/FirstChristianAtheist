const renderNotification = (notification) => {
  const short_body =
    notification.body.length > 50
      ? notification.body.substr(0, 50) + "..."
      : notification.body;
  const short_title =
    notification.title.length > 20
      ? notification.title.substr(0, 20) + "..."
      : notification.title;

  const reply_text =
    notification.reply_type === "comment"
      ? "to your comment on"
      : "to your topic";
  const text = `${renderName(notification.display_name, notification.display_name_index)} replied ${short_body} ${reply_text} ${short_title}`;

  const $notification = $(
    `
    notification[unread=$1]
      summary $2
      read-more-wrapper
        p Read more
        button[expand-right]
    `,
    [!notification.read, text],
  );
  $notification.on("click", () => {
    goToPath("/comment/" + notification.comment_id);

    // Mark as read
    if (!notification.read) {
      markAsRead(notification.notification_id);
    }
  });
  notification.$notification = $notification;
  return $notification;
};

const renderNotifications = (notifications) => {
  const unread_notifications = notifications.filter((n) => !n.read);
  const read_notifications = notifications.filter((n) => n.read);
  const $unread_header = $(
    `
    h3[unread=$1] $2
    `,
    [
      Boolean(state.unread_count),
      state.unread_count ? `Unread (${state.unread_count})` : "Unread",
    ],
  );
  const $read_header = $(
    `
    h3 Read
    `,
  );
  let $unread_allclear = [];
  if (!state.unread_count) {
    $unread_allclear = [
      $(
        `
      all-clear-wrapper
        p All clear
      `,
      ),
    ];
  }
  let $read_allclear = [];
  if (!read_notifications.length) {
    $read_allclear = [
      $(
        `
      all-clear-wrapper
        p All clear
      `,
      ),
    ];
  }
  $("notifications").replaceChildren(
    ...[$unread_header],
    ...$unread_allclear,
    ...unread_notifications.map(renderNotification),
    ...[$read_header],
    ...$read_allclear,
    ...read_notifications.map(renderNotification),
  );

  // On notifications render, mark all as seen
  if (state.unseen_count && notifications.length) {
    fetch("/session", {
      method: "POST",
      body: JSON.stringify({
        mark_all_as_seen: true,
      }),
    })
      .then((response) => response.json())
      .then(function (data) {
        if (!data || !data.success) {
          modalError("Server error");
          console.error(data);
        } else {
          state.unseen_count = 0;
          getUnreadCountUnseenCount();
        }
      })
      .catch(function (error) {
        modalError("Network error");
        console.error(error);
      });
  }
};

const getUnreadCountUnseenCount = () => {
  fetch("/session", {
    method: "POST",
    body: JSON.stringify({
      path: "/unread_count_unseen_count",
    }),
  })
    .then((response) => response.json())
    .then(function (data) {
      // will be "0" so not falsey if we are golden
      if (!data || !data.unread_count || !data.unseen_count) {
        modalError("Server error");
        console.error(data);
      } else {
        state.unread_count = Number(data.unread_count);
        state.unseen_count = Number(data.unseen_count);
        navigator.setAppBadge(state.unread_count);
        if (Boolean(state.unread_count)) {
          $("hamburger").setAttribute("unread", "");
        } else {
          $("hamburger").removeAttribute("unread");
        }
        if (
          state.unseen_count &&
          (state.window_recently_focused || state.window_recently_loaded)
        ) {
          // When exactly one, just go to the comment
          if (
            state.unseen_count === 1 &&
            data.comment_id &&
            data.notification_id
          ) {
            goToPath("/comment/" + data.comment_id);
            markAsRead(data.notification_id);

            // Otherwise load the list of notifications
          } else {
            goToPath("/notifications");
          }
        }
      }
    })
    .catch(function (error) {
      modalError("Network error");
      console.error(error);
    });
};

const markAsRead = (notification_id) => {
  fetch("/session", {
    method: "POST",
    body: JSON.stringify({
      mark_as_read: [notification_id],
    }),
  })
    .then((response) => response.json())
    .then(function (data) {
      if (!data || !data.success) {
        modalError("Server error");
        console.error(data);
      } else {
        // Update cache for this item
        const notification = state.cache["/notifications"]?.notifications?.find(
          (n) => n.notification_id === notification_id,
        );
        if (notification) {
          notification.read = true;
          notification.seen = true;
        }

        // Ensure counts are accurate as well
        getUnreadCountUnseenCount();
      }
    })
    .catch(function (error) {
      modalError("Network error");
      console.error(error);
    });
};

window.addEventListener("focus", () => {
  state.window_recently_focused = true;
  setTimeout(() => {
    state.window_recently_focused = false;
  }, 5000);
  getMoreRecent();
  if (state.push_active) {
    getUnreadCountUnseenCount();
  }
});
window.addEventListener("load", () => {
  state.window_recently_loaded = true;
  setTimeout(() => {
    state.window_recently_loaded = false;
  }, 5000);
});

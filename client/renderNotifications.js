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
    notification
      summary $1
      read-more-wrapper
        p Read more
        button[expand-right]
    `,
    [text],
  );
  $notification.on("click", () => {
    goToPath("/comment/" + notification.comment_id);

    // Mark as read and seen
    if (!notification.read) {
      fetch("/session", {
        method: "POST",
        body: JSON.stringify({
          mark_as_read: [notification.notification_id],
        }),
      })
        .then((response) => response.json())
        .then(function (data) {
          if (!data || !data.success) {
            modalError("Server error");
            console.error(data);
          } else {
            notification.read = true;
            notification.seen = true;
            getUnreadCount();
          }
        })
        .catch(function (error) {
          modalError("Network error");
          console.error(error);
        });
    }
  });
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
};

const getUnreadCount = () => {
  fetch("/session", {
    method: "POST",
    body: JSON.stringify({
      path: "/unread_count",
    }),
  })
    .then((response) => response.json())
    .then(function (data) {
      if (!data || !data.unread_count) {
        // will be "0" so not falsey if we are golden
        modalError("Server error");
        console.error(data);
      } else {
        state.unread_count = Number(data.unread_count);
      }
    })
    .catch(function (error) {
      modalError("Network error");
      console.error(error);
    });
};

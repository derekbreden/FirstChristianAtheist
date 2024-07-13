document.addEventListener("scroll", () => {
  // Never do anything if already loading something
  if (state.loading_path) {
    return;
  }

  // Recent load older
  if (
    state.path === "/recent" &&
    state.cache["/recent"] &&
    !state.cache["/recent"].finished
  ) {
    // A threshold based on how much is left to scroll
    const threshold = $body.scrollHeight - $body.clientHeight * 3;

    // When we pass the threshold
    if ($body.scrollTop > threshold) {
      // Find the oldest (min) create_date of what we have so far
      const max_create_date = state.cache["/recent"].activities.reduce(
        (min, activity) => {
          return min < activity.create_date ? min : activity.create_date;
        },
        new Date().toISOString(),
      );

      // Use that to load anything older than that (our min is the max of what we want returned)
      state.loading_path = true;
      fetch("/session", {
        method: "POST",
        body: JSON.stringify({
          path: "/recent",
          max_create_date,
        }),
      })
        .then((response) => response.json())
        .then(function (data) {
          // Stop when we reach the end (no more results returned)
          if (data.activities && !data.activities.length) {
            state.cache["/recent"].finished = true;
          }

          // Append what we found to the existing cache
          state.cache["/recent"].activities.push(...data.activities);

          // And re-render
          renderActivities(state.cache["/recent"].activities);
          state.loading_path = false;
        })
        .catch(function (error) {
          state.loading_path = false;
          debug(error);
        });
    }
  }


  // Topics load older
  if (
    state.path === "/topics" &&
    state.cache["/topics"] &&
    !state.cache["/topics"].finished
  ) {
    // A threshold based on how much is left to scroll
    const threshold = $body.scrollHeight - $body.clientHeight * 3;

    // When we pass the threshold
    if ($body.scrollTop > threshold) {
      // Find the oldest (min) create_date of what we have so far
      const max_article_create_date = state.cache["/topics"].articles.reduce(
        (min, article) => {
          return min < article.create_date ? min : article.create_date;
        },
        new Date().toISOString(),
      );

      // Use that to load anything older than that (our min is the max of what we want returned)
      state.loading_path = true;
      fetch("/session", {
        method: "POST",
        body: JSON.stringify({
          path: "/topics",
          max_article_create_date,
        }),
      })
        .then((response) => response.json())
        .then(function (data) {
          // Stop when we reach the end (no more results returned)
          if (data.articles && !data.articles.length) {
            state.cache["/topics"].finished = true;
          }

          // Append what we found to the existing cache
          state.cache["/topics"].articles.push(...data.articles);

          // And re-render
          renderArticles(state.cache["/topics"].articles);
          state.loading_path = false;
        })
        .catch(function (error) {
          state.loading_path = false;
          debug(error);
        });
    }
  }



  // Notifications load older
  if (
    state.path === "/notifications" &&
    state.cache["/notifications"] &&
    !state.cache["/notifications"].finished
  ) {
    // A threshold based on how much is left to scroll
    const threshold = $body.scrollHeight - $body.clientHeight * 3;

    // When we pass the threshold
    if ($body.scrollTop > threshold) {
      // Find the oldest (min) create_date of what we have so far
      const max_notification_unread_create_date = state.cache["/notifications"].notifications.reduce(
        (min, notification) => {
          if (!notification.read) {
            return min < notification.create_date ? min : notification.create_date;
          } else {
            return min;
          }
        },
        new Date().toISOString(),
      );
      const max_notification_read_create_date = state.cache["/notifications"].notifications.reduce(
        (min, notification) => {
          if (notification.read) {
            return min < notification.create_date ? min : notification.create_date;
          } else {
            return min;
          }
        },
        new Date().toISOString(),
      );

      // Use that to load anything older than that (our min is the max of what we want returned)
      state.loading_path = true;
      fetch("/session", {
        method: "POST",
        body: JSON.stringify({
          path: "/notifications",
          max_notification_unread_create_date,
          max_notification_read_create_date,
        }),
      })
        .then((response) => response.json())
        .then(function (data) {
          // Stop when we reach the end (no more results returned)
          if (data.notifications && !data.notifications.length) {
            state.cache["/notifications"].finished = true;
          }

          // Append what we found to the existing cache
          state.cache["/notifications"].notifications.push(...data.notifications);

          // And re-render
          renderNotifications(state.cache["/notifications"].notifications);
          state.loading_path = false;
        })
        .catch(function (error) {
          state.loading_path = false;
          debug(error);
        });
    }
  }

  
});

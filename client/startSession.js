// Workaround for replit Webview not supporting Set-Cookie
const original_fetch_2 = fetch;
fetch = function (url, options) {
  const session_uuid = localStorage.getItem("session_uuid");
  if (session_uuid) {
    options.headers = options.headers || {};
    options.headers["Authorization"] = `Bearer ${session_uuid}`;
  }
  return original_fetch_2(url, options);
};
// END Workaround

const startSession = () => {
  // If cache available, render from that first
  if (state.cache[state.path]) {
    renderPage(state.cache[state.path]);

    // Restore scroll position if found
    if (state.cache[state.path].scroll_top) {
      $body.scrollTop = state.cache[state.path].scroll_top;
      delete state.cache[state.path].scroll_top;
    } else {
      $body.scrollTop = 0;
    }

    // Get more recent if available
    getMoreRecent();
    return;
  }

  // Otherwise, make a network call for the entire path results
  const postBody = {
    path: state.path,
  };
  if (state.reset_token_uuid) {
    postBody.reset_token_uuid = state.reset_token_uuid;
  }
  state.loading_path = true;
  fetch("/session", {
    method: "POST",
    body: JSON.stringify(postBody),
  })
    .then((response) => response.json())
    .then(function (data) {
      // Workaround for replit Webview not supporting Set-Cookie
      if (data.session_uuid) {
        localStorage.setItem("session_uuid", data.session_uuid);
      }
      // END Workaround

      if (data.email) {
        state.email = data.email;
        if (state.reset_token_uuid) {
          showResetPassword();
        }
      }
      if (data.display_name) {
        state.display_name = data.display_name;
      }
      if (data.error) {
        modalError(data.error);
      }
      if (data.path) {
        state.cache[data.path] = data;
        renderPage(data);
      }
      state.loading_path = false;
    })
    .catch(function (error) {
      state.loading_path = false;
      debug(error);
    });
};

const getMoreRecent = () => {
  // Stop if cache not loaded
  if (!state.cache[state.path]) {
    return;
  }

  // Stop if already loading
  if (state.loading_path) {
    return;
  }

  // Track what path and cache we started with
  const current_path = state.path;
  const current_cache = state.cache[current_path];

  // Find the newest (max) create_date of what we have so far
  const min_create_date = current_cache.activities.reduce((max, activity) => {
    return max > activity.create_date ? max : activity.create_date;
  }, "");
  const min_comment_create_date = current_cache.comments.reduce(
    (max, comment) => {
      return max > comment.create_date ? max : comment.create_date;
    },
    "",
  );
  const min_article_create_date = current_cache.articles.reduce(
    (max, article) => {
      return max > article.create_date ? max : article.create_date;
    },
    "",
  );

  // Use that to load anything newer than that (our max is the min of what we want returned)
  state.loading_path = true;
  fetch("/session", {
    method: "POST",
    body: JSON.stringify({
      path: current_path,
      min_create_date,
      min_comment_create_date,
      min_article_create_date,
    }),
  })
    .then((response) => response.json())
    .then(function (data) {
      // Stop if the path changed while we were loading
      if (state.path !== current_path) {
        return;
      }

      // Track current scrollHeight
      const scroll_height = $body.scrollHeight;
      const scroll_top = $body.scrollTop;

      // Render activities if appropriate
      if (data.activities.length) {
        const new_ids = data.activities.map((activity) => activity.id);
        current_cache.activities = current_cache.activities.filter(
          (a) => new_ids.indexOf(a.id) === -1,
        );
        current_cache.activities.unshift(...data.activities);
        renderActivities(current_cache.activities);
      }

      // Render comments if appropriate
      if (data.comments.length) {
        const new_ids = data.comments.map((comment) => comment.comment_id);
        current_cache.comments = current_cache.comments.filter(
          (c) => new_ids.indexOf(c.comment_id) === -1,
        );
        current_cache.comments.push(...data.comments);
        renderComments(current_cache.comments);

        // Flash any newly added items
        data.comments.forEach((comment) => {
          comment.$comment.setAttribute("flash-long-focus", "");
        });
      }

      // Render articles if appropriate
      if (data.articles.length) {
        const new_ids = data.articles.map((article) => article.article_id);
        current_cache.articles = current_cache.articles.filter(
          (a) => new_ids.indexOf(a.article_id) === -1,
        );
        current_cache.articles.unshift(...data.articles);
        renderArticles(current_cache.articles);

        // Flash any newly added items
        data.articles.forEach((article) => {
          article.$article.setAttribute("flash-long-focus", "");
        });
      }

      // Restore scroll position if we re-rendered anything
      if (
        data.activities.length ||
        data.comments.length ||
        data.articles.length
      ) {
        // Set a min threshold of scroll to do anything
        let min_threshold = 0;

        // For /topics specifically we have the add-new element that won't be shifted so we want to be (mostly) past it (~200px of it still showing means shift it away?)
        if (current_path === "/topics") {
          const $add_new = $("main-content > add-new:first-child");
          min_threshold = $add_new.offsetTop + $add_new.offsetHeight - 200;
        }

        // If we are past the threshold, then maintain our position
        if (scroll_top > min_threshold) {
          $body.scrollTop =
            scroll_top + ($body.scrollHeight - scroll_height);
        }
      }

      // Acknowledge we finished loading
      state.loading_path = false;
    })
    .catch(function (error) {
      state.loading_path = false;
      debug(error);
    });
};

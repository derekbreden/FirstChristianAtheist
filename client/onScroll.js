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
});

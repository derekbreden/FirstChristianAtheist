const originalFetch = fetch;

if (test_mode === "record") {
  const fetch_cache = {};
  const $fetch_cache_output = $(`
    textarea[rows=20]
  `);
  $fetch_cache_output.style.position = "absolute";
  $fetch_cache_output.style.top = "0";
  $fetch_cache_output.style.left = "0";
  $("body").appendChild($fetch_cache_output);
  fetch = (url, options) => {
    const original_fetch = originalFetch(url, options);
    original_fetch
      .then((response) => response.clone().json())
      .then((data) => {
        fetch_cache[JSON.stringify([url, options])] = data;
        $fetch_cache_output.value =
          "const fetch_cache = " + JSON.stringify(fetch_cache, null, 2) + ";";
      });
    return original_fetch;
  };
} else {
  fetch = (url, options) => {
    if (fetch_cache[JSON.stringify([url, options])]) {
      const cached_result = new Promise((resolve) => {
        const cached_response = {};
        cached_response.json = () =>
          new Promise((resolve) => {
            resolve(fetch_cache[JSON.stringify([url, options])]);
          });
        resolve(cached_response);
      });
      return cached_result;
    } else {
      const original_fetch = originalFetch(url, options);
      original_fetch
        .then((response) => response.clone().json())
        .then((data) => {
          fetch_cache[JSON.stringify([url, options])] = data;

          const $fetch_cache_output = $(`
            textarea[fetch-cache][rows=20]
          `);
          $fetch_cache_output.style.position = "absolute";
          $fetch_cache_output.style.top = "0";
          $fetch_cache_output.style.left = "0";
          $("fetch-cache")?.remove();
          $("body").appendChild($fetch_cache_output);
          
          $fetch_cache_output.value =
            "const fetch_cache = " + JSON.stringify(fetch_cache, null, 2) + ";";
        });
      return original_fetch;
    }
  };
}
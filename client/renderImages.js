const renderImages = () => {
  if (state.path === "/image") {
    const $image_prompt = $(
      `
    image-prompt
      textarea[prompt][rows=10]
      button[submit] Generate
    `,
    );
    $image_prompt.$("[submit]").on("click", () => {
      $image_prompt.$("textarea").setAttribute("disabled", "");
      $image_prompt.appendChild(
        $(
          `
        info Generating...
        `,
        ),
      );
      fetch("/session", {
        method: "POST",
        body: JSON.stringify({
          session_uuid: state.session_uuid,
          path: state.path,
          prompt: $image_prompt.$("textarea").value,
        }),
      })
        .then((response) => response.json())
        .then(function (data) {
          $image_prompt.$("info")?.remove();
          $image_prompt.$("textarea").removeAttribute("disabled");
          if (data.image) {
            $("articles img")?.remove();
            $("articles").appendChild(
              $(
                `
              img[src=$1]
              `,
                [data.image],
              ),
            );
          } else {
            debug(data);
          }
        })
        .catch(function (error) {
          debug(error);
        });
    });
    $("articles").appendChild($image_prompt);
  }
};

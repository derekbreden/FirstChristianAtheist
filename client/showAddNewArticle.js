const showAddNewArticle = (article, $article) => {
  const $add_new = $(
    `
    add-new[article]
      title-wrapper
        input[title][placeholder=Title][maxlength=140][value=$1]
        label[img-icon]
          input[img][type=file][multiple]
      textarea[body][placeholder=Content][rows=10][maxlength=4000] $2
      button[submit] $3
      button[alt][cancel] Cancel
    `,
    article
      ? [article.title, article.body, "Save changes"]
      : ["", "", "Add topic"],
  );

  const addArticleError = (error) => {
    $add_new.appendChild(
      $(
        `
        error[show]
          $1
        `,
        [error],
      ),
    );
  };

  const pngs = [];

  if (article?.image_uuids) {
    const image_uuids = article.image_uuids.split(",");
    for (const image_uuid of image_uuids) {
      imageToPng("/image/" + image_uuid, (png) => {
        pngs.push(png);
        previewPngs();
      });
    }
  }

  $add_new.$("[img]").on("change", () => {
    Array.from($add_new.$("[img]").files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = ($event) => {
        imageToPng($event.target.result, (png) => {
          pngs.push(png);
          if (pngs.length > 4) {
            pngs.splice(4, pngs.length - 4);
            if (!$("modal[error]")) {
              modalError("Each article is limited to 4 images");
            }
          }
          previewPngs();
        });
      };
      reader.readAsDataURL(file);
    });
  });

  const previewPngs = () => {
    $add_new.$("image-previews")?.remove();
    $add_new.$("title-wrapper").after(document.createElement("image-previews"));
    pngs.forEach((png, i) => {
      const $preview = $(
        `
        preview
          remove-icon
          img[src=$1]
        `,
        [png.url],
      );
      $preview.$("remove-icon").on("click", () => {
        pngs.splice(i, 1);
        previewPngs();
      });
      $add_new.$("image-previews").appendChild($preview);
    });
  };

  $add_new.$("[title]").on("focus", () => {
    $add_new.$("error")?.remove();
  });
  $add_new.$("[body]").on("focus", () => {
    $add_new.$("error")?.remove();
  });
  if ($article) {
    $add_new.$("[cancel]").on("click", () => {
      $add_new.replaceWith($article);
    });
  } else {
    $add_new.$("[cancel]").remove();
  }
  $add_new.$("[submit]").on("click", () => {
    $add_new.$("error")?.remove();
    const title = $add_new.$("[title]").value;
    const body = $add_new.$("[body]").value;
    if (!title) {
      addArticleError("Please enter a title");
      return;
    }
    if (!body) {
      addArticleError("Please enter some content");
      return;
    }
    if (title.length >= body.length) {
      addArticleError("The content must be longer than the title");
      return;
    }
    $add_new.appendChild(
      $(
        `
          info[show] Validating...
        `,
      ),
    );
    $add_new.$("[title]").setAttribute("disabled", "");
    $add_new.$("[body]").setAttribute("disabled", "");
    $add_new.$("[submit]").setAttribute("disabled", "");
    $add_new.$("[cancel]")?.setAttribute("disabled", "");
    fetch("/session", {
      method: "POST",
      body: JSON.stringify({
        path: state.path,
        title,
        body,
        pngs,
        article_id: article ? article.article_id : undefined,
      }),
    })
      .then((response) => response.json())
      .then(function (data) {
        if (data.error || !data.success) {
          $add_new.$("info")?.remove();
          $add_new.$("[title]").removeAttribute("disabled");
          $add_new.$("[body]").removeAttribute("disabled");
          $add_new.$("[submit]").removeAttribute("disabled");
          $add_new.$("[cancel]")?.removeAttribute("disabled");
          if (data.error) {
            const first_word = data.error.slice(0, data.error.indexOf(" "));
            const title = {
              ESCALATING: "Escalation",
              JUDGMENTAL: "Judgmental",
              MISUNDERSTANDING: "Misunderstanding",
              OFFTOPIC: "Off topic",
            }[first_word];
            if (title) {
              addArticleError(
                $(
                  `
                  b $1
                  p $2
                  `,
                  [title, data.error.slice(data.error.indexOf(" ") + 1)],
                ),
              );
            } else {
              addArticleError(data.error);
            }
          } else {
            addArticleError("Server error");
          }
          return;
        }
        if (!article) {
          $add_new.$("[body]").value = "";
          $add_new.$("info")?.remove();
          $add_new.$("[title]").removeAttribute("disabled");
          $add_new.$("[body]").removeAttribute("disabled");
          $add_new.$("[submit]").removeAttribute("disabled");
          $add_new.$("[cancel]")?.removeAttribute("disabled");
        }
        // Handle case where title changes slug when updating an article
        if (article && data.slug) {
          state.path = `/article/${data.slug}`;
          startSession();
        } else {
          getMoreRecent();
        }
      })
      .catch(function (error) {
        $add_new.$("info")?.remove();
        $add_new.$("[title]").removeAttribute("disabled");
        $add_new.$("[body]").removeAttribute("disabled");
        $add_new.$("[submit]").removeAttribute("disabled");
        $add_new.$("[cancel]")?.removeAttribute("disabled");
        addArticleError("Network error");
      });
  });
  if ($article) {
    $article.replaceWith($add_new);
    $add_new.$("[title]").focus();
  } else {
    $("main-content add-new[article]")?.remove();
    $("main-content").prepend($add_new);
  }
};

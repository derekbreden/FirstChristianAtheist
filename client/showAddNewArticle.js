const showAddNewArticle = (article, $article) => {
  const $add_new = $(
    `
    add-new[article]
      input[title][placeholder=Title][maxlength=140][value=$1]
      textarea[body][placeholder=Content][rows=10][maxlength=4000] $2
      image-wrapper
        label[img-icon]
          input[img][type=file][multiple]
        previews
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

  $add_new.$("[img]").on("change", () => {
    Array.from($add_new.$("[img]").files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = ($event) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
          const ratio =
            1024 / (img.width > img.height ? img.width : img.height);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          ctx.drawImage(
            img,
            0,
            0,
            img.width,
            img.height,
            0,
            0,
            canvas.width,
            canvas.height,
          );
          const data_url = canvas.toDataURL("image/png");
          pngs.push({
            url: data_url,
            width: canvas.width,
            height: canvas.height,
          });
          if (pngs.length > 4) {
            pngs.splice(4, pngs.length - 4);
            if (!$("modal[error]")) {
              modalError("Each article is limited to 4 images");
            }
          }
          previewPngs();
        };
        img.src = $event.target.result;
      };
      reader.readAsDataURL(file);
    });
  });

  const previewPngs = () => {
    $add_new.$("image-wrapper previews")?.remove();
    $add_new.$("image-wrapper").appendChild(document.createElement("previews"));
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
      $add_new.$("image-wrapper previews").appendChild($preview);
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
        session_uuid: state.session_uuid,
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
        startSession();
      })
      .catch(function (error) {
        $add_new.$("info")?.remove();
        addArticleError("Network error");
      });
  });
  if ($article) {
    $article.replaceWith($add_new);
    $add_new.$("[title]").focus();
  } else if (!$("main-content add-new:first-child")) {
    $("main-content").prepend($add_new);
  }
};

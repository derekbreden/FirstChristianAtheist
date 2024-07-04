const showAddNewComment = (
  comment,
  $comment,
  parent_comment,
  $parent_comment,
) => {
  const $add_new = $(
    `
    add-new[comment]
      input[display-name][placeholder=Your name][maxlength=50][value=$1]
      textarea[body][placeholder=Comment][rows=5][maxlength=1000] $2
      button[submit] $3
      button[alt][cancel] Cancel
    `,
    comment
      ? [display_name, comment.body, "Save changes"]
      : parent_comment
        ? [display_name, "", "Reply"]
        : [display_name, "", "Add comment"],
  );
  if (comment) {
    $add_new.$("[cancel]").on("click", () => {
      $add_new.replaceWith($comment);
    });
  } else if ($parent_comment) {
    $add_new.$("[cancel]").on("click", () => {
      $parent_comment.$(":scope > reply-wrapper").style.display = "flex";
      $add_new.remove();
    });
  } else {
    $add_new.$("[cancel]").on("click", () => {
      $add_new.remove();
      $("[add-new-comment]").style.display = "block";
    });
  }
  const addCommentError = (error) => {
    $add_new.appendChild(
      $(
        `
        error[show] $1
        `,
        [error],
      ),
    );
  };
  $add_new.$("[display-name]").on("focus", () => {
    $add_new.$("error")?.remove();
  });
  $add_new.$("[body]").on("focus", () => {
    $add_new.$("error")?.remove();
  });
  const hideDisplayNameInput = () => {
    const $display_name = $add_new.$("[display-name]");
    if (display_name && $display_name) {
      const $display_name_wrapper = $(
        `
        display-name-wrapper
          b $1
        `,
        [display_name + ":"],
      );
      $display_name_wrapper.on("click", () => {
        $display_name_wrapper.replaceWith($display_name);
        $display_name.focus();
      });
      $display_name.replaceWith($display_name_wrapper);
    }
  };
  const saveDisplayName = () => {
    if (display_name === $add_new.$("[display-name]").value) {
      hideDisplayNameInput();
      return;
    }
    display_name = $add_new.$("[display-name]").value;
    $add_new.$("[display-name]").setAttribute("disabled", "");
    if (!display_name) {
      addCommentError("Please enter your name");
      return;
    }
    $add_new.appendChild(
      $(
        `
          info[show] Validating...
        `,
      ),
    );
    fetch("/session", {
      method: "POST",
      body: JSON.stringify({
        session_uuid,
        display_name,
      }),
    })
      .then((response) => response.json())
      .then(function (data) {
        $add_new.$("[display-name]")?.removeAttribute("disabled");
        $add_new.$("info")?.remove();
        if (data.error || !data.success) {
          addCommentError(data.error || "Server error");
          display_name = "";
        }
        hideDisplayNameInput();
      })
      .catch(function (error) {
        $add_new.$("[display-name]")?.removeAttribute("disabled");
        $add_new.$("info")?.remove();
        addCommentError("Network error");
      });
  };
  $add_new.$("[display-name]").on("blur", () => {
    saveDisplayName();
  });
  hideDisplayNameInput();
  $add_new.$("[submit]").on("click", () => {
    $add_new.$("error")?.remove();
    display_name = $add_new.$("[display-name]")?.value || display_name;
    const body = $add_new.$("[body]").value;
    if (!display_name) {
      addCommentError("Please enter your name");
      return;
    }
    if (!body) {
      addCommentError("Please enter a comment");
      return;
    }
    $add_new.appendChild(
      $(
        `
          info[show] Validating...
        `,
      ),
    );
    $add_new.$("[body]").setAttribute("disabled", "");
    $add_new.$("[display-name]")?.setAttribute("disabled", "");
    fetch("/session", {
      method: "POST",
      body: JSON.stringify({
        session_uuid,
        path,
        display_name,
        body,
        comment_id: comment ? comment.comment_id : undefined,
        parent_comment_id: parent_comment
          ? parent_comment.comment_id
          : comment && comment.parent_comment_id
            ? comment.parent_comment_id
            : undefined,
      }),
    })
      .then((response) => response.json())
      .then(function (data) {
        if (data.error || !data.success) {
          $add_new.$("info")?.remove();
          $add_new.$("[body]").removeAttribute("disabled");
          $add_new.$("[display-name]")?.removeAttribute("disabled");
          addCommentError(data.error || "Server error");
          return;
        }
        if (!comment && !parent_comment) {
          $add_new.$("[body]").value = "";
          $add_new.$("info")?.remove();
          $add_new.$("[body]").removeAttribute("disabled");
          $add_new.$("[display-name]")?.removeAttribute("disabled");
        }
        startSession();
      })
      .catch(function (error) {
        $add_new.$("info")?.remove();
        addCommentError("Network error");
      });
  });
  if ($comment) {
    $comment.replaceWith($add_new);
  } else if ($parent_comment) {
    $parent_comment.$(":scope > reply-wrapper").after($add_new);
  } else {
    $("comments").prepend($add_new);
  }
  if (!display_name) {
    $add_new.$("[display-name]").focus();
  } else {
    $add_new.$("[body]").focus();
  }
};

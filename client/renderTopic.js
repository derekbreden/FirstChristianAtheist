const renderTopic = (topic) => {
  let $topic_body = markdownToElements(topic.body);
  let characters_used = 0;
  let trimmed = false;
  if (state.path === "/topics" || state.path === "/recent") {
    topic.edit = false;
    $topic_body = $topic_body.reduce((acc, child) => {
      characters_used += child.textContent.length;
      if (characters_used < 280) {

        // Exclude audio from summaries
        if (child.tagName !== "AUDIO") {
          acc.push(child);
        }
      } else {
        trimmed = true;
      }
      return acc;
    }, []);
    $topic_body.push(
      $(
        `
        expand-wrapper
          p[comments] $1
          p Read more
          button[expand-down]
        `,
        [
          topic.comment_count +
            (topic.comment_count === "1" ? " comment" : " comments"),
        ],
      ),
    );
  }
  const $topic = $(
    `
    topic
      h2
        $1
        $2
      $3
    `,
    [
      topic.title,
      topic.edit
        ? $(
            `
            button[edit][small][alt][faint] Edit
            `,
            [],
          )
        : [],
      $topic_body,
    ],
  );
  if (topic.edit) {
    $topic.$("[edit]").on("click", ($event) => {
      $event.preventDefault();
      $topic.replaceWith(showAddNewTopic(topic));
      focusAddNewTopic();
    });
  }
  if (topic.image_uuids) {
    const image_uuids = topic.image_uuids.split(",").reverse();
    for (const image_uuid of image_uuids) {
      const $image = $(
        `
        p[img]
          img[src=$1]
        `,
        ["/image/" + image_uuid],
      );
      $topic.$("h2").after($image);
    }
  }
  if (state.path === "/topics" || state.path === "/recent") {
    $topic.setAttribute("trimmed", "");
    $topic.on("click", ($event) => {
      $event.preventDefault();
      goToPath("/topic/" + topic.slug);
    });
  }
  topic.$topic = $topic;
  return $topic;
};

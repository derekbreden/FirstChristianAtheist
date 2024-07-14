self.addEventListener("push", (event) => {
  const payload = event.data?.text();
  if (payload) {
    let parsed_payload = {};
    try {
      parsed_payload = JSON.parse(payload);
    } catch(e) {
    }
    const title = parsed_payload.title || "First Christian Atheist";
    const body = parsed_payload.body || "You have a new reply";
    const tag = parsed_payload.tag || "no-tag-in-payload";
    const unread_count = parsed_payload.unread_count || 0;
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        tag,
      }),
    );
    if (unread_count) {
      navigator.setAppBadge(unread_count);
    }
  }
});
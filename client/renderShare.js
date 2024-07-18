const renderShare = () => {
  if (state.path.substr(0, 8) === "/topic") {
    const $share = $(
      `
      share-wrapper
        p Share
        button[share]
        info[small] Link copied to clipboard!
      `,
    );
    $("back-forward-wrapper").$("share-wrapper")?.remove();
    $("back-forward-wrapper").appendChild($share);
    $share.on("click", () => {
      navigator.clipboard.writeText(window.location.href);
      $share.$("info").setAttribute("show", "");
      setTimeout(() => {
        $share?.$("info")?.removeAttribute("show");
      }, 4000);
    });
  }
};
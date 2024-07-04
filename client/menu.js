$("header hamburger").on("click", () => {
  $("menu").style.display = "flex";
  $("modal-bg").style.display = "flex";
});
const menuCancel = () => {
  $("menu").style.display = "none";
  $("modal-bg").style.display = "none";
  $("sign-in error").style.display = "none";
  $("sign-in [type=email]").value = "";
  $("sign-in [type=password]").value = "";
};
$("menu [cancel]").on("click", menuCancel);
$("modal-bg").on("click", menuCancel);
$("menu links a").forEach(($el) => {
  $el.on("click", ($event) => {
    $event.preventDefault();
    menuCancel();
    const new_path = $el.getAttribute("href");
    if (path !== new_path) {
      path = new_path;
      history.pushState({}, "", path);
      loadingPage();
    }
    startSession();
  });
});
$("h1").forEach(($el) => {
  $el.on("click", ($event) => {
    $event.preventDefault();
    menuCancel();
    const new_path = $el.getAttribute("href");
    if (path !== new_path) {
      path = new_path;
      history.pushState({}, "", path);
      loadingPage();
    }
    startSession();
  });
});
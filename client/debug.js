const debug = function () {
  let to_render = [...arguments];
  if (to_render[0] && to_render[0].message) {
    to_render = {
      message: to_render[0].message,
      // filename: to_render[0].filename,
      lineno: to_render[0].lineno,
      colno: to_render[0].colno,
    };
  } else if (to_render.length === 1) {
    to_render = to_render[0];
  }
  $("debug").innerHTML = JSON.stringify(to_render, null, 2);
};

window.addEventListener("error", ($error) => {
  debug($error);
});
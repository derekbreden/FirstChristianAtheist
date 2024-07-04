// Generic modal info
const modalInfoCancel = () => {
  $("modal[info]").style.display = "none";
  $("modal-bg").style.display = "none";
};
$("modal[info] [close]").on("click", modalInfoCancel);
$("modal-bg").on("click", modalInfoCancel);
const modalInfo = (message) => {
  $("modal[info] info").innerHTML = message;
  $("modal[info]").style.display = "flex";
  $("modal-bg").style.display = "flex";
};

// Generic modal error
const modalErrorCancel = () => {
  $("modal[error]").style.display = "none";
  $("modal-bg").style.display = "none";
};
$("modal[error] [close]").on("click", modalErrorCancel);
$("modal-bg").on("click", modalErrorCancel);
const modalError = (message) => {
  $("modal[error] error").innerHTML = message;
  $("modal[error]").style.display = "flex";
  $("modal-bg").style.display = "flex";
};
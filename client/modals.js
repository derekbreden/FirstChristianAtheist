// Generic modal info
const modalInfo = (message) => {
  const $modal = $(
    `
    modal[info]
      info[show] $1
      button[close] Okay
    modal-bg
    `,
    [ message ]
  );
  const modalCancel = () => {
    $modal.remove();
  };
  $modal.$("[close]").on("click", modalCancel);
  $modal.$("modal-bg").on("click", modalCancel);
  $("body").appendChild($modal);
};

// Generic modal error
const modalError = (message) => {
  const $modal = $(
    `
    modal[error]
      error[show] $1
      button[close] Okay
    modal-bg
    `,
    [ message ]
  );
  const modalCancel = () => {
    $modal.remove();
  };
  $modal.$("[close]").on("click", modalCancel);
  $modal.$("modal-bg").on("click", modalCancel);
  $("body").appendChild($modal);
};
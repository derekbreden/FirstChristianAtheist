state.session_uuid = "";
const test_mode = "playback"; // "record";
const tests = [];
const delay = 50;

// Sign up
tests.push(() => {
  $("hamburger").click();
  $("sign-in [submit]").click();
  expect("sign-in error", "Please enter a valid email address");
  $("sign-in [type=email]").value = "testemail@testemail.com";
  $("sign-in [type=password]").value = "1234";
  setTimeout(() => {
    $("sign-in [submit]").click();
    expect("sign-in info", "Validating...");
  }, delay);
});

// Signed in
tests.push(() => {
  $("hamburger").click();
  expect("signed-in button", "Log out");
  setTimeout(() => {
    $('menu [href="/topics"]').click();
  }, delay);
});

// Clicked /topics
tests.push(() => {
  expect("add-new [submit]", "Add topic");
  expect("[add-new-comment] button", "Add comment");
  $("hamburger").click();
  setTimeout(() => {
    $("test-wrapper")?.remove();
    $('menu [href="/recent"]').click();
  }, delay);
});

// Clicked /recent
tests.push(() => {
  expect("activities h3");
  history.pushState({}, "", "/test");
});

// Fire each test function on each page render
$("body").on("page-rendered", () => {
  const this_test = tests.shift();
  expect("body");
  setTimeout(() => {
    this_test();
  }, delay);
});

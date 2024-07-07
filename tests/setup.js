const test_mode = "playback"; // "record"; // "end2end"; // "playback";
const tests = [];
const delay = 50;
const original_session_uuid = localStorage.getItem("session_uuid");
if (test_mode === "record") {
  localStorage.removeItem("session_uuid");
}


// Sign up
tests.push(() => {
  $("header hamburger").click();
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
  $("header hamburger").click();
  expect("signed-in button", "Log out");
  setTimeout(() => {
    $('menu [href="/topics"]').click();
  }, delay);
});

// Clicked /topics
tests.push(() => {
  expect("[add-new-comment] button", "Add comment");
  expect("add-new [submit]", "Add topic");
  $("add-new [title]").value = "Go to your local food pantry";
  $("add-new [body]").value = "Many people are hungry, and the network of food pantries in the United States is an excellent resource for meeting the needs of many. They too, need our help.";
  setTimeout(() => {
    $("test-wrapper")?.remove();
    $("add-new [submit]").click();
  }, delay);
});

// Submitted article
tests.push(() => {
  expect("article:first-child h2", "Go to your local food pantry")
  setTimeout(() => {
    $("header hamburger").click();
    setTimeout(() => {
      $("test-wrapper")?.remove();
      $('menu [href="/recent"]').click();
    }, delay);
  }, delay);
});

// Clicked /recent
tests.push(() => {
  expect("activities h3");
  testCleanup();
});

// Fire each test function on each page render
$("body").on("page-rendered", () => {
  const this_test = tests.shift();
  expect("body");
  if (this_test) {
    setTimeout(() => {
      this_test();
    }, delay);
  }
});

const testCleanup = () => {
  localStorage.setItem("session_uuid", original_session_uuid);
  history.replaceState({ path_index: state.path_index }, "", "/test");
  if (test_mode !== "playback") {
    originalFetch("/test_cleanup", {
      method: "POST",
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Cleanup returned", data);
      });
  }
};

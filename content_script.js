let user_data = {};

function getMsg(msg_type, msg_body) {
  return {
    msg: {
      type: msg_type,
      data: msg_body,
    },
    sender: "content_script",
    id: "irctc",
  };
}
function statusUpdate(status) {
  chrome.runtime.sendMessage(
    getMsg("status_update", { status, time: Date.now() })
  );
}

function addDelay(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message, sender, "content_script");
  if (message.id !== "irctc") {
    sendResponse("Invalid Id");
    return;
  }
  const type = message.msg.type;
  if (type === "selectJourney") {
    addDelay(200);
    selectJourney();
  } else if (type === "fillPassengerDetails") {
    addDelay(200);
    fillPassengerDetails();
  }
  sendResponse("Something went wrong");
});

function loadLoginDetails() {
  statusUpdate("login_started");
  const loginModal = document.querySelector("#divMain > app-login");

  const userNameInput = loginModal.querySelector(
    "input[type='text'][formcontrolname='userid']"
  );
  const passwordInput = loginModal.querySelector(
    "input[type='password'][formcontrolname='password']"
  );

  const captchaInput = loginModal.querySelector(
    "input[type='text'][formcontrolname='captcha']"
  );

    const submitBtn = loginModal.querySelector("button[type='submit']");

  captchaInput.addEventListener("mouseenter", function () {
    const captcha = document.querySelector(".captcha-img").src;
    if (captcha == null) {
      alert("Please Wait...");
    } else {
      Tesseract.recognize(captcha).then(async function (result) {
        captchaInput.value = result.text;
      });
    }
  });

    submitBtn.addEventListener("mouseenter", function () {
    submitBtn.click();
    });

  userNameInput.value = user_data["irctc_credentials"]["user_name"] ?? "";
  userNameInput.dispatchEvent(new Event("input"));
  userNameInput.dispatchEvent(new Event("change"));

  passwordInput.value = user_data["irctc_credentials"]["password"] ?? "";
  passwordInput.dispatchEvent(new Event("input"));
  passwordInput.dispatchEvent(new Event("change"));
  statusUpdate("login_pending");
}

function loadJourneyDetails() {
  statusUpdate("filling_journey_details");
  const form = document.querySelector("app-jp-input form");
  const fromInputField = form.querySelector("#origin > span > input");
  fromInputField.value = user_data["journey_details"]["from"]
    ? `${user_data["journey_details"]["from"]["english_label"]} - ${user_data["journey_details"]["from"]["station_code"]}`
    : "";
  fromInputField.dispatchEvent(new Event("keydown"));
  fromInputField.dispatchEvent(new Event("input"));

  const destinationInputField = form.querySelector(
    "#destination > span > input"
  );
  destinationInputField.value = user_data["journey_details"]["destination"]
    ? `${user_data["journey_details"]["destination"]["english_label"]} - ${user_data["journey_details"]["destination"]["station_code"]}`
    : "";
  destinationInputField.dispatchEvent(new Event("keydown"));
  destinationInputField.dispatchEvent(new Event("input"));

  const dateInputField = form.querySelector("#jDate > span > input");
  dateInputField.value = user_data["journey_details"]["date"]
    ? `${user_data["journey_details"]["date"].split("-").reverse().join("/")}`
    : "";
  dateInputField.dispatchEvent(new Event("keydown"));
  dateInputField.dispatchEvent(new Event("input"));

  const jClassField = form.querySelector("#journeyClass");
  const jClassArrowBtn = jClassField.querySelector("div > div[role='button']");
  jClassArrowBtn.click();
  addDelay(300);
  [...jClassField.querySelectorAll("ul li")]
    .filter(
      (e) =>
        e.innerText === user_data["journey_details"]["class"]["label"] ?? ""
    )[0]
    ?.click(); //handle error here
  addDelay(300);

  const quotaField = form.querySelector("#journeyQuota");
  const quotaArrowBtn = quotaField.querySelector("div > div[role='button']");
  quotaArrowBtn.click();
  [...quotaField.querySelectorAll("ul li")]
    .filter(
      (e) =>
        e.innerText === user_data["journey_details"]["quota"]["label"] ?? ""
    )[0]
    ?.click(); //handle error here

  const searchBtn = form.querySelector(
    "button.search_btn.train_Search[type='submit']"
  );
  addDelay(500);
  statusUpdate("filled_journey_details");

  if (
    user_data["journey_details"]["quota"]["label"] === "TATKAL" ||
    (user_data["journey_details"]["quota"]["label"] === "PREMIUM TATKAL" &&
      user_data["extension_data"]["book_at_tatkal_time"] === true)
  ) {
    const jclass = user_data["journey_details"]["class"]["value"];
    let currentDate = new Date();
    let requiredDate = new Date();
    ["1A", "2A", "3A", "CC", "EC", "3E"].includes(jclass.toUpperCase())
      ? requiredDate.setHours(10, 0, 0, 0)
      : requiredDate.setHours(11, 0, 0, 0);

    if (requiredDate > currentDate) {
      console.log("asdas");
      setTimeout(() => {
        searchBtn.click();
      }, 10);
    } else {
      searchBtn.click();
    }
  } else {
    searchBtn.click();
  }
}

function selectJourney() {
  if (!user_data["journey_details"]["train-no"]) return;

  statusUpdate("journey_selection_started");
  const train_list_parent = document.querySelector(
    "#divMain > div > app-train-list"
  );
  const train_list = [
    ...train_list_parent.querySelectorAll(".tbis-div app-train-avl-enq"),
  ];
  console.log(user_data["journey_details"]["train-no"]);
  const myTrain = train_list.filter((train) =>
    train
      .querySelector("div.train-heading")
      .innerText.trim()
      .includes(user_data["journey_details"]["train-no"])
  )[0];

  if (!myTrain) {
    statusUpdate("journey_selection_stopped.no_train");
    return;
  }

  const jClass = user_data["journey_details"]["class"]["label"];
  const tempDate = new Date(user_data["journey_details"]["date"])
    .toString()
    .split(" ");
  const myClassToClick = [
    ...myTrain.querySelectorAll("table tr td div.pre-avl"),
  ].filter((c) => c.querySelector("div").innerText === jClass)[0];

  const config = { attributes: false, childList: true, subtree: true };
  [...myTrain.querySelectorAll("table tr td div.pre-avl")]
    .filter((c) => c.querySelector("div").innerText === jClass)[0]
    ?.click();

  const fetchAvailableSeatsCallback = (mutationList, observer) => {
    console.log("fetchAvailableSeatsCallback -1", Date.now());
    addDelay(800);
    console.log("fetchAvailableSeatsCallback -2", Date.now());
    const myClassToClick = [
      ...myTrain.querySelectorAll("table tr td div.pre-avl"),
    ].filter((c) => c.querySelector("div").innerText === jClass)[0];
    const myClassTabToClick = [
      ...myTrain.querySelectorAll(
        "div p-tabmenu ul[role='tablist'] li[role='tab']"
      ),
    ].filter((c) => c.querySelector("div").innerText === jClass)[0];
    const myClassTabToSelect = [
      ...myTrain.querySelectorAll("div div table td div.pre-avl"),
    ].filter(
      (c) =>
        c.querySelector("div").innerText ===
        `${tempDate[0]}, ${tempDate[2]} ${tempDate[1]}`
    )[0];

    const bookBtn = myTrain.querySelector(
      "button.btnDefault.train_Search.ng-star-inserted"
    );
    if (myClassToClick) {
      console.log(1);
      if (myClassToClick.classList.contains("selected-class")) {
        console.log(2);
        statusUpdate("journey_selection_completed");
        addDelay(300);
        bookBtn.click();
        observer.disconnect();
      } else {
        console.log(3);
        addDelay(300);
        myClassToClick.click();
      }
    } else if (myClassTabToClick) {
      console.log(4);
      if (!myClassTabToClick.classList.contains("ui-state-active")) {
        console.log(5);
        addDelay(300);
        myClassTabToClick.click();
        return;
      } else if (myClassTabToSelect) {
        console.log(6);
        if (myClassTabToSelect.classList.contains("selected-class")) {
          console.log(7);
          addDelay(500);
          bookBtn.click();
          observer.disconnect();
        } else {
          console.log(8, Date.now());
          addDelay(500);
          myClassTabToSelect.click();
          console.log(9, Date.now());
        }
      }
    }
  };
  const observer = new MutationObserver(fetchAvailableSeatsCallback);
  observer.observe(myTrain, config);
}

function fillPassengerDetails() {
  statusUpdate("passenger_filling_started");
  const parentElement = document.querySelector("app-passenger-input");
  let count = 1;
  while (count < user_data["passenger_details"].length) {
    addDelay(200);
    parentElement
      .querySelector(
        "#ui-panel-12-content div.zeroPadding.pull-left.ng-star-inserted a span.prenext"
      )
      ?.click();
    count++;
  }
  count = 0;
  while (count < user_data["infant_details"].length) {
    addDelay(200);
    parentElement
      .querySelector(
        "#ui-panel-12-content div.zeroPadding.text-right.ng-star-inserted > a > span.prenext"
      )
      .click();
    count++;
  }
  const passengerList = [...parentElement.querySelectorAll("app-passenger")];
  const infantList = [...parentElement.querySelectorAll("app-infant")];

  // passenger details
  user_data["passenger_details"].forEach((passenger, index) => {
    const passengerElement = passengerList[index];
    if (!passengerElement) {
      console.error(`Passenger container not found at index ${index}`);
      return;
    }
  
    // --- NAME: p-autocomplete handling ---
    const name_autocomplete = passengerElement.querySelector("p-autocomplete[formcontrolname='passengerName']");
    if (name_autocomplete) {
      const name_input = name_autocomplete.querySelector("input");
      if (name_input) {
        name_input.focus(); // trigger focus if needed by framework
        name_input.value = passenger.name;
  
        // Simulate user input
        name_input.dispatchEvent(new Event("input", { bubbles: true }));
        name_input.dispatchEvent(new Event("blur")); // trigger form validations if any
  
        // Optional: simulate key events if suggestions list must appear
        name_input.dispatchEvent(new KeyboardEvent("keydown", { key: "A" }));
      } else {
        console.error(`Input inside p-autocomplete not found for passenger ${index}`);
      }
    } else {
      console.error(`p-autocomplete component not found for passenger ${index}`);
    }
  
    // --- AGE: number input ---
    const age_input = passengerElement.querySelector("input[type='number'][formcontrolname='passengerAge']");
    if (age_input) {
      age_input.value = passenger.age;
      age_input.dispatchEvent(new Event("input", { bubbles: true }));
      age_input.dispatchEvent(new Event("blur"));
    } else {
      console.error(`Age input field not found for passenger at index ${index}`);
    }
  
    // --- GENDER: select input ---
    const gender_select = passengerElement.querySelector("select[formcontrolname='passengerGender']");
    if (gender_select) {
      gender_select.value = passenger.gender;
      gender_select.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      console.error(`Gender select field not found for passenger at index ${index}`);
    }
  
    // --- BERTH PREFERENCE: select input ---
    const berth_select = passengerElement.querySelector("select[formcontrolname='passengerBerthChoice']");
    if (berth_select) {
      berth_select.value = passenger.berth;
      berth_select.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      console.error(`Berth preference select field not found for passenger at index ${index}`);
    }
  });
  

  // contact details
  let number_input_field = parentElement.querySelector(
    "input#mobileNumber[formcontrolname='mobileNumber'][name='mobileNumber']"
  );
  number_input_field.value = user_data["contact_details"].mobileNumber;
  number_input_field.dispatchEvent(new Event("input"));

  // Other preferences
  let autoUpgradationInput = parentElement.querySelector(
    "input#autoUpgradation[type='checkbox'][formcontrolname='autoUpgradationSelected']"
  );
  if (autoUpgradationInput)
    autoUpgradationInput.checked =
      user_data["other_preferences"]["autoUpgradation"] ?? false;

  let confirmberthsInput = parentElement.querySelector(
    "input#confirmberths[type='checkbox'][formcontrolname='bookOnlyIfCnf']"
  );
  if (confirmberthsInput)
    confirmberthsInput.checked =
      user_data["other_preferences"]["confirmberths"] ?? false;

  let preferredCoachInput = parentElement.querySelector(
    "input[formcontrolname='coachId']"
  );
  if (preferredCoachInput)
    preferredCoachInput.value = user_data["other_preferences"]["coachId"];

  const reservationChoiceField = parentElement.querySelector(
    "p-dropdown[formcontrolname='reservationChoice']"
  );
  if (reservationChoiceField) {
    const reservationChoiceArrowBtn = reservationChoiceField.querySelector(
      "div > div[role='button']"
    );
    reservationChoiceArrowBtn.click();
    addDelay(300);
    [...reservationChoiceField.querySelectorAll("ul li")]
      .filter(
        (e) =>
          e.innerText === user_data["other_preferences"]["reservationChoice"] ??
          ""
      )[0]
      ?.click(); //handle error here
  }
  // insurance details
  let insuranceOptionsRadios = [
    ...parentElement.querySelectorAll(
      `p-radiobutton[formcontrolname='travelInsuranceOpted'] input[type='radio'][name='travelInsuranceOpted-0']`
    ),
  ];
  addDelay(400);
  insuranceOptionsRadios
    .filter(
      (r) =>
        r.value ===
        (user_data["travel_preferences"].travelInsuranceOpted === "yes"
          ? "true"
          : "false")
    )[0]
    ?.click();

  // payment details
  let paymentOptionsRadios = [
    ...parentElement.querySelectorAll(
      `p-radiobutton[formcontrolname='paymentType'][name='paymentType'] input[type='radio']`
    ),
  ];
  addDelay(300);
  
  paymentOptionsRadios
  .filter(
    (r) => r.value === user_data["payment_preferences"].paymentType.toString()
  )[0]
  ?.click();
addDelay(300);
paymentOptionsRadios
  .filter(
    (r) => r.value === user_data["payment_preferences"].paymentType.toString()
  )[0]
  ?.click();

// Click the "Continue" button after selecting the payment mode
const continueBtn = parentElement.querySelector(
  "#psgn-form > form div > button.train_Search.btnDefault[type='submit']"
);
if (continueBtn) {
  addDelay(400); // Optional delay before clicking
  continueBtn.click();

  // Add captcha-solving logic after navigating to the next page
  setTimeout(() => {
    // Locate the captcha input field and image
    const captchaInput = document.querySelector("#captcha"); // Replace with the actual selector for the captcha input field
    const captchaImage = document.querySelector("#captchaImg"); // Replace with the actual selector for the captcha image

    if (captchaInput && captchaImage) {
      // Extract the captcha image source
      const captchaSrc = captchaImage.src;

      // Solve the captcha (example: using OCR or predefined logic)
      solveCaptcha(captchaSrc).then((captchaSolution) => {
        // Input the solution into the captcha field
        captchaInput.value = captchaSolution;

        // Submit the form
        const submitBtn = document.querySelector("#submitButton"); // Replace with the actual selector for the submit button
        if (submitBtn) {
          submitBtn.click();
        }
      });
    } else {
      console.error("Captcha elements not found on the page.");
    }
  }, 1000); // Adjust delay as needed
}
}


function submitPassengerDetailsForm(parentElement) {
  statusUpdate("passenger_filling_completed");
  console.log("completed", Date.now());
  console.log("document.readyState", document.readyState);
  statusUpdate("passenger_data_submitting");
  // submit form
  addDelay(800);
  console.log("submitting", Date.now());
  //continue button click
  const continuebtn = parentElement.querySelector(
      "#psgn-form > form div > button.train_Search.btnDefault[type='submit']"
    );
  continuebtn.addEventListener("click",function(){
    continuebtn.click();
  });
  statusUpdate("passenger_data_submitted");
}

function continueScript() {
  statusUpdate("continue_script");
  const loginBtn = document.querySelector(
    "body > app-root > app-home > div.header-fix > app-header > div.col-sm-12.h_container > div.text-center.h_main_div > div.row.col-sm-12.h_head1 > a.search_btn.loginText.ng-star-inserted"
  );
  // fill data in respective form at different pages
  if (window.location.href.includes("train-search")) {
    if (loginBtn.innerText.trim().toUpperCase() === "LOGOUT") {
      loadJourneyDetails();
    }
    if (loginBtn.innerText.trim().toUpperCase() === "LOGIN") {
      loginBtn.click();
      loadLoginDetails();
    }
  } else if (window.location.href.includes("nget/booking/train-list")) {
    console.log("nget/booking/train-list");
  } else if (window.location.href.includes("nget/booking/reviewBooking")) {
    console.log("nget/booking/reviewBooking");

    // Fill the captcha (assuming a function exists for this
    fillCaptcha();

    // Click the "Continue" button after filling the captcha
    const continueBtn = document.querySelector(
      "button.train_Search.btnDefault[type='submit']"
    );
    if (continueBtn) {
      setTimeout(() => {
        continueBtn.click();
        console.log("Clicked Continue after filling captcha");
      }, 500); // Optional delay to ensure captcha is filled
    }
  } else {
    console.log("No script ahead");
  }
}

window.onload = function (e) {
  const loginBtn = document.querySelector(
    "body > app-root > app-home > div.header-fix > app-header > div.col-sm-12.h_container > div.text-center.h_main_div > div.row.col-sm-12.h_head1 "
  );
  const config = { attributes: false, childList: true, subtree: false };
  const loginDetectorCallback = (mutationList, observer) => {
    if (
      mutationList.filter(
        (m) =>
          m.type === "childList" &&
          m.addedNodes.length > 0 &&
          [...m.addedNodes].filter(
            (n) => n?.innerText?.trim()?.toUpperCase() === "LOGOUT"
          ).length > 0
      ).length > 0
    ) {
      observer.disconnect();
      loadJourneyDetails();
    } else {
      loginBtn.click();
      loadLoginDetails();
    }
  };
  
  const observer = new MutationObserver(loginDetectorCallback);
  observer.observe(loginBtn, config);

  console.log("Content Script loaded with IRCTC Website");
  chrome.storage.local.get(null, (result) => {
    user_data = result;
    continueScript();
  });
};

const menuToggle = document.querySelector(".menu-toggle");
const siteMenu = document.querySelector("#site-menu");

if (menuToggle && siteMenu) {
  const menuLabel = menuToggle.querySelector(".sr-only");

  function setMenuOpen(isOpen) {
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    siteMenu.classList.toggle("is-open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
    if (menuLabel) {
      menuLabel.textContent = isOpen ? "Close menu" : "Open menu";
    }
  }

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    setMenuOpen(!isOpen);
  });

  siteMenu.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      setMenuOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (
      menuToggle.getAttribute("aria-expanded") === "true" &&
      !siteMenu.contains(event.target) &&
      !menuToggle.contains(event.target)
    ) {
      setMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });
}

const countdownTarget = new Date("2028-08-31T00:00:00-04:00").getTime();
const countdownParts = {
  days: document.querySelector("#days"),
  hours: document.querySelector("#hours"),
  minutes: document.querySelector("#minutes"),
  seconds: document.querySelector("#seconds")
};

function updateCountdown() {
  if (!countdownParts.days) return;
  const distance = Math.max(0, countdownTarget - Date.now());
  const days = Math.floor(distance / 86400000);
  const hours = Math.floor((distance % 86400000) / 3600000);
  const minutes = Math.floor((distance % 3600000) / 60000);
  const seconds = Math.floor((distance % 60000) / 1000);

  countdownParts.days.textContent = String(days).padStart(3, "0");
  countdownParts.hours.textContent = String(hours).padStart(2, "0");
  countdownParts.minutes.textContent = String(minutes).padStart(2, "0");
  countdownParts.seconds.textContent = String(seconds).padStart(2, "0");
}

updateCountdown();
setInterval(updateCountdown, 1000);

document.querySelectorAll("[data-prototype-alert]").forEach((button) => {
  button.addEventListener("click", () => {
    alert(button.getAttribute("data-prototype-alert"));
  });
});

const contactForm = document.querySelector(".contact-form:not(.photo-submit-form)");
if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    alert("This contact form is a prototype. Future versions can connect to Gmail or another approved email service.");
  });
}

const registrationForm = document.querySelector(".registration-form");
if (registrationForm) {
  registrationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    alert("This registration page is a prototype. Future versions can securely save household registration through Supabase.");
  });
}

const paymentForm = document.querySelector(".payment-form");
if (paymentForm) {
  paymentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    alert("This payment confirmation is a prototype. Future versions will save it for committee review, then the backend can mark it as received and update the member balance.");
  });
}

const memberLoginForm = document.querySelector(".member-login-form");
if (memberLoginForm) {
  memberLoginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.querySelector("#member-email")?.value.trim().toLowerCase();
    const password = document.querySelector("#member-password")?.value;

    if ((!email && !password) || (email === "family@example.com" && password === "Hayes2028!")) {
      window.location.href = "member.html";
      return;
    }

    alert("Use the sample login: family@example.com / Hayes2028!");
  });
}

const photoSubmitForm = document.querySelector(".photo-submit-form");
if (photoSubmitForm) {
  photoSubmitForm.addEventListener("submit", (event) => {
    event.preventDefault();
    alert("This photo submission form is a prototype. Future versions can securely upload family photos and publish them automatically.");
  });
}

// Future Supabase connection point: authentication, household records and committee-only data should be handled server-side.
// Future payment connection point: Venmo/Zelle confirmations should be saved for committee review before balances update.
// Future Gmail connection point: committee messages and reminders should use an approved server-side email workflow.

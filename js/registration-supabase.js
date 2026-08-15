(async function () {
  const supabase = window.HayesSupabase?.getClient();
  const form = document.querySelector(".registration-form");
  if (!supabase || !form) return;

  function value(selector) {
    return document.querySelector(selector)?.value.trim() || "";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstName = value("#account-first-name");
    const lastName = value("#account-last-name");
    const email = value("#account-email");
    const password = document.querySelector("#account-password")?.value || "";
    const confirmPassword = document.querySelector("#account-password-confirm")?.value || "";
    const submitButton = form.querySelector('button[type="submit"]');

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      alert("Please enter your first name, last name, account email and password.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (submitButton) submitButton.disabled = true;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });

    if (error) {
      if (submitButton) submitButton.disabled = false;
      alert(error.message);
      return;
    }

    if (submitButton) submitButton.disabled = false;

    if (data.session) {
      window.location.href = "member.html";
      return;
    }

    alert("Your account has been created. Check your email to confirm it, then sign in to complete your reunion registration.");
    window.location.href = "login.html";
  });
})();

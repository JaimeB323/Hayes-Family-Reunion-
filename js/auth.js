(async function () {
  const supabase = window.HayesSupabase?.getClient();
  const loginForm = document.querySelector(".member-login-form");
  const resetButton = document.querySelector("[data-password-reset]");
  if (!supabase || !loginForm) return;

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.querySelector("#member-email")?.value.trim();
    const password = document.querySelector("#member-password")?.value;
    const submitButton = loginForm.querySelector('button[type="submit"]');

    if (!email || !password) {
      alert("Please enter your email address and password.");
      return;
    }

    if (submitButton) submitButton.disabled = true;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (submitButton) submitButton.disabled = false;

    if (error) {
      alert("Login failed. Please check your email and password, then try again.");
      return;
    }

    window.location.href = "member.html";
  });

  resetButton?.addEventListener("click", async () => {
    const email = document.querySelector("#member-email")?.value.trim();
    if (!email) {
      alert("Enter your email address first, then choose Forgot Password.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      alert("Password reset could not be started. Please check your email and try again.");
      return;
    }

    alert("Password reset instructions have been sent if this email has an account.");
  });
})();

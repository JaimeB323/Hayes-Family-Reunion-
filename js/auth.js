(async function () {
  const supabase = window.HayesSupabase?.getClient();
  const loginForm = document.querySelector(".member-login-form");
  if (!supabase || !loginForm) return;

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.querySelector("#member-email")?.value.trim();
    const password = document.querySelector("#member-password")?.value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "member.html";
  });
})();

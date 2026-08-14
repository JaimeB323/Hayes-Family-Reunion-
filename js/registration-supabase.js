(async function () {
  const supabase = window.HayesSupabase?.getClient();
  const form = document.querySelector(".registration-form");
  if (!supabase || !form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.querySelector("#account-email")?.value.trim() || document.querySelector("#registration-email")?.value.trim();
    const password = document.querySelector("#account-password")?.value;
    const confirmPassword = document.querySelector("#account-password-confirm")?.value;
    const primaryContact = document.querySelector("#primary-contact")?.value.trim() || "";
    const [firstName, ...lastParts] = primaryContact.split(/\s+/);

    if (password && password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName || "",
          last_name: lastParts.join(" "),
          household_name: document.querySelector("#household-name")?.value.trim() || ""
        }
      }
    });

    if (error) {
      alert(error.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      alert("Check your email to confirm your account, then log in to complete registration.");
      return;
    }

    const { error: profileError } = await supabase.from("family_members").upsert({
      id: userId,
      first_name: firstName || "",
      last_name: lastParts.join(" "),
      email,
      phone: document.querySelector("#registration-phone")?.value.trim() || null,
      household_name: document.querySelector("#household-name")?.value.trim() || null,
      role: "member"
    });

    if (profileError) {
      alert(profileError.message);
      return;
    }

    alert("Registration profile saved. Committee registration totals can be completed after pricing is finalized.");
  });
})();

(async function () {
  const supabase = window.HayesSupabase?.getClient();
  const form = document.querySelector(".registration-form");
  if (!supabase || !form) return;

  function value(selector) {
    return document.querySelector(selector)?.value.trim() || "";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = value("#account-email");
    const password = document.querySelector("#account-password")?.value || "";
    const confirmPassword = document.querySelector("#account-password-confirm")?.value || "";
    const householdName = value("#household-name");
    const firstName = value("#primary-first-name");
    const lastName = value("#primary-last-name");
    const submitButton = form.querySelector('button[type="submit"]');

    if (!householdName || !firstName || !lastName || !email || !password) {
      alert("Please complete the household name, primary contact name, email and password.");
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
          last_name: lastName,
          household_name: householdName
        }
      }
    });

    if (error) {
      if (submitButton) submitButton.disabled = false;
      alert(error.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      if (submitButton) submitButton.disabled = false;
      alert("Check your email to confirm your account, then log in to complete registration.");
      return;
    }

    const profile = {
      id: userId,
      auth_user_id: userId,
      is_primary_contact: true,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: value("#registration-phone") || null,
      household_name: householdName,
      expected_arrival: value("#arrival-day") || null,
      role: "member"
    };

    const { error: profileError } = await supabase.from("family_members").upsert(profile);
    if (profileError) {
      if (submitButton) submitButton.disabled = false;
      alert(profileError.message);
      return;
    }

    const { error: householdError } = await supabase.from("households").upsert({
      household_name: householdName,
      primary_contact_id: userId,
      total_family_members: 0,
      total_amount_due: 0,
      total_amount_paid: 0
    }, { onConflict: "household_name" });

    if (householdError) {
      if (submitButton) submitButton.disabled = false;
      alert(householdError.message);
      return;
    }

    const { error: registrationError } = await supabase.from("reunion_registrations").upsert({
      family_member_id: userId,
      registration_status: "pending",
      number_of_guests: 0,
      total_amount_due: 0,
      total_amount_paid: 0
    }, { onConflict: "family_member_id" });

    if (submitButton) submitButton.disabled = false;

    if (registrationError) {
      alert(registrationError.message);
      return;
    }

    alert("Your household account has been created. Log in to add family members and activities.");
    window.location.href = "login.html";
  });
})();

(async function () {
  const supabase = window.HayesSupabase?.getClient();
  const form = document.querySelector(".payment-form");
  if (!supabase || !form) return;

  const accountNote = document.querySelector("[data-payment-account]");
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const { data: member, error: memberError } = await supabase
    .from("family_members")
    .select("id, first_name, last_name, household_name")
    .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
    .single();

  if (memberError || !member) {
    if (accountNote) accountNote.textContent = "Complete your household setup in the Member Portal before submitting a payment.";
    form.querySelector('button[type="submit"]')?.setAttribute("disabled", "");
    return;
  }

  if (accountNote) {
    const accountName = `${member.first_name || ""} ${member.last_name || ""}`.trim();
    accountNote.textContent = `Submitting for ${accountName || member.household_name || "your household"}. Payments remain pending until confirmed by the committee.`;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const paymentMethod = form.querySelector('input[name="payment-method"]:checked')?.value;
    const paymentType = form.querySelector("#payment-type")?.value;
    const amount = Number(form.querySelector("#payment-amount")?.value || 0);
    const transactionReference = form.querySelector("#payment-confirmation")?.value.trim();
    const notes = form.querySelector("#payment-notes")?.value.trim() || null;

    if (!paymentMethod || !paymentType || amount <= 0 || !transactionReference) {
      alert("Choose Zelle or Venmo and complete the payment confirmation details.");
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    const { error } = await supabase.from("payments").insert({
      family_member_id: member.id,
      amount,
      payment_type: paymentType,
      payment_method: paymentMethod,
      transaction_reference: transactionReference,
      notes,
      payment_status: "pending"
    });

    if (submitButton) submitButton.disabled = false;

    if (error) {
      alert("Your payment confirmation could not be submitted. Please try again or contact the reunion committee.");
      return;
    }

    alert("Your payment was submitted as pending. The committee will confirm it after the payment is received.");
    window.location.href = "member.html#payment-history";
  });
})();

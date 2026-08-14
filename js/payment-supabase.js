(async function () {
  const supabase = window.HayesSupabase?.getClient();
  const form = document.querySelector(".payment-form");
  if (!supabase || !form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    alert("Payment confirmations are committee-recorded for now. Ask an admin to record this payment from the committee dashboard.");
  });
})();

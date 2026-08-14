(async function () {
  const supabase = window.HayesSupabase?.getClient();
  const dashboard = document.querySelector("[data-member-dashboard]");
  if (!supabase || !dashboard) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return;

  const [{ data: member }, { data: registration }, { data: payments }, { data: activities }] = await Promise.all([
    supabase.from("family_members").select("*").eq("id", user.id).single(),
    supabase.from("reunion_registrations").select("*").eq("family_member_id", user.id).maybeSingle(),
    supabase.from("payments").select("*").eq("family_member_id", user.id).order("payment_date", { ascending: false }),
    supabase
      .from("activity_registrations")
      .select("number_of_attendees, amount_due, amount_paid, registration_status, activities(activity_name, activity_date, start_time, location)")
      .eq("family_member_id", user.id)
  ]);

  if (!member) return;

  const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim();
  const title = dashboard.querySelector("[data-member-name]");
  const note = dashboard.querySelector("[data-member-note]");
  if (title) title.textContent = fullName || user.email;
  if (note) note.textContent = member.household_name ? `Primary contact for ${member.household_name}.` : "Primary contact profile.";

  const values = {
    totalRegistered: registration?.number_of_guests ?? 1,
    status: registration?.registration_status ?? "Pending",
    totalDue: window.HayesSupabase.formatCurrency(registration?.total_amount_due),
    paid: window.HayesSupabase.formatCurrency(registration?.total_amount_paid),
    balance: window.HayesSupabase.formatCurrency(registration?.balance_remaining)
  };

  Object.entries(values).forEach(([key, value]) => {
    const node = dashboard.querySelector(`[data-member-metric="${key}"] strong`);
    if (node) node.textContent = value;
  });

  const paymentBody = dashboard.querySelector("[data-payment-history]");
  if (paymentBody && Array.isArray(payments)) {
    paymentBody.innerHTML = payments.map((payment) => `
      <tr>
        <td>${payment.payment_date || ""}</td>
        <td>${payment.payment_type || "Payment"}</td>
        <td>${window.HayesSupabase.formatCurrency(payment.amount)}</td>
        <td>${payment.payment_method || ""}</td>
      </tr>
    `).join("");
  }

  const activityBody = dashboard.querySelector("[data-member-activities]");
  if (activityBody && Array.isArray(activities)) {
    activityBody.innerHTML = activities.map((item) => {
      const activity = item.activities || {};
      return `
        <tr>
          <td>${activity.activity_name || ""}</td>
          <td>${activity.activity_date || ""}</td>
          <td>${activity.start_time || "TBD"}</td>
          <td>${activity.location || "TBD"}</td>
          <td>${item.number_of_attendees || 0}</td>
        </tr>
      `;
    }).join("");
  }
})();

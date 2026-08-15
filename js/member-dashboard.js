(async function () {
  const supabase = window.HayesSupabase?.getClient();
  const dashboard = document.querySelector("[data-member-dashboard]");
  if (!supabase || !dashboard) return;

  const formatCurrency = window.HayesSupabase.formatCurrency;
  const missing = "Not recorded";

  function text(value, fallback = missing) {
    const normalized = value === null || value === undefined ? "" : String(value).trim();
    return normalized || fallback;
  }

  function escapeHtml(value) {
    return text(value, "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function formatLabel(value) {
    return text(value)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatDate(value) {
    if (!value) return "TBD";
    const [year, month, day] = String(value).split("-").map(Number);
    if (!year || !month || !day) return text(value, "TBD");
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatTime(value) {
    if (!value) return "TBD";
    const [hours, minutes] = String(value).split(":");
    if (hours === undefined || minutes === undefined) return text(value, "TBD");
    return new Date(1970, 0, 1, Number(hours), Number(minutes)).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function fullName(member) {
    return `${member?.first_name || ""} ${member?.last_name || ""}`.trim();
  }

  function setMetric(key, value) {
    const node = dashboard.querySelector(`[data-member-metric="${key}"] strong`);
    if (node) node.textContent = value;
  }

  function showEmpty(selector, colspan, message) {
    const body = dashboard.querySelector(selector);
    if (body) body.innerHTML = `<tr><td colspan="${colspan}">${escapeHtml(message)}</td></tr>`;
  }

  function getOptionalValue(record, keys) {
    const key = keys.find((candidate) => record && record[candidate] !== undefined && record[candidate] !== null && String(record[candidate]).trim() !== "");
    return key ? record[key] : null;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) {
    const title = dashboard.querySelector("[data-member-name]");
    const note = dashboard.querySelector("[data-member-note]");
    if (title) title.textContent = "Please sign in";
    if (note) note.textContent = "Sign in to view your household dashboard.";
    ["totalRegistered", "status", "totalDue", "paid", "balance"].forEach((key) => setMetric(key, missing));
    showEmpty("[data-household-members]", 4, "Sign in to view registered family members.");
    showEmpty("[data-member-activities]", 5, "Sign in to view registered activities.");
    showEmpty("[data-payment-history]", 4, "Sign in to view payment history.");
    return;
  }

  const { data: member, error: memberError } = await supabase
    .from("family_members")
    .select("*")
    .eq("id", user.id)
    .single();

  if (memberError || !member) {
    console.warn("Member profile could not be loaded.", memberError);
    const title = dashboard.querySelector("[data-member-name]");
    const note = dashboard.querySelector("[data-member-note]");
    if (title) title.textContent = user.email || "Member account";
    if (note) note.textContent = "Your member profile is not available yet.";
    ["totalRegistered", "status", "totalDue", "paid", "balance"].forEach((key) => setMetric(key, missing));
    showEmpty("[data-household-members]", 4, "No registered family members found yet.");
    showEmpty("[data-member-activities]", 5, "No activities registered yet.");
    showEmpty("[data-payment-history]", 4, "No payments recorded yet.");
    return;
  }

  const householdName = member.household_name;
  const householdMembersQuery = householdName
    ? supabase.from("family_members").select("*").eq("household_name", householdName).order("last_name", { ascending: true })
    : Promise.resolve({ data: [member], error: null });
  const householdQuery = householdName
    ? supabase.from("households").select("*").eq("household_name", householdName).maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [
    { data: household, error: householdError },
    { data: householdMembers, error: householdMembersError },
    { data: registration, error: registrationError },
    { data: payments, error: paymentsError },
    { data: activities, error: activitiesError }
  ] = await Promise.all([
    householdQuery,
    householdMembersQuery,
    supabase.from("reunion_registrations").select("*").eq("family_member_id", user.id).maybeSingle(),
    supabase.from("payments").select("*").eq("family_member_id", user.id).order("payment_date", { ascending: false }),
    supabase
      .from("activity_registrations")
      .select("*, activities(activity_name, activity_date, start_time, location)")
      .eq("family_member_id", user.id)
      .order("created_at", { ascending: false })
  ]);

  [
    householdError,
    householdMembersError,
    registrationError,
    paymentsError,
    activitiesError
  ].filter(Boolean).forEach((error) => console.warn("Member dashboard query warning.", error));

  const title = dashboard.querySelector("[data-member-name]");
  const note = dashboard.querySelector("[data-member-note]");
  if (title) title.textContent = fullName(member) || user.email || "Member account";
  if (note) note.textContent = householdName ? `Household: ${householdName}` : "Household name not recorded yet.";

  const memberRows = Array.isArray(householdMembers) && householdMembers.length ? householdMembers : [member];
  const totalRegistered = household?.total_family_members || registration?.number_of_guests || memberRows.length || 0;
  const totalDue = household?.total_amount_due ?? registration?.total_amount_due ?? 0;
  const totalPaid = household?.total_amount_paid ?? registration?.total_amount_paid ?? 0;
  const balance = household?.balance_remaining ?? registration?.balance_remaining ?? Number(totalDue || 0) - Number(totalPaid || 0);

  setMetric("totalRegistered", String(totalRegistered));
  setMetric("status", formatLabel(registration?.registration_status || "pending"));
  setMetric("totalDue", formatCurrency(totalDue));
  setMetric("paid", formatCurrency(totalPaid));
  setMetric("balance", formatCurrency(balance));

  const householdBody = dashboard.querySelector("[data-household-members]");
  if (householdBody) {
    householdBody.innerHTML = memberRows.length
      ? memberRows.map((row) => `
        <tr>
          <td>${escapeHtml(row.first_name)}</td>
          <td>${escapeHtml(row.last_name)}</td>
          <td>${escapeHtml(formatLabel(getOptionalValue(row, ["registration_type", "member_type", "attendee_type"])))}</td>
          <td>${escapeHtml(getOptionalValue(row, ["t_shirt_size", "tshirt_size", "shirt_size", "tee_shirt_size"]) || missing)}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">No registered family members found yet.</td></tr>`;
  }

  const activityBody = dashboard.querySelector("[data-member-activities]");
  if (activityBody) {
    activityBody.innerHTML = Array.isArray(activities) && activities.length
      ? activities.map((item) => {
        const activity = item.activities || {};
        return `
          <tr>
            <td>${escapeHtml(activity.activity_name || "Activity")}</td>
            <td>${escapeHtml(formatDate(activity.activity_date))}</td>
            <td>${escapeHtml(formatTime(activity.start_time))}</td>
            <td>${escapeHtml(activity.location || "TBD")}</td>
            <td>${escapeHtml(item.number_of_attendees ?? 0)}</td>
          </tr>
        `;
      }).join("")
      : `<tr><td colspan="5">No activities registered yet.</td></tr>`;
  }

  const paymentBody = dashboard.querySelector("[data-payment-history]");
  if (paymentBody) {
    paymentBody.innerHTML = Array.isArray(payments) && payments.length
      ? payments.map((payment) => `
        <tr>
          <td>${escapeHtml(formatDate(payment.payment_date))}</td>
          <td>${escapeHtml(formatLabel(payment.payment_type || "payment"))}</td>
          <td>${escapeHtml(formatCurrency(payment.amount))}</td>
          <td>${escapeHtml(formatLabel(getOptionalValue(payment, ["payment_status", "status"]) || "recorded"))}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">No payments recorded yet.</td></tr>`;
  }
})();

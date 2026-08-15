(async function () {
  const supabase = window.HayesSupabase?.getClient();
  const dashboard = document.querySelector("[data-member-dashboard]");
  if (!supabase || !dashboard) return;

  const ADULT_PRICE = 90;
  const CHILD_PRICE = 70;
  const formatCurrency = window.HayesSupabase.formatCurrency;
  const missing = "Not recorded";
  let currentMember = null;
  let householdMembers = [];
  let activities = [];
  let activityRegistrations = [];
  let payments = [];
  let registration = null;

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

  function isPrimaryMember(member) {
    return member?.id === currentMember?.id || member?.auth_user_id === currentMember?.auth_user_id;
  }

  function isRegisteredAttendee(member) {
    return member?.attendee_status !== "not_attending" && ["adult", "child"].includes(member?.category);
  }

  function registrationTotals() {
    const registeredMembers = householdMembers.filter(isRegisteredAttendee);
    const adults = registeredMembers.filter((member) => member.category === "adult").length;
    const children = registeredMembers.filter((member) => member.category === "child").length;
    const adultSubtotal = adults * ADULT_PRICE;
    const childSubtotal = children * CHILD_PRICE;
    return {
      adults,
      children,
      totalRegistered: adults + children,
      adultSubtotal,
      childSubtotal,
      registrationTotal: adultSubtotal + childSubtotal
    };
  }

  function activitySubtotal(item) {
    const activity = item.activities || activities.find((candidate) => candidate.id === item.activity_id) || {};
    return Number(item.amount_due ?? 0) || Number(item.number_of_attendees || 0) * Number(activity.price || 0);
  }

  function activityTotal() {
    return activityRegistrations.reduce((total, item) => total + activitySubtotal(item), 0);
  }

  function paymentTotal() {
    return payments.reduce((total, payment) => total + Number(payment.amount || 0), 0);
  }

  async function syncRegistrationTotals() {
    if (!currentMember) return;
    const totals = registrationTotals();
    const activitiesAmount = activityTotal();
    const paid = paymentTotal();
    const totalDue = totals.registrationTotal + activitiesAmount;

    await supabase.from("reunion_registrations").upsert({
      family_member_id: currentMember.id,
      registration_status: totals.totalRegistered > 0 ? "registered" : "pending",
      number_of_guests: totals.totalRegistered,
      total_amount_due: totalDue,
      total_amount_paid: paid
    }, { onConflict: "family_member_id" });

    if (currentMember.household_name) {
      await supabase.from("households").upsert({
        household_name: currentMember.household_name,
        primary_contact_id: currentMember.id,
        total_family_members: totals.totalRegistered,
        total_amount_due: totalDue,
        total_amount_paid: paid
      }, { onConflict: "household_name" });
    }
  }

  function updateSummary() {
    const totals = registrationTotals();
    const activitiesAmount = activityTotal();
    const paid = paymentTotal();
    const grandTotal = totals.registrationTotal + activitiesAmount;
    const balance = grandTotal - paid;

    setMetric("totalRegistered", String(totals.totalRegistered));
    setMetric("registrationTotal", formatCurrency(totals.registrationTotal));
    setMetric("activityTotal", formatCurrency(activitiesAmount));
    setMetric("grandTotal", formatCurrency(grandTotal));
    setMetric("paid", formatCurrency(paid));
    setMetric("balance", formatCurrency(balance));
    setMetric("adultCount", String(totals.adults));
    setMetric("childCount", String(totals.children));
    setMetric("adultSubtotal", formatCurrency(totals.adultSubtotal));
    setMetric("childSubtotal", formatCurrency(totals.childSubtotal));
  }

  function shirtOptions(selectedValue) {
    const sizes = ["", "Adult Small", "Adult Medium", "Adult Large", "Adult XL", "Adult XXL", "Youth Small", "Youth Medium", "Youth Large", "No shirt"];
    return sizes.map((size) => {
      const selected = size === (selectedValue || "") ? " selected" : "";
      return `<option value="${escapeHtml(size)}"${selected}>${escapeHtml(size || "Not selected")}</option>`;
    }).join("");
  }

  function mealOptions(selectedValue) {
    const meals = [
      ["", "Not selected"],
      ["steak", "Steak"],
      ["chicken", "Chicken"],
      ["vegetarian", "Vegetarian"]
    ];
    return meals.map(([value, label]) => {
      const selected = value === (selectedValue || "") ? " selected" : "";
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
    }).join("");
  }

  function attendeeFields(member, fieldName) {
    return `
      <label>First name
        <input data-${fieldName}-field="first_name" type="text" value="${escapeHtml(member.first_name)}" required>
      </label>
      <label>Last name
        <input data-${fieldName}-field="last_name" type="text" value="${escapeHtml(member.last_name)}" required>
      </label>
      <label>Category
        <select data-${fieldName}-field="category" required>
          <option value="">Not selected</option>
          <option value="adult"${member.category === "adult" ? " selected" : ""}>Adult</option>
          <option value="child"${member.category === "child" ? " selected" : ""}>Child</option>
        </select>
      </label>
      <label>T-shirt size
        <select data-${fieldName}-field="t_shirt_size">
          ${shirtOptions(member.t_shirt_size)}
        </select>
      </label>
      <label>Banquet Meal Choice
        <select data-${fieldName}-field="banquet_meal_choice">
          ${mealOptions(member.banquet_meal_choice)}
        </select>
      </label>
    `;
  }

  function renderPrimaryAccountHolder() {
    const container = dashboard.querySelector("[data-primary-account-holder]");
    if (!container) return;

    if (!currentMember) {
      container.innerHTML = "<p>Sign in to manage the primary account holder.</p>";
      return;
    }

    container.innerHTML = `
      <form class="primary-account-form" data-primary-account-form>
        <div class="attendee-row">
          ${attendeeFields(currentMember, "primary")}
        </div>
        <button class="button primary" type="submit">Save Primary Account Holder</button>
      </form>
    `;
  }

  function renderHouseholdMembers() {
    const body = dashboard.querySelector("[data-household-members]");
    if (!body) return;
    const additionalMembers = householdMembers.filter((member) => !isPrimaryMember(member));

    if (!additionalMembers.length) {
      showEmpty("[data-household-members]", 6, "No additional family members added yet.");
      return;
    }

    body.innerHTML = additionalMembers.map((member) => `
        <tr data-family-member-id="${escapeHtml(member.id)}">
          <td><input data-member-field="first_name" type="text" value="${escapeHtml(member.first_name)}" aria-label="First name for ${escapeHtml(fullName(member))}"></td>
          <td><input data-member-field="last_name" type="text" value="${escapeHtml(member.last_name)}" aria-label="Last name for ${escapeHtml(fullName(member))}"></td>
          <td>
            <select data-member-field="category" aria-label="Category for ${escapeHtml(fullName(member))}">
              <option value="">Not selected</option>
              <option value="adult"${member.category === "adult" ? " selected" : ""}>Adult</option>
              <option value="child"${member.category === "child" ? " selected" : ""}>Child</option>
            </select>
          </td>
          <td>
            <select data-member-field="t_shirt_size" aria-label="T-shirt size for ${escapeHtml(fullName(member))}">
              ${shirtOptions(member.t_shirt_size)}
            </select>
          </td>
          <td>
            <select data-member-field="banquet_meal_choice" aria-label="Banquet meal choice for ${escapeHtml(fullName(member))}">
              ${mealOptions(member.banquet_meal_choice)}
            </select>
          </td>
          <td>
            <div class="member-actions">
              <button class="button secondary" type="button" data-save-family-member="${escapeHtml(member.id)}">Save</button>
              <button class="button secondary" type="button" data-remove-family-member="${escapeHtml(member.id)}">Remove</button>
            </div>
          </td>
        </tr>
      `).join("");
  }

  function renderActivitySelections() {
    const availableBody = dashboard.querySelector("[data-available-activities]");
    if (!availableBody) return;

    if (!activities.length) {
      showEmpty("[data-available-activities]", 8, "No activities available yet.");
      return;
    }

    availableBody.innerHTML = activities.map((activity) => {
      const existing = activityRegistrations.find((item) => item.activity_id === activity.id);
      const quantity = existing?.number_of_attendees || 0;
      const subtotal = quantity * Number(activity.price || 0);
      return `
        <tr data-activity-id="${escapeHtml(activity.id)}">
          <td>${escapeHtml(activity.activity_name)}</td>
          <td>${escapeHtml(formatDate(activity.activity_date))}</td>
          <td>${escapeHtml(formatTime(activity.start_time))}</td>
          <td>${escapeHtml(activity.location || "TBD")}</td>
          <td>${escapeHtml(formatCurrency(activity.price))}</td>
          <td><input class="activity-quantity" data-activity-quantity type="number" min="0" value="${escapeHtml(quantity)}" aria-label="Quantity for ${escapeHtml(activity.activity_name)}"></td>
          <td data-activity-subtotal>${escapeHtml(formatCurrency(subtotal))}</td>
          <td>
            <div class="member-actions">
              <button class="button secondary" type="button" data-save-activity="${escapeHtml(activity.id)}">Save</button>
              ${existing ? `<button class="button secondary" type="button" data-remove-activity="${escapeHtml(activity.id)}">Remove</button>` : ""}
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderRegisteredActivities() {
    const activityBody = dashboard.querySelector("[data-member-activities]");
    if (!activityBody) return;

    activityBody.innerHTML = activityRegistrations.length
      ? activityRegistrations.map((item) => {
        const activity = item.activities || activities.find((candidate) => candidate.id === item.activity_id) || {};
        return `
          <tr>
            <td>${escapeHtml(activity.activity_name || "Activity")}</td>
            <td>${escapeHtml(formatDate(activity.activity_date))}</td>
            <td>${escapeHtml(formatTime(activity.start_time))}</td>
            <td>${escapeHtml(activity.location || "TBD")}</td>
            <td>${escapeHtml(item.number_of_attendees ?? 0)}</td>
            <td>${escapeHtml(formatCurrency(activitySubtotal(item)))}</td>
          </tr>
        `;
      }).join("")
      : `<tr><td colspan="6">No activities registered yet.</td></tr>`;
  }

  function renderPaymentHistory() {
    const paymentBody = dashboard.querySelector("[data-payment-history]");
    if (!paymentBody) return;

    paymentBody.innerHTML = payments.length
      ? payments.map((payment) => `
        <tr>
          <td>${escapeHtml(formatDate(payment.payment_date))}</td>
          <td>${escapeHtml(formatLabel(payment.payment_type || "payment"))}</td>
          <td>${escapeHtml(formatCurrency(payment.amount))}</td>
          <td>${escapeHtml(formatLabel(payment.payment_status || payment.status || "recorded"))}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">No payments recorded yet.</td></tr>`;
  }

  async function loadDashboard() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      currentMember = null;
      householdMembers = [];
      const title = dashboard.querySelector("[data-member-name]");
      const note = dashboard.querySelector("[data-member-note]");
      if (title) title.textContent = "Please sign in";
      if (note) note.textContent = "Sign in to view your household dashboard.";
      ["totalRegistered", "registrationTotal", "activityTotal", "grandTotal", "paid", "balance", "adultCount", "childCount", "adultSubtotal", "childSubtotal"].forEach((key) => setMetric(key, missing));
      renderPrimaryAccountHolder();
      showEmpty("[data-household-members]", 6, "Sign in to view registered family members.");
      showEmpty("[data-available-activities]", 8, "Sign in to view available activities.");
      showEmpty("[data-member-activities]", 6, "Sign in to view registered activities.");
      showEmpty("[data-payment-history]", 4, "Sign in to view payment history.");
      return;
    }

    const { data: member, error: memberError } = await supabase
      .from("family_members")
      .select("*")
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .single();

    if (memberError || !member) {
      currentMember = null;
      householdMembers = [];
      console.warn("Member profile could not be loaded.", memberError);
      const title = dashboard.querySelector("[data-member-name]");
      const note = dashboard.querySelector("[data-member-note]");
      if (title) title.textContent = user.email || "Member account";
      if (note) note.textContent = "Your member profile is not available yet.";
      ["totalRegistered", "registrationTotal", "activityTotal", "grandTotal", "paid", "balance", "adultCount", "childCount", "adultSubtotal", "childSubtotal"].forEach((key) => setMetric(key, missing));
      renderPrimaryAccountHolder();
      showEmpty("[data-household-members]", 6, "No registered family members found yet.");
      showEmpty("[data-available-activities]", 8, "No activities available yet.");
      showEmpty("[data-member-activities]", 6, "No activities registered yet.");
      showEmpty("[data-payment-history]", 4, "No payments recorded yet.");
      return;
    }

    currentMember = member;
    const householdName = member.household_name;
    const [
      { data: membersData, error: membersError },
      { data: registrationData, error: registrationError },
      { data: paymentsData, error: paymentsError },
      { data: activitiesData, error: activitiesError },
      { data: activityRegistrationsData, error: activityRegistrationsError }
    ] = await Promise.all([
      householdName
        ? supabase.from("family_members").select("*").eq("household_name", householdName).order("created_at", { ascending: true })
        : Promise.resolve({ data: [member], error: null }),
      supabase.from("reunion_registrations").select("*").eq("family_member_id", member.id).maybeSingle(),
      supabase.from("payments").select("*").eq("family_member_id", member.id).order("payment_date", { ascending: false }),
      supabase.from("activities").select("*").order("activity_date", { ascending: true }),
      supabase
        .from("activity_registrations")
        .select("*, activities(activity_name, activity_date, start_time, location, price)")
        .eq("family_member_id", member.id)
        .order("created_at", { ascending: false })
    ]);

    [membersError, registrationError, paymentsError, activitiesError, activityRegistrationsError]
      .filter(Boolean)
      .forEach((error) => console.warn("Member dashboard query warning.", error));

    householdMembers = Array.isArray(membersData) && membersData.length ? membersData : [member];
    registration = registrationData || null;
    payments = Array.isArray(paymentsData) ? paymentsData : [];
    activities = Array.isArray(activitiesData) ? activitiesData : [];
    activityRegistrations = Array.isArray(activityRegistrationsData) ? activityRegistrationsData : [];

    const title = dashboard.querySelector("[data-member-name]");
    const note = dashboard.querySelector("[data-member-note]");
    if (title) title.textContent = fullName(member) || user.email || "Member account";
    if (note) note.textContent = householdName ? `Household: ${householdName}` : "Household name not recorded yet.";

    renderPrimaryAccountHolder();
    renderHouseholdMembers();
    renderActivitySelections();
    renderRegisteredActivities();
    renderPaymentHistory();
    updateSummary();
    await syncRegistrationTotals();
  }

  dashboard.querySelector("[data-family-member-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentMember?.household_name) {
      alert("Your household profile is not available yet.");
      return;
    }

    const form = event.currentTarget;
    const firstName = form.querySelector("#family-first-name")?.value.trim();
    const lastName = form.querySelector("#family-last-name")?.value.trim();
    const category = form.querySelector("#family-category")?.value;
    const tShirtSize = form.querySelector("#family-shirt")?.value || null;
    const banquetMealChoice = form.querySelector("#family-meal")?.value || null;

    if (!firstName || !lastName || !category) {
      alert("Please enter first name, last name and category.");
      return;
    }

    const { error } = await supabase.from("family_members").insert({
      first_name: firstName,
      last_name: lastName,
      household_name: currentMember.household_name,
      category,
      t_shirt_size: tShirtSize,
      banquet_meal_choice: banquetMealChoice,
      attendee_status: "registered",
      is_primary_contact: false,
      role: "member"
    });

    if (error) {
      alert(error.message);
      return;
    }

    form.reset();
    await loadDashboard();
  });

  dashboard.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-primary-account-form]");
    if (!form) return;
    event.preventDefault();

    const payload = { attendee_status: "registered" };
    form.querySelectorAll("[data-primary-field]").forEach((input) => {
      payload[input.getAttribute("data-primary-field")] = input.value || null;
    });

    if (!payload.first_name || !payload.last_name || !payload.category) {
      alert("Please enter first name, last name and category.");
      return;
    }

    const { error } = await supabase.from("family_members").update(payload).eq("id", currentMember.id);
    if (error) {
      alert(error.message);
      return;
    }

    await loadDashboard();
  });

  dashboard.addEventListener("click", async (event) => {
    const saveMemberButton = event.target.closest("[data-save-family-member]");
    const removeMemberButton = event.target.closest("[data-remove-family-member]");
    const saveActivityButton = event.target.closest("[data-save-activity]");
    const removeActivityButton = event.target.closest("[data-remove-activity]");

    if (saveMemberButton) {
      const id = saveMemberButton.getAttribute("data-save-family-member");
      const row = saveMemberButton.closest("tr");
      const payload = {};
      row.querySelectorAll("[data-member-field]").forEach((input) => {
        payload[input.getAttribute("data-member-field")] = input.value || null;
      });
      const { error } = await supabase.from("family_members").update(payload).eq("id", id);
      if (error) alert(error.message);
      await loadDashboard();
      return;
    }

    if (removeMemberButton) {
      const id = removeMemberButton.getAttribute("data-remove-family-member");
      const { error } = await supabase.from("family_members").delete().eq("id", id);
      if (error) alert(error.message);
      await loadDashboard();
      return;
    }

    if (saveActivityButton) {
      const activityId = saveActivityButton.getAttribute("data-save-activity");
      const activity = activities.find((item) => item.id === activityId);
      const row = saveActivityButton.closest("tr");
      const quantity = Number(row.querySelector("[data-activity-quantity]")?.value || 0);

      if (!activity || quantity < 1) {
        alert("Choose a quantity of at least 1 to save this activity.");
        return;
      }

      const existing = activityRegistrations.find((item) => item.activity_id === activityId);
      const { error } = await supabase.from("activity_registrations").upsert({
        family_member_id: currentMember.id,
        activity_id: activityId,
        number_of_attendees: quantity,
        amount_due: quantity * Number(activity.price || 0),
        amount_paid: existing?.amount_paid || 0,
        registration_status: "registered"
      }, { onConflict: "family_member_id,activity_id" });

      if (error) alert(error.message);
      await loadDashboard();
      return;
    }

    if (removeActivityButton) {
      const activityId = removeActivityButton.getAttribute("data-remove-activity");
      const { error } = await supabase
        .from("activity_registrations")
        .delete()
        .eq("family_member_id", currentMember.id)
        .eq("activity_id", activityId);
      if (error) alert(error.message);
      await loadDashboard();
    }
  });

  dashboard.addEventListener("input", (event) => {
    const input = event.target.closest("[data-activity-quantity]");
    if (!input) return;
    const row = input.closest("tr");
    const activity = activities.find((item) => item.id === row.getAttribute("data-activity-id"));
    const subtotal = Number(input.value || 0) * Number(activity?.price || 0);
    const subtotalCell = row.querySelector("[data-activity-subtotal]");
    if (subtotalCell) subtotalCell.textContent = formatCurrency(subtotal);
  });

  await loadDashboard();
})();

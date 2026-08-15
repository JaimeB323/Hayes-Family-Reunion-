(async function () {
  const supabase = window.HayesSupabase?.getClient();
  const dashboard = document.querySelector("[data-member-dashboard]");
  if (!supabase || !dashboard) return;

  const ADULT_PRICE = 90;
  const CHILD_PRICE = 70;
  const formatCurrency = window.HayesSupabase.formatCurrency;
  const missing = "Not recorded";
  let authenticatedUser = null;
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
    return payments
      .filter((payment) => payment.payment_status !== "pending")
      .reduce((total, payment) => total + Number(payment.amount || 0), 0);
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

    const balanceNode = dashboard.querySelector("[data-account-balance]");
    if (balanceNode) balanceNode.textContent = formatCurrency(balance);
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
    const attendee = member || {};
    return `
      <label>First name
        <input data-${fieldName}-field="first_name" type="text" value="${escapeHtml(attendee.first_name)}" autocomplete="given-name" required>
      </label>
      <label>Last name
        <input data-${fieldName}-field="last_name" type="text" value="${escapeHtml(attendee.last_name)}" autocomplete="family-name" required>
      </label>
      <label>Category
        <select data-${fieldName}-field="category" required>
          <option value="">Not selected</option>
          <option value="adult"${attendee.category === "adult" ? " selected" : ""}>Adult</option>
          <option value="child"${attendee.category === "child" ? " selected" : ""}>Child</option>
        </select>
      </label>
      <label>T-shirt size
        <select data-${fieldName}-field="t_shirt_size">
          ${shirtOptions(attendee.t_shirt_size)}
        </select>
      </label>
      <label>Banquet Meal Choice
        <select data-${fieldName}-field="banquet_meal_choice">
          ${mealOptions(attendee.banquet_meal_choice)}
        </select>
      </label>
    `;
  }

  function primaryAccountDetails(member) {
    const profile = member || {};
    const householdReadonly = member ? " readonly" : "";
    return `
      <div class="primary-account-details">
        <label>Family / household name
          <input data-primary-field="household_name" type="text" value="${escapeHtml(profile.household_name)}" autocomplete="organization" placeholder="Example: Thompson-Hayes Household" required${householdReadonly}>
        </label>
        <label>Login email
          <input type="email" value="${escapeHtml(profile.email || authenticatedUser?.email)}" autocomplete="email" readonly>
        </label>
        <label>Phone
          <input data-primary-field="phone" type="tel" value="${escapeHtml(profile.phone)}" autocomplete="tel" placeholder="(000) 000-0000">
        </label>
        <label>Expected arrival
          <select data-primary-field="expected_arrival">
            <option value="">To be confirmed</option>
            ${["Thursday", "Friday", "Saturday"].map((day) => `<option value="${day}"${profile.expected_arrival === day ? " selected" : ""}>${day}</option>`).join("")}
          </select>
        </label>
      </div>
    `;
  }

  function renderPrimaryAccountHolder() {
    const container = dashboard.querySelector("[data-primary-account-holder]");
    const heading = dashboard.querySelector("[data-household-heading]");
    const panel = container?.closest(".primary-account-holder");
    if (!container) return;

    if (!authenticatedUser) {
      panel?.classList.remove("has-account");
      if (heading) heading.textContent = "Household Account";
      container.innerHTML = "<p>Sign in to manage the primary account holder.</p>";
      return;
    }

    if (currentMember) {
      panel?.classList.add("has-account");
      const accountName = fullName(currentMember) || "Member";
      if (heading) heading.textContent = `${accountName} Household`;
      container.innerHTML = `
        <div class="account-save-controls">
          <label class="expected-arrival-control">
            <span>Expected Arrival</span>
            <select data-expected-arrival aria-label="Expected arrival day">
              <option value="">Choose a day</option>
              ${["Thursday", "Friday", "Saturday"].map((day) => `<option value="${day}"${currentMember.expected_arrival === day ? " selected" : ""}>${day}</option>`).join("")}
            </select>
          </label>
          <button class="button primary" type="button" data-save-account-changes>Save Changes</button>
          <span class="save-confirmation" data-account-save-status aria-live="polite"></span>
        </div>
      `;
      return;
    }

    panel?.classList.remove("has-account");
    if (heading) heading.textContent = "Complete Household Setup";

    const metadata = authenticatedUser.user_metadata || {};
    const firstName = metadata.first_name || "";
    const lastName = metadata.last_name || "";
    const setupMember = {
      first_name: firstName,
      last_name: lastName,
      household_name: [firstName, lastName, "Household"].filter(Boolean).join(" ")
    };

    container.innerHTML = `
      <form class="primary-account-form" data-primary-account-form>
        ${primaryAccountDetails(setupMember)}
        <div class="attendee-row">
          ${attendeeFields(setupMember, "primary")}
        </div>
        <button class="button primary" type="submit">Complete Account Setup</button>
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
    const select = dashboard.querySelector("[data-activity-selection]");
    const details = dashboard.querySelector("[data-activity-selection-details]");
    if (!select) return;

    if (!activities.length) {
      select.innerHTML = '<option value="">No activities available yet</option>';
      select.disabled = true;
      if (details) details.textContent = "New activities will appear here when they are available.";
      return;
    }

    const availableActivities = activities.filter((activity) => !activityRegistrations.some((item) => item.activity_id === activity.id));
    select.disabled = !availableActivities.length;
    select.innerHTML = availableActivities.length
      ? `<option value="">Choose an activity</option>${availableActivities.map((activity) => `<option value="${escapeHtml(activity.id)}">${escapeHtml(activity.activity_name)} - ${escapeHtml(formatCurrency(activity.price))}</option>`).join("")}`
      : '<option value="">All available activities have been purchased</option>';
    if (details) details.textContent = availableActivities.length
      ? "Select an activity to see its details."
      : "Your selected activities are listed below.";
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
            <td><button class="button secondary" type="button" data-remove-activity="${escapeHtml(item.activity_id)}">Remove</button></td>
          </tr>
        `;
      }).join("")
      : `<tr><td colspan="7">No activities purchased yet.</td></tr>`;

    const totalNode = dashboard.querySelector("[data-activity-purchase-total]");
    if (totalNode) totalNode.textContent = formatCurrency(activityTotal());
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
          <td><span class="payment-status ${payment.payment_status === "pending" ? "pending" : "confirmed"}">${escapeHtml(formatLabel(payment.payment_status || "confirmed"))}</span></td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">No payments recorded yet.</td></tr>`;
  }

  async function loadDashboard() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    authenticatedUser = user || null;
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
      const activitySelect = dashboard.querySelector("[data-activity-selection]");
      if (activitySelect) activitySelect.innerHTML = '<option value="">Sign in to view activities</option>';
      showEmpty("[data-member-activities]", 7, "Sign in to view purchased activities.");
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
      if (note) note.textContent = "Complete the Primary Account Holder section below to begin your household registration.";
      ["totalRegistered", "registrationTotal", "activityTotal", "grandTotal", "paid", "balance", "adultCount", "childCount", "adultSubtotal", "childSubtotal"].forEach((key) => setMetric(key, missing));
      renderPrimaryAccountHolder();
      showEmpty("[data-household-members]", 6, "No registered family members found yet.");
      const activitySelect = dashboard.querySelector("[data-activity-selection]");
      if (activitySelect) activitySelect.innerHTML = '<option value="">Complete account setup to view activities</option>';
      showEmpty("[data-member-activities]", 7, "No activities purchased yet.");
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

    if (!authenticatedUser) {
      alert("Please sign in before completing your account.");
      return;
    }

    const payload = { attendee_status: "registered" };
    form.querySelectorAll("[data-primary-field]").forEach((input) => {
      payload[input.getAttribute("data-primary-field")] = input.value || null;
    });

    if (!payload.household_name || !payload.first_name || !payload.last_name || !payload.category) {
      alert("Please enter your household name, first name, last name and category.");
      return;
    }

    const profilePayload = {
      ...payload,
      email: authenticatedUser.email,
      role: "member",
      is_primary_contact: true
    };

    let profileError;
    if (currentMember) {
      const result = await supabase.from("family_members").update(profilePayload).eq("id", currentMember.id);
      profileError = result.error;
    } else {
      const result = await supabase.from("family_members").insert({
        ...profilePayload,
        id: authenticatedUser.id,
        auth_user_id: authenticatedUser.id
      });
      profileError = result.error;
    }

    if (profileError) {
      alert(profileError.message);
      return;
    }

    if (!currentMember) {
      const { error: householdError } = await supabase.from("households").insert({
        household_name: payload.household_name,
        primary_contact_id: authenticatedUser.id,
        total_family_members: 1,
        total_amount_due: payload.category === "adult" ? ADULT_PRICE : CHILD_PRICE,
        total_amount_paid: 0
      });

      if (householdError) {
        alert("Your account was saved, but the household could not be created. Please refresh and try again.");
        await loadDashboard();
        return;
      }

      const { error: registrationError } = await supabase.from("reunion_registrations").insert({
        family_member_id: authenticatedUser.id,
        registration_status: "registered",
        number_of_guests: 1,
        total_amount_due: payload.category === "adult" ? ADULT_PRICE : CHILD_PRICE,
        total_amount_paid: 0
      });

      if (registrationError) {
        alert("Your account was saved, but registration totals could not be initialized. Please refresh and try again.");
      }
    }

    await loadDashboard();
  });

  dashboard.addEventListener("click", async (event) => {
    const saveMemberButton = event.target.closest("[data-save-family-member]");
    const removeMemberButton = event.target.closest("[data-remove-family-member]");
    const removeActivityButton = event.target.closest("[data-remove-activity]");
    const saveAccountButton = event.target.closest("[data-save-account-changes]");
    const refreshPaymentsButton = event.target.closest("[data-refresh-payments]");
    const accountBalanceButton = event.target.closest("[data-account-balance-button]");

    if (accountBalanceButton) {
      const status = dashboard.querySelector("[data-payment-refresh-status]");
      if (status) status.textContent = "Balance reflects confirmed payments only.";
      return;
    }

    if (saveAccountButton) {
      const arrivalSelect = dashboard.querySelector("[data-expected-arrival]");
      const status = dashboard.querySelector("[data-account-save-status]");
      if (!arrivalSelect || !currentMember) return;

      saveAccountButton.disabled = true;
      if (status) status.textContent = "Saving...";
      const { error } = await supabase
        .from("family_members")
        .update({ expected_arrival: arrivalSelect.value || null })
        .eq("id", currentMember.id);
      saveAccountButton.disabled = false;

      if (error) {
        if (status) status.textContent = "Changes were not saved.";
        alert("Expected arrival could not be saved. Please try again.");
        return;
      }

      currentMember.expected_arrival = arrivalSelect.value || null;
      if (status) status.textContent = "Changes saved.";
      return;
    }

    if (refreshPaymentsButton) {
      const status = dashboard.querySelector("[data-payment-refresh-status]");
      refreshPaymentsButton.disabled = true;
      if (status) status.textContent = "Refreshing...";
      await loadDashboard();
      refreshPaymentsButton.disabled = false;
      const refreshedStatus = dashboard.querySelector("[data-payment-refresh-status]");
      if (refreshedStatus) refreshedStatus.textContent = "Payment history updated.";
      return;
    }

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

  dashboard.querySelector("[data-activity-purchase-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentMember) {
      alert("Complete your household setup before selecting activities.");
      return;
    }

    const form = event.currentTarget;
    const activityId = form.querySelector("[data-activity-selection]")?.value;
    const quantity = Number(form.querySelector("[data-activity-purchase-quantity]")?.value || 0);
    const activity = activities.find((item) => item.id === activityId);

    if (!activity || quantity < 1) {
      alert("Choose an activity and a quantity of at least 1.");
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    const { error } = await supabase.from("activity_registrations").insert({
      family_member_id: currentMember.id,
      activity_id: activityId,
      number_of_attendees: quantity,
      amount_due: quantity * Number(activity.price || 0),
      amount_paid: 0,
      registration_status: "registered"
    });
    if (submitButton) submitButton.disabled = false;

    if (error) {
      alert(error.message);
      return;
    }

    form.reset();
    await loadDashboard();
  });

  dashboard.addEventListener("change", async (event) => {
    const activitySelect = event.target.closest("[data-activity-selection]");
    if (!activitySelect) return;
    const details = dashboard.querySelector("[data-activity-selection-details]");
    const activity = activities.find((item) => item.id === activitySelect.value);
    if (!details) return;
    details.textContent = activity
      ? `${formatDate(activity.activity_date)} at ${formatTime(activity.start_time)} | ${activity.location || "TBD"} | ${formatCurrency(activity.price)} per person`
      : "Select an activity to see its details.";
  });

  await loadDashboard();
})();

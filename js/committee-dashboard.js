(async function () {
  const supabase = window.HayesSupabase?.getClient();
  const dashboard = document.querySelector("[data-committee-dashboard]");
  if (!supabase || !dashboard) return;

  const { data: members, error } = await supabase
    .from("family_members")
    .select("id, first_name, last_name, email, phone, household_name, role, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Committee dashboard data unavailable:", error.message);
    return;
  }

  const memberBody = dashboard.querySelector("[data-admin-members]");
  if (memberBody && Array.isArray(members)) {
    memberBody.innerHTML = members.map((member) => `
      <tr>
        <td>${member.first_name || ""} ${member.last_name || ""}</td>
        <td>${member.household_name || ""}</td>
        <td>${member.email || ""}</td>
        <td>${member.role || "member"}</td>
      </tr>
    `).join("");
  }
})();

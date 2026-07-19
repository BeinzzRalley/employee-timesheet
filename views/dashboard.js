// Employee - personal clock status, hours, leave counts
// Supervisor - admin-style dashboard only to their dept
// System Admin - overview of company

function renderDashboard(db, account) {
  const page = document.createElement("div");
  page.className = "page";

  if (isWorkforceDashboard(account)) {
    const dept = departmentName(db, account);
    const subtitle = isSupervisor(account)
      ? (dept ? `Attendance overview for ${dept}` : "Department attendance overview")
      : "Company-wide workforce attendance and activity";

    page.appendChild(pageHeader("Dashboard", subtitle));

    const stats = db.dashboardStats;
    if (stats && stats.headcount) {
      page.appendChild(buildAdminStatGrid(stats, account));
      page.appendChild(buildAdminDetailGrid(stats, account));
    } else {
      page.appendChild(buildAdminStatGridFallback(db, account));
      const note = document.createElement("div");
      note.className = "alert-error";
      note.style.margin = "12px 0 0";
      note.textContent = "Live dashboard stats are unavailable — showing estimates from cached data.";
      page.appendChild(note);
    }
  } else {
    const emp = linkedEmployee(db, account);
    const displayName = emp ? emp.full_name : (account ? account.username : "Employee");

    page.appendChild(pageHeader(`Welcome, ${displayName}`, "Your personal overview"));
    page.appendChild(buildEmployeeDashboard(db, account, db.dashboardStats, emp));
  }

  return page;
}

// ADMIN DASHBOARD

function buildAdminStatGrid(stats, account) {
  const h = stats.headcount;
  const scopeNote = isSupervisor(account) ? "in your department" : "across all departments";
  const grid = document.createElement("div");
  grid.className = "stat-grid";
  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Active Employees</div>
      <div class="stat-value indigo">${h.active_employees}</div>
      <div class="stat-sub">of ${h.total_employees} total · ${scopeNote}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Present Today</div>
      <div class="stat-value emerald">${h.present_today}</div>
      <div class="stat-sub">${h.late_today} arrived late</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">On Leave Today</div>
      <div class="stat-value amber">${h.on_leave_today}</div>
      <div class="stat-sub">${stats.pending_leaves} pending requests</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Not Clocked In</div>
      <div class="stat-value sky">${h.not_clocked_in}</div>
      <div class="stat-sub">active employees today</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pending Claims</div>
      <div class="stat-value amber">${stats.pending_claims ?? 0}</div>
      <div class="stat-sub">OT / holiday claims to review</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pending Reports</div>
      <div class="stat-value amber">${stats.pending_reports ?? 0}</div>
      <div class="stat-sub">attendance incidents to investigate</div>
    </div>
  `;
  return grid;
}

function buildAdminDetailGrid(stats, account) {
  const grid = document.createElement("div");
  grid.className = "grid-3";

  const deptHeader = isSupervisor(account)
    ? "Your Department Today"
    : "Department Attendance Today";

  // Department attendance
  const deptCard = document.createElement("div");
  deptCard.className = "card";
  deptCard.innerHTML = `<div class="card-header">${deptHeader}</div>`;
  if (!stats.departments || !stats.departments.length) {
    deptCard.innerHTML += `<div class="table-empty">No departments found</div>`;
  } else {
    stats.departments.forEach(d => {
      const pct = d.employee_count > 0
        ? Math.round((d.present_today / d.employee_count) * 100)
        : 0;
      const item = document.createElement("div");
      item.className = "pending-item";
      item.innerHTML = `
        <div class="pending-item-top">
          <span class="pending-item-name">${d.department_name}</span>
          <span style="font-size:0.75rem;font-weight:700;color:#6366f1">${pct}%</span>
        </div>
        <div style="height:4px;background:#f1f5f9;border-radius:4px;margin:4px 0">
          <div style="height:4px;background:${pct >= 80 ? '#34d399' : pct >= 50 ? '#fb923c' : '#f87171'};border-radius:4px;width:${pct}%"></div>
        </div>
        <div class="pending-dates">
          ${d.present_today}/${d.employee_count} present
          ${d.late_today ? ` · <span style="color:#f97316">${d.late_today} late</span>` : ""}
        </div>
      `;
      deptCard.appendChild(item);
    });
  }
  grid.appendChild(deptCard);

  // Recent clock-ins
  const recentCard = document.createElement("div");
  recentCard.className = "card";
  recentCard.innerHTML = `<div class="card-header">Recent Clock-Ins</div>`;
  const recent = stats.recent_clock_ins || [];
  if (!recent.length) {
    recentCard.innerHTML += `<div class="table-empty">No recent activity</div>`;
  } else {
    recent.slice(0, 5).forEach(r => {
      const isLate = (r.status_label || "").toLowerCase().includes("late");
      const item = document.createElement("div");
      item.className = "pending-item";
      item.innerHTML = `
        <div class="pending-item-top">
          ${avatarHTML(r.full_name || "?", "sm")}
          <span class="pending-item-name">${r.full_name || "Unknown"}</span>
          <span style="font-size:0.72rem;color:${isLate ? "#f97316" : "#16a34a"};font-weight:600;margin-left:auto">${r.status_label || ""}</span>
        </div>
        <div class="pending-dates">
          ${fmtTime(r.clock_in)}${r.clock_out ? ` → ${fmtTime(r.clock_out)}` : " <span style='color:#6366f1'>(active)</span>"}
          ${r.total_hours != null ? ` · ${Number(r.total_hours).toFixed(1)}h` : ""}
        </div>
      `;
      recentCard.appendChild(item);
    });
  }
  grid.appendChild(recentCard);

  // Weekly attendance chart
  grid.appendChild(buildWeeklyAttendanceChart(stats));

  return grid;
}

function buildWeeklyAttendanceChart(stats) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `<div class="card-header">Weekly Attendance (This Week)</div>`;

  const week = stats.weekly_attendance || [];
  if (!week.length) {
    card.innerHTML += `<div class="table-empty">No weekly data available</div>`;
    return card;
  }

  const maxVal = Math.max(...week.map(d => (d.present||0)+(d.late||0)+(d.absent||0)), 1);

  const chartWrap = document.createElement("div");
  chartWrap.style.cssText = "display:flex;align-items:flex-end;gap:10px;height:140px;padding:8px 4px 0;";

  week.forEach(day => {
    const present = day.present||0, late = day.late||0, absent = day.absent||0;
    const total   = present + late + absent;

    const col = document.createElement("div");
    col.style.cssText = "flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;";
    col.title = `${day.day_label}: ${present} present, ${late} late, ${absent} absent`;

    const barWrap = document.createElement("div");
    barWrap.style.cssText = "width:100%;display:flex;flex-direction:column-reverse;gap:1px;border-radius:6px;overflow:hidden;";
    barWrap.style.height = `${Math.round((total/maxVal)*100)}px`;

    if (absent  > 0) { const s = document.createElement("div"); s.style.cssText = `flex:${absent};background:#f87171;min-height:4px;`;  barWrap.appendChild(s); }
    if (late    > 0) { const s = document.createElement("div"); s.style.cssText = `flex:${late};background:#fb923c;min-height:4px;`;    barWrap.appendChild(s); }
    if (present > 0) { const s = document.createElement("div"); s.style.cssText = `flex:${present};background:#34d399;min-height:4px;`; barWrap.appendChild(s); }

    const label = document.createElement("div");
    label.style.cssText = "font-size:0.7rem;color:var(--text-muted);font-weight:600;margin-top:4px;";
    label.textContent = day.day_label || "—";

    col.appendChild(barWrap);
    col.appendChild(label);
    chartWrap.appendChild(col);
  });

  const legend = document.createElement("div");
  legend.style.cssText = "display:flex;gap:14px;margin-top:10px;padding:0 4px;";
  legend.innerHTML = `
    <span style="font-size:0.75rem;display:flex;align-items:center;gap:5px;color:var(--text-muted)">
      <span style="width:10px;height:10px;border-radius:3px;background:#34d399;display:inline-block"></span>Present
    </span>
    <span style="font-size:0.75rem;display:flex;align-items:center;gap:5px;color:var(--text-muted)">
      <span style="width:10px;height:10px;border-radius:3px;background:#fb923c;display:inline-block"></span>Late
    </span>
    <span style="font-size:0.75rem;display:flex;align-items:center;gap:5px;color:var(--text-muted)">
      <span style="width:10px;height:10px;border-radius:3px;background:#f87171;display:inline-block"></span>Absent
    </span>
  `;

  card.appendChild(chartWrap);
  card.appendChild(legend);
  return card;
}

function buildAdminStatGridFallback(db, account) {
  const activeEmp      = db.employees.filter(e => e.employment_status === "Active").length;
  const pending        = db.leaveRecords.filter(l => l.leave_status === "Pending").length;
  const clockedInToday = db.timeLogs.filter(l => isToday(l.clock_in)).length;
  const scopeNote = isSupervisor(account) ? "in your department" : "across all departments";
  const grid = document.createElement("div");
  grid.className = "stat-grid";
  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Active Employees</div>
      <div class="stat-value indigo">${activeEmp}</div>
      <div class="stat-sub">${scopeNote}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Clocked In Today</div>
      <div class="stat-value emerald">${clockedInToday}</div>
      <div class="stat-sub">time logs today</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pending Leaves</div>
      <div class="stat-value amber">${pending}</div>
      <div class="stat-sub">awaiting approval</div>
    </div>
  `;
  return grid;
}

// EMPLOYEE DASHBOARD

function buildEmployeeDashboard(db, account, stats, emp) {
  const wrap = document.createElement("div");

  // Stat cards row
  const grid = document.createElement("div");
  grid.className = "stat-grid";

  if (stats) {
    const clockedColor = stats.clocked_in ? "emerald" : "sky";
    const clockedLabel = stats.clocked_in ? "Clocked In" : "Not Clocked In";
    const clockSub = stats.clocked_in
      ? `since ${fmtTime(stats.clock_in)}`
      : (stats.clock_in ? `last: ${fmtTime(stats.clock_in)}` : "no clock-in today");

    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Today's Status</div>
        <div class="stat-value ${clockedColor}">${clockedLabel}</div>
        <div class="stat-sub">${stats.status_label || "—"} · ${clockSub}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Hours Today</div>
        <div class="stat-value indigo">${stats.hours_today != null ? stats.hours_today.toFixed(1) + "h" : "—"}</div>
        <div class="stat-sub">${stats.clock_out ? `out at ${fmtTime(stats.clock_out)}` : stats.clocked_in ? "still clocked in" : "—"}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pending Leaves</div>
        <div class="stat-value amber">${stats.pending_leaves}</div>
        <div class="stat-sub">awaiting approval</div>
      </div>
      ${emp ? `
      <div class="stat-card">
        <div class="stat-label">Work Schedule</div>
        <div class="stat-value indigo">${stats.assigned_schedule ? stats.assigned_schedule.schedule_name : "Unassigned"}</div>
        <div class="stat-sub">${emp.role_name || "—"}</div>
      </div>
      ` : ""}
    `;
  } else {
    const myLeaves  = db.leaveRecords.filter(l => l.employee_id === account.employee_id);
    const pending   = myLeaves.filter(l => l.leave_status === "Pending").length;
    const approved  = myLeaves.filter(l => l.leave_status === "Approved").length;
    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Pending Leaves</div>
        <div class="stat-value amber">${pending}</div>
        <div class="stat-sub">awaiting approval</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Approved Leaves</div>
        <div class="stat-value emerald">${approved}</div>
        <div class="stat-sub">total approved</div>
      </div>
      ${emp ? `
      <div class="stat-card">
        <div class="stat-label">Employment Type</div>
        <div class="stat-value indigo">${emp.employment_type_name || "—"}</div>
        <div class="stat-sub">${emp.role_name || "—"}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Status</div>
        <div class="stat-value sky">${emp.employment_status}</div>
        <div class="stat-sub">${emp.department_name || "No department"}</div>
      </div>` : ""}
    `;
  }
  wrap.appendChild(grid);

  const detailGrid = document.createElement("div");
  detailGrid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px";

  // Recent time logs
  const logsCard = document.createElement("div");
  logsCard.className = "card";
  logsCard.innerHTML = `<div class="card-header">Recent Attendance</div>`;

  const empId = account.employee_id;
  const myLogs = empId != null
    ? db.timeLogs
        .filter(l => l.employee_id == empId)
        .sort((a, b) => new Date(b.clock_in) - new Date(a.clock_in))
        .slice(0, 5)
    : [];

  if (!myLogs.length) {
    logsCard.innerHTML += `<div class="table-empty">No attendance records yet</div>`;
  } else {
    myLogs.forEach(l => {
      const isLate  = (l.status_label || "").toLowerCase().includes("late");
      const isOpen  = !l.clock_out;
      const item = document.createElement("div");
      item.className = "pending-item";
      item.innerHTML = `
        <div class="pending-item-top">
          <span class="pending-item-name" style="font-size:0.82rem">${fmtDate(l.clock_in)}</span>
          <span style="font-size:0.72rem;font-weight:700;color:${isOpen ? "#6366f1" : isLate ? "#f97316" : "#16a34a"};margin-left:auto">
            ${isOpen ? "Active" : (l.status_label || "—")}
          </span>
        </div>
        <div class="pending-dates">
          In: <b>${fmtTime(l.clock_in)}</b>
          ${l.clock_out ? ` · Out: <b>${fmtTime(l.clock_out)}</b>` : ""}
          ${l.total_hours != null ? ` · <b>${Number(l.total_hours).toFixed(2)}h</b>` : ""}
        </div>
        <div style="font-size:0.72rem;color:var(--text-muted)">${l.category_name || "—"}</div>
      `;
      logsCard.appendChild(item);
    });
  }
  detailGrid.appendChild(logsCard);

  // Leave requests
  const leavesCard = document.createElement("div");
  leavesCard.className = "card";
  leavesCard.innerHTML = `<div class="card-header">My Leave Requests</div>`;

  const myLeaves = empId != null
    ? db.leaveRecords
        .filter(l => l.employee_id == empId)
        .sort((a, b) => new Date(b.date_from) - new Date(a.date_from))
        .slice(0, 5)
    : [];

  if (!myLeaves.length) {
    leavesCard.innerHTML += `<div class="table-empty">No leave requests yet</div>`;
  } else {
    myLeaves.forEach(l => {
      const statusColor = { Approved: "#16a34a", Rejected: "#ef4444", Pending: "#d97706" }[l.leave_status] || "#6b7280";
      const item = document.createElement("div");
      item.className = "pending-item";
      item.innerHTML = `
        <div class="pending-item-top">
          <span class="pending-item-name">${l.leave_type}</span>
          <span style="font-size:0.72rem;font-weight:700;color:${statusColor};margin-left:auto">${l.leave_status}</span>
        </div>
        <div class="pending-dates">${fmtDate(l.date_from)} → ${fmtDate(l.date_to)}</div>
        ${l.remarks ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">${l.remarks}</div>` : ""}
      `;
      leavesCard.appendChild(item);
    });
  }
  detailGrid.appendChild(leavesCard);

  wrap.appendChild(detailGrid);

  // Leave balance summary
  const balances = stats && stats.leave_balance ? stats.leave_balance : [];
  if (balances.length) {
    const balCard = document.createElement("div");
    balCard.className = "card";
    balCard.style.marginTop = "20px";
    balCard.innerHTML = `<div class="card-header">Leave Balance (${new Date().getFullYear()})</div>`;
    balances.forEach(b => {
      const item = document.createElement("div");
      item.className = "pending-item";
      item.innerHTML = `
        <div class="pending-item-top">
          <span class="pending-item-name">${b.leave_name}</span>
          <span style="font-size:0.82rem;font-weight:700;color:#6366f1">${Number(b.remaining_days).toFixed(1)} days left</span>
        </div>
        <div class="pending-dates">
          Entitled: ${Number(b.entitled_days).toFixed(1)} + ${Number(b.carried_over_days).toFixed(1)} carried over
          · Used: ${Number(b.used_days).toFixed(1)}
        </div>
      `;
      balCard.appendChild(item);
    });
    wrap.appendChild(balCard);
  }

  return wrap;
}
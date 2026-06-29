// ── App state ─────────────────────────────────────────
let db          = emptyDb();
let account     = null;
let activeView  = "dashboard";
let loadError   = null;
let checkingSession = true; // true until the initial auth.php?action=me check resolves

const root = document.getElementById("app");

// ── Icons for clock/logs ──────────────────────────────
const clockIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const logsIcon  = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

// ── Boot screen ───────────────────────────────────────
// Shown only while we're checking whether an existing session cookie is
// still valid (auth.php?action=me). Keeps refreshes from flashing the
// login screen before we know if the user is actually logged in.
function renderBootScreen() {
  const wrap = document.createElement("div");
  wrap.className = "boot-screen";
  wrap.innerHTML = `
    <div class="boot-screen-icon">${icons.timer}</div>
    <div class="boot-spinner"></div>
  `;
  return wrap;
}

// Admin nav
const adminNav = [
  { id: "dashboard",     label: "Dashboard",     icon: icons.dashboard },
  { id: "employees",     label: "Employees",     icon: icons.users     },
  { id: "accounts",      label: "Accounts",      icon: icons.userPlus  },
  { id: "leave_records", label: "Leave Records", icon: icons.fileText  },
  { id: "my_logs",       label: "Time Logs",     icon: logsIcon        },
];

// Employee nav
const employeeNav = [
  { id: "dashboard",     label: "Dashboard",     icon: icons.dashboard },
  { id: "time_logs",     label: "Clock In / Out",icon: clockIcon       },
  { id: "my_logs",       label: "My Time Logs",  icon: logsIcon        },
  { id: "leave_records", label: "My Leave",      icon: icons.fileText  },
];

// ── Load data ─────────────────────────────────────────
async function loadDb() {
  try {
    db = await fetchAllData();
    loadError = null;
  } catch (err) {
    loadError = err.message || "Failed to load data.";
  }
}

// ── Render app ────────────────────────────────────────
async function renderApp() {
  root.innerHTML = "";

  if (checkingSession) {
    root.appendChild(renderBootScreen());
    return;
  }

  if (!account) {
    root.appendChild(renderLogin(async acc => {
      account = acc;
      activeView = "dashboard";
      await loadDb();
      renderApp();
    }));
    return;
  }

  if (loadError) {
    const errBox = document.createElement("div");
    errBox.className = "alert-error";
    errBox.style.margin = "24px";
    errBox.textContent = `Could not load data from the server: ${loadError}`;
    root.appendChild(errBox);
    return;
  }

  const isAdmin = account.access_level === "admin";

  const allowedAdmin    = ["dashboard", "employees", "accounts", "leave_records", "my_logs"];
  const allowedEmployee = ["dashboard", "time_logs", "my_logs", "leave_records"];
  const allowed = isAdmin ? allowedAdmin : allowedEmployee;

  if (!allowed.includes(activeView)) activeView = "dashboard";

  const emp = account.employee_id != null
    ? db.employees.find(e => e.employee_id === account.employee_id)
    : null;

  const layout = document.createElement("div");
  layout.className = "layout";

  const sidebar = buildSidebar({
    navItems: isAdmin ? adminNav : employeeNav,
    activeId: activeView,
    onNav: (id) => {
      if (!allowed.includes(id)) return;
      activeView = id;
      renderApp();
    },
    account,
    emp,
    onLogout: async () => {
      try { await logoutRequest(); } catch (_) {}
      account    = null;
      activeView = "dashboard";
      renderApp();
    },
  });

  const main = document.createElement("main");
  main.className = "main";

  const dbChangeHandler = (updated) => { db = updated; };

  let view;
  switch (activeView) {
    case "employees":
      view = isAdmin ? renderEmployees(db, dbChangeHandler) : renderDashboard(db, account);
      break;
    case "accounts":
      view = isAdmin ? renderAccounts(db, dbChangeHandler) : renderDashboard(db, account);
      break;
    case "leave_records":
      view = renderLeaveRecords(db, account, dbChangeHandler);
      break;
    case "time_logs":
      view = renderTimeLogs(db, account, dbChangeHandler);
      break;
    case "my_logs":
      view = renderMyLogs(db, account, dbChangeHandler);
      break;
    default:
      view = renderDashboard(db, account);
  }

  main.appendChild(view);
  layout.appendChild(sidebar);
  layout.appendChild(main);
  root.appendChild(layout);
}

// ── Boot ──────────────────────────────────────────────
// On a fresh page load (including refresh/Ctrl+R), `account` always starts
// null in JS — but the PHPSESSID cookie may still be valid server-side.
// Ask the backend before deciding to show the login screen, so a reload
// doesn't force the user to log in again while their session is still good.
async function boot() {
  renderApp(); // shows the boot screen immediately (checkingSession is true)

  try {
    account = await apiRequest("/auth.php?action=me");
  } catch (err) {
    account = null; // no valid session (or it expired) — show login normally
  }

  if (account) {
    await loadDb();
  }

  checkingSession = false;
  renderApp();
}

boot();

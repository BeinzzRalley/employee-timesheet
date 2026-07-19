// Login view

function renderLogin(onLogin) {
  const page = document.createElement("div");
  page.className = "login-page";

  // Left panel
  const features = [
    { title: "Clock In & Out",    desc: "Real-time attendance tracking with shift categories." },
    { title: "Leave Management",  desc: "File and approve leave requests in one place." },
    { title: "OT & Claims",      desc: "File overtime, holiday, and time correction claims." },
    { title: "Team Overview",     desc: "Admin dashboard across all departments." },
  ];

  const leftPanel = document.createElement("div");
  leftPanel.className = "login-panel-left";
  leftPanel.innerHTML = `
    <div class="login-deco-circle" style="width:288px;height:288px;top:-96px;left:-96px;"></div>
    <div class="login-deco-circle" style="width:224px;height:224px;top:33%;right:-64px;"></div>
    <div class="login-deco-circle" style="width:384px;height:384px;bottom:-80px;left:40px;"></div>
    <div class="login-deco-dots"></div>
    <div class="login-left-content">
      <div class="login-logo">
        <div class="login-logo-icon">${icons.timer}</div>
        <span>LaborTrack</span>
      </div>
      <div class="login-hero">
        <h2>Workforce<br>management<br>made simple.</h2>
        <p>Track attendance, manage leave, and file claims — all from one clean dashboard.</p>
      </div>
      <div class="login-features">
        ${features.map(f => `
          <div class="login-feature">
            <div class="login-feature-dot"></div>
            <div class="login-feature-text">
              <p>${f.title}</p>
              <p>${f.desc}</p>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  // Right panel
  const rightPanel = document.createElement("div");
  rightPanel.className = "login-panel-right";

  const formWrap = document.createElement("div");
  formWrap.className = "login-form-wrap";

  formWrap.innerHTML = `
    <div class="login-mobile-logo">
      <div class="login-mobile-logo-icon">${icons.timer}</div>
      <span>LaborTrack</span>
    </div>
    <h1>Sign in</h1>
    <p>Enter your credentials to access your account.</p>
  `;

  const form = document.createElement("form");
  form.className = "login-form";

  let showPw = false;

  form.innerHTML = `
    <div class="login-field">
      <label>Username</label>
      <input id="login-user" type="text" placeholder="your.username" autocomplete="username" required />
    </div>
    <div class="login-field">
      <label>Password</label>
      <div class="pw-wrap">
        <input id="login-pw" type="password" placeholder="••••••••" autocomplete="current-password" required />
        <button type="button" class="pw-toggle" id="pw-toggle">${icons.eye}</button>
      </div>
    </div>
    <div id="login-error" style="display:none" class="alert-error"></div>
    <button type="submit" class="login-submit">Sign In</button>
  `;

  form.querySelector("#pw-toggle").addEventListener("click", function () {
    showPw = !showPw;
    form.querySelector("#login-pw").type = showPw ? "text" : "password";
    this.innerHTML = showPw ? icons.eyeOff : icons.eye;
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const username = form.querySelector("#login-user").value.trim();
    const password = form.querySelector("#login-pw").value;
    const errEl = form.querySelector("#login-error");
    const submitBtn = form.querySelector(".login-submit");

    errEl.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";

    try {
      const acc = await loginRequest(username, password);
      if (acc) {
        onLogin(acc);
      } else {
        errEl.textContent = "Invalid username or password.";
        errEl.style.display = "block";
      }
    } catch (err) {
      errEl.textContent = err.message || "Invalid username or password.";
      errEl.style.display = "block";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
    }
  });

  formWrap.appendChild(form);
  rightPanel.appendChild(formWrap);

  page.appendChild(leftPanel);
  page.appendChild(rightPanel);

  return page;
}

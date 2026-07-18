function renderPayDifferentials(db, onDbChange) {
  const page = document.createElement("div");
  page.className = "page";

  function refresh() {
    page.innerHTML = "";
    render();
  }

  async function reloadDifferentials() {
    try {
      db.payDifferentials = await apiRequest("/pay_differentials.php");
      onDbChange(db);
    } catch (err) {
      showToast(err.message || "Could not reload pay differentials.", "error");
    }
  }

  function render() {
    const addBtn = document.createElement("button");
    addBtn.className = "btn btn-primary";
    addBtn.innerHTML = `${icons.plus} Add Differential`;
    addBtn.addEventListener("click", () => openModal_(null));

    page.appendChild(pageHeader(
      "Pay Differentials",
      `${(db.payDifferentials || []).length} differentials`,
      addBtn
    ));

    const card = document.createElement("div");
    card.className = "card";

    const rows = (db.payDifferentials || []).map(d => {
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-ghost btn-sm";
      editBtn.innerHTML = `${icons.pencil} Edit`;
      editBtn.addEventListener("click", () => openModal_(d));

      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-ghost btn-sm";
      delBtn.style.color = "var(--red, #ef4444)";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => deleteDifferential(d));

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "6px";
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      return [
        `<span class="font-medium text-sm">${d.differential_name}</span>`,
        `<span class="mono text-xs">${d.time_start || "—"}</span>`,
        `<span class="mono text-xs">${d.time_end   || "—"}</span>`,
        `<span class="mono text-xs" style="color:#6366f1;font-weight:600">${Number(d.rate_multiplier).toFixed(2)}×</span>`,
        actions,
      ];
    });

    card.appendChild(buildTable(
      ["Name", "Start Time", "End Time", "Rate Multiplier", ""],
      rows,
      "No pay differentials defined."
    ));
    page.appendChild(card);
  }

  function deleteDifferential(d) {
    const body = document.createElement("div");
    body.style.display = "flex";
    body.style.flexDirection = "column";
    body.style.gap = "18px";

    const message = document.createElement("p");
    message.className = "text-sm";
    message.textContent = `Are you sure you want to delete "${d.differential_name}"?`;
    body.appendChild(message);

    const footer = document.createElement("div");
    footer.className = "modal-footer";

    const keepBtn = document.createElement("button");
    keepBtn.className = "btn btn-outline";
    keepBtn.textContent = "Keep";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger";
    deleteBtn.textContent = "Delete";

    footer.appendChild(keepBtn);
    footer.appendChild(deleteBtn);
    body.appendChild(footer);

    const { close } = openModal({ title: "Delete Pay Differential", body });

    keepBtn.addEventListener("click", close);

    deleteBtn.addEventListener("click", async () => {
      deleteBtn.disabled = true;
      try {
        await apiRequest(`/pay_differentials.php?id=${d.differential_id}`, { method: "DELETE" });
        await reloadDifferentials();
        close();
        showToast("Pay differential deleted.", "success");
        refresh();
      } catch (err) {
        showToast(err.message || "Could not delete pay differential.", "error");
        deleteBtn.disabled = false;
      }
    });
  }

  function openModal_(existing) {
    const isEdit = !!existing;
    const data = isEdit ? { ...existing } : {
      differential_name: "", time_start: "", time_end: "", rate_multiplier: 1.10,
    };

    const body = document.createElement("div");
    body.style.cssText = "display:flex;flex-direction:column;gap:14px";

    const fName  = makeInput("text",   data.differential_name, "e.g. Night Differential");
    const fStart = makeInput("time",   data.time_start || "");
    const fEnd   = makeInput("time",   data.time_end   || "");
    const fMult  = makeInput("number", data.rate_multiplier);
    fMult.step = "0.01";
    fMult.min  = "0.01";

    const timeGrid = document.createElement("div");
    timeGrid.className = "grid-2";
    timeGrid.style.gap = "14px";
    timeGrid.appendChild(buildField("Start Time", fStart));
    timeGrid.appendChild(buildField("End Time",   fEnd));

    const hint = document.createElement("div");
    hint.style.cssText = "font-size:0.78rem;color:var(--text-muted)";
    hint.textContent = "Philippine standard: Night Differential = 1.10× (10pm–6am)";

    body.appendChild(buildField("Differential Name", fName));
    body.appendChild(timeGrid);
    body.appendChild(buildField("Rate Multiplier", fMult));
    body.appendChild(hint);

    const errEl = document.createElement("div");
    errEl.className = "alert-error";
    errEl.style.display = "none";
    body.appendChild(errEl);

    const footer = document.createElement("div");
    footer.className = "modal-footer";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-outline";
    cancelBtn.textContent = "Cancel";
    const saveBtn = document.createElement("button");
    saveBtn.className = "btn btn-primary";
    saveBtn.innerHTML = `${icons.check} ${isEdit ? "Save Changes" : "Add Differential"}`;
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    body.appendChild(footer);

    const { close } = openModal({
      title: isEdit ? "Edit Pay Differential" : "Add Pay Differential",
      body,
    });

    cancelBtn.addEventListener("click", close);

    saveBtn.addEventListener("click", async () => {
      const name  = fName.value.trim();
      const start = fStart.value;
      const end   = fEnd.value;
      const mult  = parseFloat(fMult.value);

      if (!name)  { errEl.textContent = "Name is required.";             errEl.style.display = "block"; return; }
      if (!start) { errEl.textContent = "Start time is required.";       errEl.style.display = "block"; return; }
      if (!end)   { errEl.textContent = "End time is required.";         errEl.style.display = "block"; return; }
      if (!mult || mult <= 0) { errEl.textContent = "Rate multiplier must be greater than 0."; errEl.style.display = "block"; return; }

      const payload = {
        differential_name: name,
        time_start: start,
        time_end: end,
        rate_multiplier: mult,
      };
      if (isEdit) payload.differential_id = data.differential_id;

      errEl.style.display = "none";
      saveBtn.disabled = true;

      try {
        await apiRequest("/pay_differentials.php", {
          method: isEdit ? "PUT" : "POST",
          body: JSON.stringify(payload),
        });
        await reloadDifferentials();
        close();
        showToast(isEdit ? "Differential updated." : "Differential added.", "success");
        refresh();
      } catch (err) {
        errEl.textContent = err.message || "Could not save pay differential.";
        errEl.style.display = "block";
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  render();
  return page;
}
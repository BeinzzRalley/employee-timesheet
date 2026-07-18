function renderOvertimeCategories(db, onDbChange) {
  const page = document.createElement("div");
  page.className = "page";

  function refresh() {
    page.innerHTML = "";
    render();
  }

  async function reloadCategories() {
    try {
      db.overtimeCategories = await apiRequest("/overtime_categories.php");
      onDbChange(db);
    } catch (err) {
      showToast(err.message || "Could not reload overtime categories.", "error");
    }
  }

  function render() {
    const addBtn = document.createElement("button");
    addBtn.className = "btn btn-primary";
    addBtn.innerHTML = `${icons.plus} Add Category`;
    addBtn.addEventListener("click", () => openCategoryModal(null));

    page.appendChild(pageHeader(
      "Overtime Categories",
      `${(db.overtimeCategories || []).length} categories — Labor Code Art. 87 classification`,
      addBtn
    ));

    const card = document.createElement("div");
    card.className = "card";

    const rows = (db.overtimeCategories || []).map(c => {
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-ghost btn-sm";
      editBtn.innerHTML = `${icons.pencil} Edit`;
      editBtn.addEventListener("click", () => openCategoryModal(c));

      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-ghost btn-sm";
      delBtn.style.color = "var(--red, #ef4444)";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => deleteCategory(c));

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "6px";
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      return [
        `<span class="font-medium text-sm">${c.category_name}</span>`,
        actions,
      ];
    });

    card.appendChild(buildTable(
      ["Category Name", ""],
      rows,
      "No overtime categories defined."
    ));
    page.appendChild(card);
  }

  function deleteCategory(c) {
    openConfirmModal({
      title: "Delete Overtime Category",
      message: `Delete "${c.category_name}"? This will fail if assigned to any time log claims.`,
      keepLabel: "Keep Category",
      confirmLabel: "Delete Category",
      onConfirm: async () => {
        await apiRequest(`/overtime_categories.php?id=${c.overtime_category_id}`, { method: "DELETE" });
        await reloadCategories();
        showToast("Overtime category deleted.", "success");
        refresh();
      },
    });
  }

  function openCategoryModal(existing) {
    const isEdit = !!existing;
    const data = isEdit ? { ...existing } : { category_name: "" };

    const body = document.createElement("div");
    body.style.cssText = "display:flex;flex-direction:column;gap:14px";

    const fName = makeInput("text", data.category_name, "e.g. Regular OT, Rest Day OT, Holiday OT");
    body.appendChild(buildField("Category Name", fName));

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
    saveBtn.innerHTML = `${icons.check} ${isEdit ? "Save Changes" : "Add Category"}`;
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    body.appendChild(footer);

    const { close } = openModal({
      title: isEdit ? "Edit Overtime Category" : "Add Overtime Category",
      body,
    });

    cancelBtn.addEventListener("click", close);

    saveBtn.addEventListener("click", async () => {
      const name = fName.value.trim();
      if (!name) {
        errEl.textContent = "Category name is required.";
        errEl.style.display = "block";
        return;
      }

      const payload = { category_name: name };
      if (isEdit) payload.overtime_category_id = data.overtime_category_id;

      errEl.style.display = "none";
      saveBtn.disabled = true;

      try {
        await apiRequest("/overtime_categories.php", {
          method: isEdit ? "PUT" : "POST",
          body: JSON.stringify(payload),
        });
        await reloadCategories();
        close();
        showToast(isEdit ? "Category updated." : "Category added.", "success");
        refresh();
      } catch (err) {
        errEl.textContent = err.message || "Could not save category.";
        errEl.style.display = "block";
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  render();
  return page;
}

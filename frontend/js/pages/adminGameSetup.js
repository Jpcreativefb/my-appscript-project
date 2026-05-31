/* ======================
   ADMIN GAME SETUP PAGE
====================== */

function adminSetupEscapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

function adminSetupSlugify(value) {

  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

}

function adminSetupBoolText(value) {

  return value
    ? "Yes"
    : "No";

}

async function renderAdminGameSetupPage(gameId) {

  const safeGameId =
    String(gameId || "")
      .trim();

  if (!safeGameId) {

    return `
      <div class="page admin-page">
        <h1>Game Setup</h1>

        <div class="card admin-card error-card">
          Missing game ID.
        </div>
      </div>
    `;

  }

  const res =
    await apiAdminGetGameSetup(
      safeGameId
    );

  if (
    !res ||
    res.success === false
  ) {

    return `
      <div class="page admin-page">
        <h1>Game Setup</h1>

        <div class="card admin-card error-card">
          Could not load game setup.
          <br>
          ${adminSetupEscapeHtml(
            res && (res.message || res.error)
              ? res.message || res.error
              : "Please refresh and try again."
          )}
        </div>

        <button
          class="admin-small-button secondary"
          onclick="navigate('admin-games')"
        >
          Back to Manage Games
        </button>
      </div>
    `;

  }

  const categories =
    Array.isArray(res.categories)
      ? res.categories
      : [];

  return `
    <div class="page admin-page admin-game-setup-page">

      <div class="admin-page-header">

        <div>
          <h1>Game Setup</h1>

          <div class="admin-sub">
            ${adminSetupEscapeHtml(safeGameId)}
          </div>
        </div>

        <button
          class="admin-small-button secondary"
          onclick="navigate('admin-games')"
        >
          Back to Manage Games
        </button>

      </div>

      <div class="admin-section">

        ${renderAdminSetupAddCategoryCard(safeGameId)}

        ${renderAdminSetupAddNomineeCard(
          safeGameId,
          categories
        )}

        <div class="card admin-card">

          <h2>Categories / Questions</h2>

          <div
            id="adminSetupMessage"
            class="admin-message"
          ></div>

          ${
            categories.length
              ? `
                <div class="admin-list">
                  ${categories
                    .map(renderAdminSetupCategoryCard)
                    .join("")}
                </div>
              `
              : `
                <div class="admin-sub">
                  No categories found yet. Add your first category above.
                </div>
              `
          }

        </div>

      </div>

    </div>
  `;

}

/* ======================
   ADD CATEGORY CARD
====================== */

function renderAdminSetupAddCategoryCard(gameId) {

  return `
    <div class="card admin-card">

      <h2>Add Category / Question</h2>

      <div class="admin-sub">
        This creates the category settings row first. Nominees can be added after.
      </div>

      <div class="admin-control-grid">

        <label class="admin-field">
          <span>Category / Question</span>

          <input
            type="text"
            id="setupNewCategoryName"
            placeholder="Best Picture"
          >
        </label>

        <label class="admin-field">
          <span>Category ID</span>

          <input
            type="text"
            id="setupNewCategoryId"
            placeholder="best-picture"
          >
        </label>

        <label class="admin-field">
          <span>Section</span>

          <input
            type="text"
            id="setupNewCategorySection"
            placeholder="Main"
            value="Main"
          >
        </label>

        <label class="admin-field">
          <span>Points</span>

          <input
            type="number"
            id="setupNewCategoryPoints"
            value="1"
            min="0"
          >
        </label>

        <label class="admin-field">
          <span>Display Order</span>

          <input
            type="number"
            id="setupNewCategoryDisplayOrder"
            value="999"
            min="0"
          >
        </label>

        <label class="admin-field">
          <span>Layout Type</span>

          <select id="setupNewCategoryLayoutType">
            <option value="image">Image</option>
            <option value="text">Text</option>
          </select>
        </label>

      </div>

      <label class="admin-check-row">
        <input
          type="checkbox"
          id="setupNewCategoryCountsAsStatue"
          checked
        >

        <span>
          Counts as statue
        </span>
      </label>

      <label class="admin-check-row">
        <input
          type="checkbox"
          id="setupNewCategoryLocked"
        >

        <span>
          Start locked
        </span>
      </label>

      <button
        class="admin-small-button"
        onclick="adminSetupCreateCategory('${adminSetupEscapeHtml(gameId)}')"
      >
        Add Category
      </button>

      <div
        id="setupAddCategoryMessage"
        class="admin-message"
      ></div>

    </div>
  `;

}

/* ======================
   ADD NOMINEE CARD
====================== */

function renderAdminSetupAddNomineeCard(
  gameId,
  categories
) {

  const options =
    categories
      .map(cat => `
        <option value="${adminSetupEscapeHtml(cat.categoryId)}">
          ${adminSetupEscapeHtml(cat.category || cat.categoryId)}
        </option>
      `)
      .join("");

  return `
    <div class="card admin-card">

      <h2>Add Nominee / Answer</h2>

      <div class="admin-sub">
        Add nominees or answer choices to an existing category.
      </div>

      ${
        categories.length
          ? `
            <div class="admin-control-grid">

              <label class="admin-field">
                <span>Category</span>

                <select id="setupNomineeCategoryId">
                  ${options}
                </select>
              </label>

              <label class="admin-field">
                <span>Nominee / Answer</span>

                <input
                  type="text"
                  id="setupNewNomineeName"
                  placeholder="Movie Title"
                >
              </label>

              <label class="admin-field">
                <span>Nominee ID</span>

                <input
                  type="text"
                  id="setupNewNomineeId"
                  placeholder="movie-title"
                >
              </label>

              <label class="admin-field">
                <span>Short Answer</span>

                <input
                  type="text"
                  id="setupNewNomineeShortAnswer"
                  placeholder="Movie Title"
                >
              </label>

              <label class="admin-field">
                <span>File ID</span>

                <input
                  type="text"
                  id="setupNewNomineeFileId"
                  placeholder="Optional Google Drive file ID"
                >
              </label>

              <label class="admin-field">
                <span>Section</span>

                <input
                  type="text"
                  id="setupNewNomineeSection"
                  placeholder="Main"
                  value="Main"
                >
              </label>

            </div>

            <button
              class="admin-small-button"
              onclick="adminSetupCreateNominee('${adminSetupEscapeHtml(gameId)}')"
            >
              Add Nominee
            </button>
          `
          : `
            <div class="admin-sub">
              Add a category first before adding nominees.
            </div>
          `
      }

      <div
        id="setupAddNomineeMessage"
        class="admin-message"
      ></div>

    </div>
  `;

}

/* ======================
   CATEGORY CARD
====================== */

function renderAdminSetupCategoryCard(category) {

  const settings =
    category.settings || {};

  const nominees =
    Array.isArray(category.nominees)
      ? category.nominees
      : [];

  return `
    <div class="admin-category-card">

      <div class="admin-category-header">

        <div>
          <strong>
            ${adminSetupEscapeHtml(
              category.category ||
              category.categoryId
            )}
          </strong>

          <div class="admin-sub">
            ${adminSetupEscapeHtml(category.categoryId)}
            ·
            ${adminSetupEscapeHtml(category.section || "Other")}
            ·
            ${nominees.length} nominees
          </div>
        </div>

        <div class="admin-pill ${settings.locked ? "locked" : ""}">
          ${settings.locked ? "Locked" : "Open"}
        </div>

      </div>

      <div class="admin-setup-meta">

        <div>
          <span>Points</span>
          <strong>${Number(settings.points) || 0}</strong>
        </div>

        <div>
          <span>Order</span>
          <strong>${Number(settings.displayOrder) || 999}</strong>
        </div>

        <div>
          <span>Layout</span>
          <strong>${adminSetupEscapeHtml(settings.layoutType || "image")}</strong>
        </div>

        <div>
          <span>Statue</span>
          <strong>${adminSetupBoolText(settings.countsAsStatue)}</strong>
        </div>

      </div>

      <div class="admin-setup-nominees">

        <h3>Nominees / Answers</h3>

        ${
          nominees.length
            ? nominees
              .map(nominee => `
                <div class="admin-setup-nominee-row">

                  <div>
                    <strong>
                      ${adminSetupEscapeHtml(nominee.nominee)}
                    </strong>

                    <div class="admin-sub">
                      ${adminSetupEscapeHtml(nominee.nomineeId)}
                    </div>
                  </div>

                  <div class="admin-pill ${nominee.active === false ? "inactive" : ""}">
                    ${nominee.active === false ? "Inactive" : "Active"}
                  </div>

                </div>
              `)
              .join("")
            : `
              <div class="admin-sub">
                No nominees added yet.
              </div>
            `
        }

      </div>

    </div>
  `;

}

/* ======================
   ACTION HELPERS
====================== */

function adminSetupSetMessage(
  id,
  message,
  isError
) {

  const el =
    document.getElementById(id);

  if (!el) {
    return;
  }

  el.classList.toggle(
    "is-error",
    Boolean(isError)
  );

  el.innerText =
    message || "";

}

function adminSetupGetCategoryNameById(categoryId) {

  const select =
    document.getElementById(
      "setupNomineeCategoryId"
    );

  if (!select) {
    return "";
  }

  const option =
    Array.from(select.options)
      .find(opt =>
        opt.value === categoryId
      );

  return option
    ? option.textContent.trim()
    : "";

}

/* ======================
   CREATE CATEGORY
====================== */

async function adminSetupCreateCategory(gameId) {

  const nameInput =
    document.getElementById(
      "setupNewCategoryName"
    );

  const idInput =
    document.getElementById(
      "setupNewCategoryId"
    );

  const sectionInput =
    document.getElementById(
      "setupNewCategorySection"
    );

  const pointsInput =
    document.getElementById(
      "setupNewCategoryPoints"
    );

  const displayOrderInput =
    document.getElementById(
      "setupNewCategoryDisplayOrder"
    );

  const layoutTypeInput =
    document.getElementById(
      "setupNewCategoryLayoutType"
    );

  const countsAsStatueInput =
    document.getElementById(
      "setupNewCategoryCountsAsStatue"
    );

  const lockedInput =
    document.getElementById(
      "setupNewCategoryLocked"
    );

  const categoryName =
    nameInput
      ? nameInput.value.trim()
      : "";

  const categoryId =
    adminSetupSlugify(
      idInput && idInput.value.trim()
        ? idInput.value.trim()
        : categoryName
    );

  if (
    !categoryName ||
    !categoryId
  ) {

    adminSetupSetMessage(
      "setupAddCategoryMessage",
      "Category name is required.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "setupAddCategoryMessage",
    "Adding category...",
    false
  );

  const res =
    await apiAdminCreateCategory({
      gameId: gameId,
      category: categoryName,
      categoryId: categoryId,
      section:
        sectionInput
          ? sectionInput.value.trim()
          : "Main",
      points:
        pointsInput
          ? pointsInput.value
          : 1,
      displayOrder:
        displayOrderInput
          ? displayOrderInput.value
          : 999,
      layoutType:
        layoutTypeInput
          ? layoutTypeInput.value
          : "image",
      countsAsStatue:
        countsAsStatueInput
          ? countsAsStatueInput.checked
          : true,
      locked:
        lockedInput
          ? lockedInput.checked
          : false
    });

  if (
    !res ||
    res.success === false
  ) {

    adminSetupSetMessage(
      "setupAddCategoryMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Unable to add category.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "setupAddCategoryMessage",
    "Category added.",
    false
  );

  navigate(
    "admin-game-setup:" + gameId
  );

}

/* ======================
   CREATE NOMINEE
====================== */

async function adminSetupCreateNominee(gameId) {

  const categoryInput =
    document.getElementById(
      "setupNomineeCategoryId"
    );

  const nomineeInput =
    document.getElementById(
      "setupNewNomineeName"
    );

  const nomineeIdInput =
    document.getElementById(
      "setupNewNomineeId"
    );

  const shortAnswerInput =
    document.getElementById(
      "setupNewNomineeShortAnswer"
    );

  const fileIdInput =
    document.getElementById(
      "setupNewNomineeFileId"
    );

  const sectionInput =
    document.getElementById(
      "setupNewNomineeSection"
    );

  const categoryId =
    categoryInput
      ? categoryInput.value.trim()
      : "";

  const categoryName =
    adminSetupGetCategoryNameById(
      categoryId
    );

  const nomineeName =
    nomineeInput
      ? nomineeInput.value.trim()
      : "";

  const nomineeId =
    adminSetupSlugify(
      nomineeIdInput &&
      nomineeIdInput.value.trim()
        ? nomineeIdInput.value.trim()
        : nomineeName
    );

  if (
    !categoryId ||
    !nomineeName ||
    !nomineeId
  ) {

    adminSetupSetMessage(
      "setupAddNomineeMessage",
      "Category and nominee name are required.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "setupAddNomineeMessage",
    "Adding nominee...",
    false
  );

  const res =
    await apiAdminCreateNominee({
      gameId: gameId,
      categoryId: categoryId,
      category: categoryName,
      nominee: nomineeName,
      nomineeId: nomineeId,
      shortAnswer:
        shortAnswerInput &&
        shortAnswerInput.value.trim()
          ? shortAnswerInput.value.trim()
          : nomineeName,
      fileId:
        fileIdInput
          ? fileIdInput.value.trim()
          : "",
      section:
        sectionInput
          ? sectionInput.value.trim()
          : "Main",
      active: true
    });

  if (
    !res ||
    res.success === false
  ) {

    adminSetupSetMessage(
      "setupAddNomineeMessage",
      res && (res.message || res.error)
        ? res.message || res.error
        : "Unable to add nominee.",
      true
    );

    return;

  }

  adminSetupSetMessage(
    "setupAddNomineeMessage",
    "Nominee added.",
    false
  );

  navigate(
    "admin-game-setup:" + gameId
  );

}
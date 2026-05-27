/* =========================
   PICKS PAGE
========================= */

let PICKS_PAGE_DATA = {
  session: null,
  gameId: "",
  categories: [],
  picks: {},
  changeCounts: {},
  originalPicks: {},
  pickMeta: {}
};

let PICKS_COUNTDOWN_TIMER = null;

/* =========================
   RENDER PAGE
========================= */

async function renderPicksPage() {

  const session =
    getSession();

  const gameId =
    session.gameId || "";

  PICKS_PAGE_DATA.session =
    session;

  PICKS_PAGE_DATA.gameId =
    gameId;

  const categories =
    await apiGetCategories(gameId);

  const picksResponse =
    await apiGetMyPicks(
      session.username,
      gameId
    );

  PICKS_PAGE_DATA.categories =
    Array.isArray(categories)
      ? categories
      : [];

  PICKS_PAGE_DATA.picks =
    picksResponse.picks || {};

  PICKS_PAGE_DATA.changeCounts =
    picksResponse.changeCounts || {};

  PICKS_PAGE_DATA.originalPicks =
    picksResponse.originalPicks || {};

  PICKS_PAGE_DATA.pickMeta =
    picksResponse.pickMeta || {};  

  setTimeout(
    mountPicksPage,
    0
  );

  return `
    <div class="page picks-page">

      <div class="picks-page-header">
        <h1>Make Your Picks</h1>
        <p>
          Pick changes may reduce available points.
          Locked categories cannot be changed.
        </p>
      </div>

      <div id="picksPageMessage" class="picks-message hidden"></div>

      <div id="picksCategoryList" class="picks-category-list">
        ${renderPicksCategoryList()}
      </div>

    </div>
  `;

}

/* =========================
   CATEGORY LIST
========================= */

function renderPicksCategoryList() {

  const categories =
    PICKS_PAGE_DATA.categories || [];

  const parents =
    categories.filter(cat =>
      !cat.parentCategoryId
    );

  return parents.map(parent => {

    const children =
      getChildCategories(parent);

    return `
      <div class="picks-parent-block">

        ${renderCategoryCard(parent, false)}

        ${children.length ? `
          <div class="child-category-wrapper">
            ${children.map(child =>
              renderCategoryCard(child, true, parent)
            ).join("")}
          </div>
        ` : ""}

      </div>
    `;

  }).join("");

}

/* =========================
   CHILD CATEGORY HELPERS
========================= */

function getChildCategories(parent) {

  const categories =
    PICKS_PAGE_DATA.categories || [];

  return categories.filter(cat => {

    if (
      cat.parentCategoryId &&
      normalizeId(cat.parentCategoryId) === normalizeId(parent.id)
    ) {
      return shouldShowChildCategory(parent, cat);
    }

    if (
      parent.followUpCategoryId &&
      normalizeId(parent.followUpCategoryId) === normalizeId(cat.id)
    ) {
      return shouldShowChildCategory(parent, cat);
    }

    return false;

  });

}

function shouldShowChildCategory(parent, child) {

  const map =
    parseFollowUpMap(parent.followUpMapJSON);

  const selectedNomineeId =
    PICKS_PAGE_DATA.picks[parent.id];

  if (!map) {
    return true;
  }

  if (!selectedNomineeId) {
    return false;
  }

  const mapped =
    map[selectedNomineeId];

  if (Array.isArray(mapped)) {
    return mapped
      .map(normalizeId)
      .includes(normalizeId(child.id));
  }

  return normalizeId(mapped) === normalizeId(child.id);

}

function parseFollowUpMap(value) {

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (err) {
    console.warn(
      "Invalid FollowUpMapJSON",
      value
    );
    return null;
  }

}

/* =========================
   CATEGORY CARD
========================= */

function renderCategoryCard(category, isChild, parent) {

  const selectedNomineeId =
    PICKS_PAGE_DATA.picks[category.id] || "";

  const selectedNominee =
    getSelectedNominee(category);

  const hasPick =
    Boolean(selectedNominee);

  const locked =
    isCategoryLocked(category);

  const status =
    getPickStatus(category, selectedNomineeId);

  const winnerNominee =
    getWinnerNominee(category);
  
  const originalNominee =
    getOriginalNominee(category);
  
  const thirdLineText =
    getThirdLineText(
      category,
      selectedNominee,
      winnerNominee,
      status
    );  

  const changeCount =
    Number(
      PICKS_PAGE_DATA.changeCounts[category.id]
    ) || 0;

  const maxChanges =
    Number(category.maxChanges) || 0;

  const changesLeft =
    Math.max(
      maxChanges - changeCount,
      0
    );

  const totalPoints =
    Number(category.points) || 0;

  const penalty =
    Number(category.changePenalty) || 0;

  const adjustedPoints =
    Math.max(
      totalPoints - changeCount * penalty,
      0
    );

  const collapsedClass =
    hasPick ? "collapsed" : "";

  const childClass =
    isChild ? "child-category-card" : "";

  return `
    <section
      class="pick-category-card ${collapsedClass} ${childClass} ${status.className}"
      data-category-id="${escapeAttr(category.id)}"
    >

    <button
      type="button"
      class="pick-card-header"
      onclick="togglePickCategory('${escapeJs(category.id)}')"
    >

      <div class="pick-header-main">

        <div class="pick-header-topline">

          <div class="pick-title-wrap">

           ${status.icon ? `
             <span class="pick-status-icon">${status.icon}</span>
           ` : ""}

        <h2>
          ${escapeHtml(category.name)}
        </h2>

      </div>

      <div class="points-pill">
        ${adjustedPoints}/${totalPoints} pts
      </div>

     </div>

     ${selectedNominee ? `
       <div class="selected-pick-summary">

        <img
          src="${escapeAttr(selectedNominee.image)}"
          alt=""
        />

        <span>
          ${escapeHtml(selectedNominee.name)}
        </span>

       </div>
     ` : `
       <div class="selected-pick-summary empty">
          <span>No pick selected</span>
       </div>
     `}

      <div
        class="pick-third-line"
        data-lock-time="${escapeAttr(category.lockDateTime || "")}"
        data-locked="${locked ? "true" : "false"}"
        data-default-text="${escapeAttr(thirdLineText)}"
      >
        ${escapeHtml(thirdLineText)}
      </div>

     </div>

    </button>  
    

      <div class="pick-card-body">

      <div class="pick-rules-row">

      <div class="penalty-note">
        Penalty: ${penalty} point${penalty === 1 ? "" : "s"}
      </div>
    
      <div class="changes-pill body-pill">
        ${changesLeft} changes left
      </div>
    
    </div>
    
    ${originalNominee ? `
      <div class="original-pick-note">
        Original Pick:
        <strong>${escapeHtml(originalNominee.name)}</strong>
      </div>
    ` : ""}

        <div class="${getLayoutClass(category)}">
          ${category.nominees.map(nominee =>
            renderNomineeButton(
              category,
              nominee,
              selectedNomineeId,
              locked
            )
          ).join("")}
        </div>

      </div>

    </section>
  `;

}

/* =========================
   NOMINEE BUTTON
========================= */

function renderNomineeButton(
  category,
  nominee,
  selectedNomineeId,
  locked
) {

  const selected =
    normalizeId(nominee.id) ===
    normalizeId(selectedNomineeId);

  const layoutType =
    String(category.layoutType || "image")
      .toLowerCase();

  const disabled =
    locked ? "disabled" : "";

  if (
    layoutType === "text" ||
    layoutType === "short-answer"
  ) {

    return `
      <button
        type="button"
        class="nominee-choice text-choice ${selected ? "selected" : ""}"
        onclick="selectNominee('${escapeJs(category.id)}', '${escapeJs(nominee.id)}')"
        ${disabled}
      >
        ${escapeHtml(nominee.shortAnswer || nominee.name)}
      </button>
    `;

  }

  if (
    layoutType === "compact" ||
    layoutType === "list"
  ) {

    return `
      <button
        type="button"
        class="nominee-choice list-choice ${selected ? "selected" : ""}"
        onclick="selectNominee('${escapeJs(category.id)}', '${escapeJs(nominee.id)}')"
        ${disabled}
      >

        <img
          src="${escapeAttr(nominee.image)}"
          alt=""
        />

        <span>
          ${escapeHtml(nominee.name)}
        </span>

      </button>
    `;

  }

  return `
    <button
      type="button"
      class="nominee-choice image-choice ${selected ? "selected" : ""}"
      onclick="selectNominee('${escapeJs(category.id)}', '${escapeJs(nominee.id)}')"
      ${disabled}
    >

      <img
        src="${escapeAttr(nominee.image)}"
        alt=""
      />

      <span>
        ${escapeHtml(nominee.name)}
      </span>

    </button>
  `;

}

/* =========================
   PICK ACTIONS
========================= */

async function selectNominee(categoryId, nomineeId) {

  const session =
    PICKS_PAGE_DATA.session ||
    getSession();

  const category =
    PICKS_PAGE_DATA.categories.find(cat =>
      normalizeId(cat.id) === normalizeId(categoryId)
    );

  if (!category) {
    showPicksMessage(
      "Category not found.",
      true
    );
    return;
  }

  if (isCategoryLocked(category)) {
    showPicksMessage(
      "This category is locked.",
      true
    );
    return;
  }

  const previousPick =
    PICKS_PAGE_DATA.picks[categoryId];

  const isChange =
    previousPick &&
    normalizeId(previousPick) !== normalizeId(nomineeId);

  const changeCount =
    Number(
      PICKS_PAGE_DATA.changeCounts[categoryId]
    ) || 0;

  const maxChanges =
    Number(category.maxChanges) || 0;

  if (
    isChange &&
    changeCount >= maxChanges
  ) {
    showPicksMessage(
      "No pick changes left for this category.",
      true
    );
    return;
  }

  showPicksMessage(
    "Saving pick...",
    false
  );

  const result =
    await apiSavePick({
      username: session.username,
      gameId: PICKS_PAGE_DATA.gameId,
      categoryId,
      nomineeId
    });

  if (!result.success) {
    showPicksMessage(
      result.message || "Could not save pick.",
      true
    );
    return;
  }

  PICKS_PAGE_DATA.picks[categoryId] =
    nomineeId;

  PICKS_PAGE_DATA.changeCounts[categoryId] =
    Number(result.changeCount) || 0;

  PICKS_PAGE_DATA.originalPicks[categoryId] =
    result.originalNomineeId || nomineeId;
  
  if (result.pickMeta) {

    PICKS_PAGE_DATA.pickMeta[categoryId] =
        result.pickMeta;
    
  }  

  refreshPicksPage();

  showPicksMessage(
    "Pick saved.",
    false
  );

}

function refreshPicksPage() {

  const el =
    document.getElementById("picksCategoryList");

  if (!el) {
    return;
  }

  el.innerHTML =
    renderPicksCategoryList();

  mountPicksPage();

}

/* =========================
   COLLAPSE
========================= */

function togglePickCategory(categoryId) {

  const card =
    document.querySelector(
      `[data-category-id="${cssEscape(categoryId)}"]`
    );

  if (!card) {
    return;
  }

  card.classList.toggle("collapsed");

}

/* =========================
   MOUNT / COUNTDOWN
========================= */

function mountPicksPage() {

  if (PICKS_COUNTDOWN_TIMER) {
    clearInterval(PICKS_COUNTDOWN_TIMER);
  }

  updateCountdowns();

  PICKS_COUNTDOWN_TIMER =
    setInterval(
      updateCountdowns,
      1000
    );

}

function updateCountdowns() {

  document
    .querySelectorAll(".pick-third-line")
    .forEach(el => {

      const defaultText =
        el.dataset.defaultText || "";

      const alreadyLocked =
        el.dataset.locked === "true";

      const lockTime =
        el.dataset.lockTime;

      if (
        defaultText === "Winner" ||
        (
          defaultText &&
          defaultText !== "Make Pick Now ↓" &&
          defaultText !== "Locked"
        )
      ) {
        el.innerText =
          defaultText;
        return;
      }

      if (alreadyLocked) {
        el.innerText =
          "Locked";
        return;
      }

      if (!lockTime) {
        el.innerText =
          defaultText || "Make Pick Now ↓";
        return;
      }

      const lockDate =
        new Date(lockTime);

      if (isNaN(lockDate.getTime())) {
        el.innerText =
          defaultText || "Make Pick Now ↓";
        return;
      }

      const diff =
        lockDate.getTime() -
        Date.now();

      if (diff <= 0) {
        el.innerText =
          "Locked";
        el.dataset.locked =
          "true";
        return;
      }

      el.innerText =
        "Make Pick Now ↓  •  Locks in " +
        formatCountdown(diff);

    });

}

function formatCountdown(ms) {

  const totalSeconds =
    Math.floor(ms / 1000);

  const days =
    Math.floor(totalSeconds / 86400);

  const hours =
    Math.floor((totalSeconds % 86400) / 3600);

  const minutes =
    Math.floor((totalSeconds % 3600) / 60);

  const seconds =
    totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;

}

/* =========================
   STATUS HELPERS
========================= */

function getPickStatus(category, selectedNomineeId) {

  const winner =
    normalizeId(category.winnerNomineeId);

  const pick =
    normalizeId(selectedNomineeId);

  if (!winner || !pick) {
    return {
      label: "Pending",
      className: "pending",
      icon: ""
    };
  }

  if (winner === pick) {
    return {
      label: "Winner",
      className: "correct",
      icon: "🏆"
    };
  }

  return {
    label: "Incorrect",
    className: "wrong",
    icon: ""
  };

}

function getCategoryTitle(category, status) {

  if (status.className === "correct") {
    return `${category.name} — Correct`;
  }

  if (status.className === "wrong") {
    return `${category.name} — Wrong`;
  }

  return category.name;

}

function getSelectedNominee(category) {

  const selectedId =
    PICKS_PAGE_DATA.picks[category.id];

  if (!selectedId) {
    return null;
  }

  return category.nominees.find(n =>
    normalizeId(n.id) === normalizeId(selectedId)
  ) || null;

}

function getWinnerNominee(category) {

  const winnerId =
    category.winnerNomineeId;

  if (!winnerId) {
    return null;
  }

  return category.nominees.find(n =>
    normalizeId(n.id) === normalizeId(winnerId)
  ) || null;

}

function getOriginalNominee(category) {

  const originalId =
    PICKS_PAGE_DATA.originalPicks[category.id];

  const currentId =
    PICKS_PAGE_DATA.picks[category.id];

  if (
    !originalId ||
    normalizeId(originalId) === normalizeId(currentId)
  ) {
    return null;
  }

  return category.nominees.find(n =>
    normalizeId(n.id) === normalizeId(originalId)
  ) || null;

}

function getThirdLineText(
  category,
  selectedNominee,
  winnerNominee,
  status
) {

  const locked =
    isCategoryLocked(category);

  const hasWinner =
    Boolean(winnerNominee);

  if (!hasWinner) {

    if (locked) {
      return "Locked";
    }

    return "Make Pick Now ↓";

  }

  if (status.className === "correct") {
    return "Winner";
  }

  return winnerNominee.name;

}

function isCategoryLocked(category) {

  if (category.locked === true) {
    return true;
  }

  if (!category.lockDateTime) {
    return false;
  }

  const lockDate =
    new Date(category.lockDateTime);

  if (isNaN(lockDate.getTime())) {
    return false;
  }

  return Date.now() >= lockDate.getTime();

}

function getLockLabel(category) {

  if (isCategoryLocked(category)) {
    return "Locked";
  }

  if (!category.lockDateTime) {
    return "No lock time set";
  }

  return "Loading countdown...";

}

function getLayoutClass(category) {

  const layout =
    String(category.layoutType || "image")
      .toLowerCase();

  if (
    layout === "text" ||
    layout === "short-answer"
  ) {
    return "nominee-layout nominee-layout-text";
  }

  if (
    layout === "compact" ||
    layout === "list"
  ) {
    return "nominee-layout nominee-layout-list";
  }

  return "nominee-layout nominee-layout-image";

}

/* =========================
   MESSAGE
========================= */

function showPicksMessage(message, isError) {

  const el =
    document.getElementById("picksPageMessage");

  if (!el) {
    return;
  }

  el.innerText =
    message;

  el.classList.remove(
    "hidden",
    "error",
    "success"
  );

  el.classList.add(
    isError ? "error" : "success"
  );

  if (!isError) {

    setTimeout(() => {
      el.classList.add("hidden");
    }, 1800);

  }

}

/* =========================
   SAFETY HELPERS
========================= */

function normalizeId(value) {

  return String(value || "")
    .trim()
    .toLowerCase();

}

function escapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

function escapeAttr(value) {

  return escapeHtml(value);

}

function escapeJs(value) {

  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");

}

function cssEscape(value) {

  if (window.CSS && CSS.escape) {
    return CSS.escape(value);
  }

  return String(value || "")
    .replace(/"/g, '\\"');

}
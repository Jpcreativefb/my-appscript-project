/* ======================
   PICKS PAGE
====================== */

async function renderPicksPage() {

  const session =
    getCurrentSession();

  if (
    !session ||
    !session.username
  ) {

    return `
      <div class="page">
        <h1>Make Your Picks</h1>
        <p>You must be logged in to make picks.</p>
      </div>
    `;

  }

  const gameId =
    getFrontendGameId();

  const username =
    getCurrentUsername();

  const categoriesRes =
    await apiGetCategories(
      gameId
    );

  console.log(
    "CATEGORIES API",
    categoriesRes
  );

  const picksRes =
    await apiGetMyPicks(
      username,
      gameId
    );

  console.log(
    "MY PICKS API",
    picksRes
  );

  const categories =
    Array.isArray(categoriesRes)
      ? categoriesRes
      : categoriesRes.categories || [];

  const picks =
    picksRes.picks || {};

  APP_STATE.picks =
    picks;

  if (!categories.length) {

    return `
      <div class="page">
        <h1>Make Your Picks</h1>
        <p>No categories found.</p>
      </div>
    `;

  }

  return `
    <div class="page">

      <h1>Make Your Picks</h1>

      <div class="category-list">

        ${categories.map(cat => {

          const locked =
            cat.locked === true;

          return `
            <div class="category-card">

              <h2>${escapeHtml(cat.name)}</h2>

              ${
                locked
                  ? `<p class="locked-label">Locked</p>`
                  : ``
              }

              <div class="nominee-grid">

                ${(cat.nominees || []).map(n => {

                  const selected =
                    picks[cat.id] === n.id;

                  return `
                    <button
                      class="nominee-card ${selected ? "selected" : ""}"
                      data-category-id="${escapeAttr(cat.id)}"
                      data-nominee-id="${escapeAttr(n.id)}"
                      onclick="selectNominee('${escapeJs(cat.id)}', '${escapeJs(n.id)}')"
                      ${locked ? "disabled" : ""}
                    >

                      ${
                        n.image
                          ? `<img src="${escapeAttr(n.image)}" alt="">`
                          : ``
                      }

                      <span>${escapeHtml(n.name)}</span>

                      ${
                        selected
                          ? `<strong>✓</strong>`
                          : ``
                      }

                    </button>
                  `;

                }).join("")}

              </div>

            </div>
          `;

        }).join("")}

      </div>

    </div>
  `;

}

/* ======================
   SELECT NOMINEE
====================== */

async function selectNominee(
  categoryId,
  nomineeId
) {

  const session =
    getCurrentSession();

  if (
    !session ||
    !session.username
  ) {

    alert(
      "You must be logged in."
    );

    return;

  }

  const gameId =
    getFrontendGameId();

  const username =
    getCurrentUsername();

  APP_STATE.picks[categoryId] =
    nomineeId;

  highlightSelections();

  const res =
    await apiSavePick(
      username,
      categoryId,
      nomineeId,
      gameId
    );

  console.log(
    "SAVE PICK API",
    res
  );

  if (!res.success) {

    alert(
      res.message ||
      "Could not save pick"
    );

    return;

  }

  APP_STATE.picks[categoryId] =
    res.nomineeId || nomineeId;

  highlightSelections();

}

/* ======================
   HIGHLIGHT SELECTIONS
====================== */

function highlightSelections() {

  document
    .querySelectorAll(".nominee-card")
    .forEach(btn => {

      btn.classList.remove(
        "selected"
      );

      const categoryId =
        btn.dataset.categoryId;

      const nomineeId =
        btn.dataset.nomineeId;

      if (
        APP_STATE.picks[categoryId] ===
        nomineeId
      ) {

        btn.classList.add(
          "selected"
        );

      }

    });

}

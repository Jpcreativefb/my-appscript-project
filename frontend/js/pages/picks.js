async function renderPicksPage() {

  const session = getSession();

  // later we replace this with API call
  const gameId = "oscars-2026";

  const res =
    await apiGetCategories(gameId);

  console.log("CATEGORIES API", res);

  const categories =
    res.categories || [];


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

        ${categories.map(cat => `
          
          <div class="category-card">

            <h2>${cat.name}</h2>

            <div class="nominee-grid">

              ${cat.nominees.map(n => `
                
                <button class="nominee-card"
                  onclick="selectNominee('${cat.id}', '${n.id}')">

                  ${n.name}

                </button>

              `).join("")}

            </div>

          </div>

        `).join("")}

      </div>

    </div>
  `;
}

function getMockCategories() {

  return [
    {
      id: "best-film",
      name: "Best Film",
      nominees: [
        { id: "f1", name: "Movie A" },
        { id: "f2", name: "Movie B" },
        { id: "f3", name: "Movie C" }
      ]
    },
    {
      id: "best-actor",
      name: "Best Actor",
      nominees: [
        { id: "a1", name: "Actor A" },
        { id: "a2", name: "Actor B" }
      ]
    }
  ];
}

const USER_PICKS = {};

function selectNominee(categoryId, nomineeId) {

  USER_PICKS[categoryId] = nomineeId;

  console.log("Picks updated:", USER_PICKS);

  highlightSelections();
}

function highlightSelections() {

  document.querySelectorAll(".nominee-card")
    .forEach(btn => {
      btn.classList.remove("selected");
    });

  Object.entries(USER_PICKS).forEach(([cat, nominee]) => {

    const el = document.querySelector(
      `[onclick*="${nominee}"]`
    );

    if (el) {
      el.classList.add("selected");
    }

  });
}
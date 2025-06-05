document.addEventListener("DOMContentLoaded", () => {
  const ALGOLIA_APP_ID = "8F898N22SG";
  const ALGOLIA_API_KEY = "220989c4d1bf9e3c4c287803161b7c24";
  const ALGOLIA_INDEX_NAME = "deco_apparel";

  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
  const index = client.initIndex(ALGOLIA_INDEX_NAME);

  const targetSelector = ".dn-search-results-container";
  const checkInterval = 300;
  

  function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name) || "";
  }

  function renderResults(container, hits, query) {
    container.innerHTML = "";

    const header = document.createElement("h2");
    header.style.marginBottom = "16px";
    header.className = "no-results-message";

    if (!query) {
      header.textContent = "No search term provided.";
      container.appendChild(header);
      return;
    }

    if (!hits.length) {
      header.textContent = `No results found for: "${query}"`;
      container.appendChild(header);
      return;
    }

    header.textContent = `Search results for: "${query}"`;
    header.style.textAlign = "left";
    container.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "search-results-grid";

    hits.forEach((hit) => {
      const card = document.createElement("div");
      card.className = "search-result-card";

      const imageUrl =
        hit.Image_URL ||
        "https://placehold.co/300x180?text=No+Image&font=roboto";

      card.innerHTML = `
        <img src="${imageUrl}" alt="${hit.Product_Name}"
             onerror="this.src='https://placehold.co/300x180?text=No+Image&font=roboto'">
        <div class="content">
          <h4>${hit.Product_Name}</h4>
          <p>${hit.Product_Description || ""}</p>
          <p><strong>${hit.Product_Price || ""}</strong></p>
        </div>
      `;

      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
        if (hit.URL_Link) {
          window.location.href = hit.URL_Link;
        }
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  const intervalId = setInterval(() => {
    const container = document.querySelector(targetSelector);
    if (container) {
      clearInterval(intervalId);

      container.style.display = "none";

      const query = getQueryParam("query").trim();
      if (!query) {
        container.innerHTML = "";
        container.style.display = "block";
        renderResults(container, [], "");
        return;
      }

      index
        .search(query, { hitsPerPage: 20 })
        .then(({ hits }) => {
          container.innerHTML = "";
          container.style.display = "block";
          renderResults(container, hits, query);
        })
        .catch((err) => {
          container.innerHTML = `<p>Error loading results: ${err.message}</p>`;
          container.style.display = "block";
        });

    }
  }, checkInterval);
});

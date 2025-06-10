document.addEventListener("DOMContentLoaded", () => {
  const ALGOLIA_APP_ID = "8F898N22SG";
  const ALGOLIA_API_KEY = "220989c4d1bf9e3c4c287803161b7c24";
  const ALGOLIA_INDEX_NAME = "deco_apparel_v2";

  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
  const index = client.initIndex(ALGOLIA_INDEX_NAME);

  const targetSelector = ".dn-search-results-container";
  const checkInterval = 300;

  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // Replace spaces/special chars with hyphens
      .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
  }

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
        hit.image_url ||
        "https://placehold.co/300x180?text=No+Image&font=roboto";

      card.innerHTML = `
        <img src="${imageUrl}" alt="${hit.name}"
             onerror="this.src='https://placehold.co/300x180?text=No+Image&font=roboto'">
        <div class="content">
          <h4>${hit.name}</h4>
          <p>${hit.description || ""}</p>
          <p><strong>€${hit.price_euro?.toFixed(2) || "—"}</strong></p>
        </div>
      `;

      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
        if (hit.product_url || hit.product_page_url) {
          window.location.href = hit.product_page_url || hit.product_url;
        }
        // const slug = slugify(hit.name);
        // window.location.href = `/create_products/${slug}`;
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  const intervalId = setInterval(() => {
    const container = document.querySelector(targetSelector);
    attempts++;

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
        .search(query, { hitsPerPage: 100 })
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

    if (attempts >= 66) {
      clearInterval(intervalId); // Stop after 20 seconds
      console.warn("Search results container not found after 20 seconds.");
    }
  }, checkInterval);

  let attempts = 0;
});

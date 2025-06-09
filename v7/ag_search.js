const ALGOLIA_APP_ID = "8F898N22SG";
const ALGOLIA_API_KEY = "220989c4d1bf9e3c4c287803161b7c24";
const ALGOLIA_INDEX_NAME = "deco_apparel_v2";

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
const index = client.initIndex(ALGOLIA_INDEX_NAME);

document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.querySelector(".dn-search-field-container");
  if (!wrapper) return;

  const overlay = document.createElement("div");
  overlay.id = "search-popup-overlay";

  const closeBtn = document.createElement("button");
  closeBtn.id = "popup-close-btn";
  closeBtn.innerHTML = "&times;";

  const input = document.createElement("input");
  input.type = "text";
  input.id = "search-input";
  input.placeholder = "Search products...";

  const micButton = document.createElement("button");
  micButton.id = "search-mic-button";
  micButton.innerHTML = "🎤";
  micButton.type = "button";

  const inputWrapper = document.createElement("div");
  inputWrapper.id = "search-input-wrapper";
  inputWrapper.append(input, micButton);

  const recentContainer = document.createElement("div");
  recentContainer.id = "recent-searches";

  const feedback = document.createElement("div");
  feedback.id = "search-feedback";

  const resultsWrapper = document.createElement("div");
  resultsWrapper.id = "results-wrapper";

  const results = document.createElement("div");
  results.id = "product-results";

  const showMoreContainer = document.createElement("div");
  showMoreContainer.id = "show-more-container";

  resultsWrapper.append(results, showMoreContainer);
  overlay.append(
    closeBtn,
    inputWrapper,
    recentContainer,
    feedback,
    resultsWrapper
  );
  document.body.appendChild(overlay);

  // Opens the search popup and loads recent + results
  function openSearchPopup() {
    input.value = wrapper.querySelector("input")?.value || "";
    overlay.style.display = "flex";
    input.focus();
    renderRecentSearches();
    searchProducts(input.value);
  }

  wrapper.addEventListener("click", openSearchPopup);

  // Wait for mobile icon and bind
  const waitForMobileIcon = setInterval(() => {
    const mobileIcon = document.querySelector(".dn-nav-search");
    if (mobileIcon) {
      clearInterval(waitForMobileIcon);
      mobileIcon.addEventListener("click", openSearchPopup);
    }
  }, 100);

  closeBtn.addEventListener("click", () => (overlay.style.display = "none"));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.style.display = "none";
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.style.display === "flex") {
      overlay.style.display = "none";
    }
  });

  let debounceTimeout;
  input.addEventListener("input", () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      searchProducts(input.value);
    }, 1000); // Debounce 1s
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const query = input.value.trim();
      if (query) {
        window.location.href = `/search/results?query=${encodeURIComponent(
          query
        )}`;
      }
    }
  });

  micButton.addEventListener("click", () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Sorry, your browser doesn't support voice search.");
      return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();
    micButton.classList.add("listening");

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      input.value = transcript;
      searchProducts(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      micButton.classList.remove("listening");
    };
  });

  function searchProducts(query) {
    const trimmed = query.trim();
    if (!trimmed) {
      feedback.textContent = "";
      results.innerHTML = "";
      showMoreContainer.innerHTML = "";
      return;
    }

    feedback.textContent = `Searching for: "${trimmed}"...`;
    results.innerHTML = "";
    showMoreContainer.innerHTML = "";

    index.search(trimmed, { hitsPerPage: 10 }).then(({ hits, nbHits }) => {
      if (hits.length === 0) {
        feedback.textContent = `No results found for: "${trimmed}"`;
        return;
      }

      feedback.textContent = `Search results for: "${trimmed}"`;
      updateRecentSearches(trimmed);
      renderRecentSearches();

      const uniqueHits = [];
      const seen = new Set();
      for (const hit of hits) {
        if (!seen.has(hit.objectID)) {
          seen.add(hit.objectID);
          uniqueHits.push(hit);
        }
        if (uniqueHits.length === 5) break;
      }

      uniqueHits.forEach((product) => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
          <a href="${product.product_page_url}" target="_blank">
            <img src="${product.image_url}" alt="${product.name}" />
            <div class="product-info">
              <h4>${product.name}</h4>
              <p>€${product.price_euro}</p>
            </div>
          </a>
        `;
        results.appendChild(card);
      });

      if (nbHits > 5) {
        const showMoreBtn = document.createElement("button");
        showMoreBtn.className = "show-more-button";
        showMoreBtn.textContent = `Show more results for "${trimmed}" →`;
        showMoreBtn.addEventListener("click", () => {
          window.location.href = `/search/results?query=${encodeURIComponent(
            trimmed
          )}`;
        });
        showMoreContainer.appendChild(showMoreBtn);
      }
    });
  }

  function updateRecentSearches(query) {
    const key = "recent_product_searches";
    let history = JSON.parse(localStorage.getItem(key)) || [];
    history = history.filter((q) => q !== query);
    history.unshift(query);
    if (history.length > 5) history = history.slice(0, 5);
    localStorage.setItem(key, JSON.stringify(history));
  }

  function renderRecentSearches() {
    const key = "recent_product_searches";
    const history = JSON.parse(localStorage.getItem(key)) || [];

    recentContainer.innerHTML = "";
    if (history.length === 0) return;

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";

    const title = document.createElement("h5");
    title.textContent = "Recent Searches:";

    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear All";
    clearBtn.style.fontSize = "12px";
    clearBtn.style.background = "transparent";
    clearBtn.style.border = "none";
    clearBtn.style.cursor = "pointer";
    clearBtn.style.color = "#007acc";
    clearBtn.addEventListener("click", () => {
      localStorage.removeItem(key);
      renderRecentSearches();
    });

    header.appendChild(title);
    header.appendChild(clearBtn);
    recentContainer.appendChild(header);

    history.forEach((term) => {
      const item = document.createElement("span");
      item.className = "recent-search-item";
      item.textContent = term;
      item.addEventListener("click", () => {
        input.value = term;
        searchProducts(term);
      });
      recentContainer.appendChild(item);
    });
  }
});

const client = algoliasearch("8F898N22SG", "220989c4d1bf9e3c4c287803161b7c24");
const index = client.initIndex("deco_apparel_v2");

function watchElements(selector, callback) {
  const seen = new Set();
  document.querySelectorAll(selector).forEach((el) => {
    seen.add(el);
    callback(el);
  });
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches(selector) && !seen.has(node)) {
          seen.add(node);
          callback(node);
        }
        node.querySelectorAll(selector).forEach((el) => {
          if (!seen.has(el)) {
            seen.add(el);
            callback(el);
          }
        });
      }
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  return () => obs.disconnect();
}

window.addEventListener("load", () => {
  watchElements(".dn-search-field-container input", (inputEl) => {
    // — create containers —
    const container = document.createElement("div");
    container.className = "suggestions-container";
    container.style.display = "none";
    document.body.appendChild(container);

    const recentContainer = document.createElement("div");
    recentContainer.className = "recent-searches";
    container.appendChild(recentContainer);

    const dropdown = document.createElement("div");
    dropdown.className = "suggestions-dropdown";
    container.appendChild(dropdown);

    // — localStorage helpers —
    function getRecent() {
      return JSON.parse(localStorage.getItem("recentSearches") || "[]");
    }

    function addRecent(q) {
      if (!q) return;

      const arr = getRecent();
      // if this query is already the most recent, do nothing
      if (arr[0] === q) return;

      // remove any existing occurrence, then unshift
      const filtered = arr.filter((x) => x !== q);
      filtered.unshift(q);

      // keep only the latest 5
      if (filtered.length > 5) filtered.length = 5;

      localStorage.setItem("recentSearches", JSON.stringify(filtered));
    }

    function renderRecent() {
      const arr = getRecent();

      if (arr.length) {
        // show the recent-searches bar
        recentContainer.style.display = "flex";
        recentContainer.innerHTML = "";

        // render each recent item
        arr.forEach((q) => {
          const item = document.createElement("div");
          item.className = "recent-item";
          item.textContent = q;
          item.addEventListener("click", () => {
            inputEl.value = q;
            inputEl.dispatchEvent(new Event("input"));
          });
          recentContainer.appendChild(item);
        });

        // render Clear all button
        const clearAll = document.createElement("div");
        clearAll.className = "clear-all";
        clearAll.textContent = "Clear all";
        clearAll.addEventListener("click", () => {
          localStorage.removeItem("recentSearches");
          renderRecent();
          container.style.display = "none";
        });
        recentContainer.appendChild(clearAll);
      } else {
        // no recents → hide the entire bar
        recentContainer.innerHTML = "";
        recentContainer.style.display = "none";
      }
    }

    // — position container 20px below input, full-width —
    function position() {
      const rect = inputEl.getBoundingClientRect();
      // if viewport ≤480px, use 60px; otherwise 20px
      const isMobile = window.matchMedia("(max-width: 800px)").matches;
      const offset = isMobile ? 60 : 20;
      container.style.top = `${rect.bottom + window.scrollY + offset}px`;
      container.style.left = "0";
    }

    position();
    window.addEventListener("scroll", position);
    window.addEventListener("resize", position);

    // — close on outside click —
    document.addEventListener("click", (e) => {
      if (!inputEl.contains(e.target) && !container.contains(e.target)) {
        container.style.display = "none";
      }
    });

    // — show “Searching for …” —
    function showLoading(q) {
      renderRecent();
      // if no recents AND user hasn’t typed anything yet, don’t show
      if (!getRecent().length && !q) {
        return (container.style.display = "none");
      }
      dropdown.innerHTML = `<div class="dropdown-title">Searching for “${q}”</div>`;
      container.style.display = "block";

    }

    // — render results with title & cards —
    function renderDropdown(hits, q, total) {
      renderRecent();
      dropdown.innerHTML = "";

      // if NO hits, hide the panel outright
      if (!hits.length) {
        return (container.style.display = "none");
      }
      
      // title
      const title = document.createElement("div");
      title.className = "dropdown-title";
      title.textContent = total
        ? `Found ${total} item${total > 1 ? "s" : ""}`
        : "No items found";
      dropdown.appendChild(title);
      if (!hits.length) return (container.style.display = "block");

      // cards
      hits.slice(0, 5).forEach((item) => {
        const card = document.createElement("div");
        card.className = "search-card";
        card.innerHTML = `
            <img src="${item.image_url}" alt="${item.name}" />
            <div class="card-info">
              <div class="product-name">${item.name}</div>
              <div class="price">
                ${new Intl.NumberFormat("en-IE", {
                  style: "currency",
                  currency: "EUR"
                }).format(item.price_euro)}
              </div>
            </div>
          `;
        card.addEventListener("click", () => {
          addRecent(q);
          window.location.href = item.product_page_url;
        });
        dropdown.appendChild(card);
      });

      // “Show more”
      const more = document.createElement("div");
      more.className = "show-more";
      more.textContent = "Show more";
      more.addEventListener("click", () => {
        addRecent(q);
        window.location.href = `/search/results?query=${encodeURIComponent(q)}`;
      });
      dropdown.appendChild(more);

      container.style.display = "block";
    }
    let searchTimeout;

    inputEl.addEventListener("input", () => {
      const q = inputEl.value.trim();

      // cancel any pending search
      clearTimeout(searchTimeout);

      if (!q) {
        container.style.display = "none";
        return;
      }

      // immediately show the “Searching for…” title
      showLoading(q);

      // schedule the actual search 1s after the last keystroke
      searchTimeout = setTimeout(() => {
        index
          .search(q, { hitsPerPage: 5 })
          .then(({ hits, nbHits }) => renderDropdown(hits, q, nbHits))
          .catch((err) => {
            console.error(err);
            dropdown.innerHTML = `<div class="dropdown-title">Error fetching results</div>`;
            container.style.display = "block";
          });
      }, 1000);
    });

    // — on focus: load recents and re-run last query —
    inputEl.addEventListener("focus", () => {
      const rec = getRecent();
      if (rec.length) {
        const last = rec[0];
        inputEl.value = last;
        inputEl.dispatchEvent(new Event("input"));
      } else {
        // NO recents ⇒ keep it hidden
        container.style.display = "none";
      }
    });
    

    // — on Enter: save & go to full-results —
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const q = inputEl.value.trim();
        if (q) {
          addRecent(q);
          window.location.href = `/search/results?query=${encodeURIComponent(
            q
          )}`;
        }
      }
    });

    // On blur: save whatever was last typed
    inputEl.addEventListener("blur", () => {
      const q = inputEl.value.trim();
      if (q) addRecent(q);
    });

  });
});

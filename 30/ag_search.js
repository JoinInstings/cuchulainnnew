// ────────────────────────────────────────────────────────────────
// 0) Initialize Algolia client & index
// ────────────────────────────────────────────────────────────────
const client = algoliasearch("8F898N22SG","220989c4d1bf9e3c4c287803161b7c24");
const index  = client.initIndex("deco_apparel");

// Track selected facets & last query
const selectedFacets = { brand:new Set(), colors:new Set(), sizes:new Set() };
let currentQuery = "";

// ────────────────────────────────────────────────────────────────
// Utility: watchElements
// ────────────────────────────────────────────────────────────────
function watchElements(selector, cb) {
  const seen = new Set();
  document.querySelectorAll(selector).forEach(el => { seen.add(el); cb(el); });
  const obs = new MutationObserver(ms => {
    ms.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType!==1) return;
        if (node.matches(selector) && !seen.has(node)) {
          seen.add(node); cb(node);
        }
        node.querySelectorAll(selector).forEach(el => {
          if (!seen.has(el)) { seen.add(el); cb(el); }
        });
      });
    });
  });
  obs.observe(document.documentElement,{ childList:true, subtree:true });
  return () => obs.disconnect();
}

// ────────────────────────────────────────────────────────────────
// 1) On load: bind to the search input
// ────────────────────────────────────────────────────────────────
window.addEventListener("load", () => {
  watchElements(".dn-search-field-container input", inputEl => {
    // 1a) Create overlay container & inner flex wrapper
    const container = document.createElement("div");
    container.className = "suggestions-container";
    container.style.display = "none";
    document.body.appendChild(container);

    const inner = document.createElement("div");
    inner.className = "suggestions-inner";
    container.appendChild(inner);

    // 1b) Mobile-only “Filters” toggle button
    const filterToggle = document.createElement("button");
    filterToggle.className = "filter-toggle-btn";
    filterToggle.textContent = "Filters";
    inner.insertBefore(filterToggle, inner.firstChild);

    let facetsPane;
    filterToggle.addEventListener("click", () => {
      const open = container.classList.toggle("open");
      if (facetsPane) facetsPane.style.display = open ? "block" : "none";
    });

    // Prevent closing when clicking inside
    ["mousedown", "touchstart"].forEach((evt) => {
      container.addEventListener(evt, (e) => e.stopPropagation());
      const wrap = inputEl.closest(".dn-search-field-container");
      if (wrap) wrap.addEventListener(evt, (e) => e.stopPropagation());
    });
    // Close on outside click/touch
    ["mousedown", "touchstart"].forEach((evt) => {
      document.addEventListener(evt, () => (container.style.display = "none"));
    });

    // ────────────────────────────────────────────────────────────
    // 2) Sidebar: facets pane + “Apply” on mobile
    // ────────────────────────────────────────────────────────────
    facetsPane = document.createElement("div");
    facetsPane.className = "search-facets";
    inner.appendChild(facetsPane);

    const applyBtn = document.createElement("button");
    applyBtn.className = "apply-filters-btn";
    applyBtn.textContent = "Apply";
    facetsPane.appendChild(applyBtn);
    applyBtn.addEventListener("click", () => {
      performSearch(currentQuery);
      facetsPane.style.display = "none";
      container.classList.remove("open");
    });

    const attrs = ["brand", "colors", "sizes"];
    function capitalize(s) {
      return s[0].toUpperCase() + s.slice(1);
    }

    function renderFacets(facets) {
      facetsPane.innerHTML = "";
      attrs.forEach((attr) => {
        const counts = facets[attr] || {};
        const sec = document.createElement("div");
        sec.className = "facet-section";
        sec.innerHTML = `
          <h4>${capitalize(attr)}</h4>
          <ul class="facet-list" data-attr="${attr}"></ul>`;
        const ul = sec.querySelector("ul");
        Object.entries(counts).forEach(([v, c]) => {
          const chk = selectedFacets[attr].has(v) ? "checked" : "";
          const li = document.createElement("li");
          li.innerHTML = `
            <label>
              <input type="checkbox"
                     data-attr="${attr}"
                     value="${v}" ${chk} />
              ${v} (${c})
            </label>`;
          li.querySelector("input").addEventListener("change", (e) => {
            if (e.target.checked) selectedFacets[attr].add(v);
            else selectedFacets[attr].delete(v);
            performSearch(currentQuery);
          });
          ul.appendChild(li);
        });
        facetsPane.appendChild(sec);
      });
      facetsPane.appendChild(applyBtn);
    }

    // ────────────────────────────────────────────────────────────
    // 3) Main area: recents + dropdown
    // ────────────────────────────────────────────────────────────
    const main = document.createElement("div");
    main.className = "suggestions-main";
    inner.appendChild(main);

    const recentContainer = document.createElement("div");
    recentContainer.className = "recent-searches";
    main.appendChild(recentContainer);

    const dropdown = document.createElement("div");
    dropdown.className = "suggestions-dropdown";
    main.appendChild(dropdown);

    function getRecent() {
      return JSON.parse(localStorage.getItem("recentSearches") || "[]");
    }
    function addRecent(q) {
      if (!q) return;
      let arr = getRecent().filter((x) => x !== q);
      arr.unshift(q);
      if (arr.length > 5) arr.length = 5;
      localStorage.setItem("recentSearches", JSON.stringify(arr));
    }
    function renderRecent() {
      const arr = getRecent();
      if (arr.length) {
        recentContainer.style.display = "flex";
        recentContainer.innerHTML = "";
        arr.forEach((q) => {
          const d = document.createElement("div");
          d.className = "recent-item";
          d.textContent = q;
          d.addEventListener("click", () => {
            inputEl.value = q;
            performSearch(q);
          });
          recentContainer.appendChild(d);
        });
        const clr = document.createElement("div");
        clr.className = "clear-all";
        clr.textContent = "Clear all";
        clr.addEventListener("click", () => {
          localStorage.removeItem("recentSearches");
          renderRecent();
          container.style.display = "none";
        });
        recentContainer.appendChild(clr);
      } else {
        recentContainer.innerHTML = "";
        recentContainer.style.display = "none";
      }
    }

    // ────────────────────────────────────────────────────────────
    // 4) Position overlay (desktop under input, mobile full-screen @60px)
    // ────────────────────────────────────────────────────────────
    function position() {
      const rect = inputEl.getBoundingClientRect();
      const isMobile = window.matchMedia("(max-width:480px)").matches;
      if (isMobile) {
        container.classList.add("open");
        container.style.top = "60px";
        container.style.left = "0";
        container.style.right = "0";
        container.style.bottom = "0";
      } else {
        container.classList.remove("open");
        container.style.top = `${rect.bottom + window.scrollY + 20}px`;
        container.style.left = "0";
        container.style.right = "";
        container.style.bottom = "";
      }
    }
    position();
    window.addEventListener("scroll", position);
    window.addEventListener("resize", position);

    // ────────────────────────────────────────────────────────────
    // 5) Loading state
    // ────────────────────────────────────────────────────────────
    function showLoading(q) {
      renderRecent();
      if (!getRecent().length && !q) {
        container.style.display = "none";
        return;
      }
      dropdown.innerHTML = `<div class="dropdown-title">Searching for “${q}”</div>`;
      container.style.display = "block";
    }

    // ────────────────────────────────────────────────────────────
    // 6) Build facetFilters
    // ────────────────────────────────────────────────────────────
    function buildFilters() {
      const out = [];
      inner.querySelectorAll(".facet-list[data-attr]").forEach((ul) => {
        const a = ul.dataset.attr;
        const vals = Array.from(ul.querySelectorAll("input:checked")).map(
          (cb) => cb.value
        );
        if (vals.length) out.push(vals.map((v) => `${a}:${v}`));
      });
      return out;
    }

    // ────────────────────────────────────────────────────────────
    // 7) performSearch
    // ────────────────────────────────────────────────────────────
    function performSearch(q) {
      currentQuery = q;
      if (!q) {
        container.style.display = "none";
        return;
      }
      showLoading(q);
      const ff = buildFilters();
      index
        .search(q, {
          hitsPerPage: 100,
          facetFilters: ff.length ? ff : undefined,
          facets: ["brand", "colors", "sizes"],
          maxValuesPerFacet: 10
        })
        .then(({ hits, nbHits, facets }) => {
          renderFacets(facets);
          renderDropdown(hits, q, nbHits);
        })
        .catch(console.error);
    }

    // ────────────────────────────────────────────────────────────
    // 8) renderDropdown
    // ────────────────────────────────────────────────────────────
    function renderDropdown(hits, q, total) {
      renderRecent();
      dropdown.innerHTML = "";
      const title = document.createElement("div");
      title.className = "dropdown-title";
      title.textContent = total
        ? `Found ${total} item${total > 1 ? "s" : ""}`
        : "No items found";
      dropdown.appendChild(title);

      if (!hits.length) return (container.style.display = "block");

      hits.forEach((item) => {
        const card = document.createElement("div");
        card.className = "search-card";
        card.innerHTML = `
          <img src="${item.image_url}" alt="${item.name}"/>
          <div class="card-info">
            <div class="product-name">${item.name}</div>
            <div class="price">
              from ${new Intl.NumberFormat("en-IE", {
                style: "currency",
                currency: "EUR"
              }).format(item.regular_price)}
              <br/>as low as ${new Intl.NumberFormat("en-IE", {
                style: "currency",
                currency: "EUR"
              }).format(item.as_low_as_price)}
            </div>
          </div>`;
        card.addEventListener("click", () => {
          addRecent(q);
          window.location.href = item.product_page_url;
        });
        dropdown.appendChild(card);
      });

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

    // ────────────────────────────────────────────────────────────
    // 9) Input events: debounce, reset facets, focus/enter/blur
    // ────────────────────────────────────────────────────────────
    let dt;
    inputEl.addEventListener("input", () => {
      clearTimeout(dt);
      const q = inputEl.value.trim();
      Object.values(selectedFacets).forEach((s) => s.clear());
      inner
        .querySelectorAll(".facet-list input:checked")
        .forEach((cb) => (cb.checked = false));
      dt = setTimeout(() => performSearch(q), 1000);
    });
    inputEl.addEventListener("focus", () => {
      const rec = getRecent();
      rec.length ? performSearch(rec[0]) : (container.style.display = "none");
    });
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
    inputEl.addEventListener("blur", () => {
      const q = inputEl.value.trim();
      if (q) addRecent(q);
    });

    // On blur: save whatever was last typed
    inputEl.addEventListener("blur", () => {
      const q = inputEl.value.trim();
      if (q) addRecent(q);
    });

    // 1a) Create & insert mic button
    const micBtn = document.createElement("button");
    micBtn.type = "button";
    micBtn.className = "voice-search-btn";
    micBtn.title = "Start voice search";
    micBtn.innerHTML = "🎤"; // or use an <svg> icon

    // ensure the input’s container is positioned
    inputEl.parentNode.style.position = "relative";
    // place the button inside the container
    inputEl.parentNode.appendChild(micBtn);

    // 3a) Cross-browser SpeechRecognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.lang = "en-GB";
      recognizer.interimResults = false;
      recognizer.maxAlternatives = 1;

      let listening = false;

      micBtn.addEventListener("click", () => {
        if (!listening) {
          recognizer.start();
        } else {
          recognizer.stop();
        }
      });

      recognizer.addEventListener("start", () => {
        listening = true;
        micBtn.classList.add("listening");
        micBtn.title = "Listening… click to stop";
      });

      recognizer.addEventListener("result", (evt) => {
        const transcript = evt.results[0][0].transcript;
        inputEl.value = transcript;
        inputEl.dispatchEvent(new Event("input")); // trigger your existing search
      });

      recognizer.addEventListener("end", () => {
        listening = false;
        micBtn.classList.remove("listening");
        micBtn.title = "Start voice search";
      });

      recognizer.addEventListener("error", (err) => {
        console.error("Voice search error:", err);
        listening = false;
        micBtn.classList.remove("listening");
        micBtn.title = "Start voice search";
      });
    } else {
      // browser doesn’t support it—hide the button
      micBtn.style.display = "none";
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const ALGOLIA_APP_ID = "8F898N22SG";
  const ALGOLIA_API_KEY = "220989c4d1bf9e3c4c287803161b7c24";
  const ALGOLIA_INDEX_NAME = "deco_apparel_v2";

  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
  const index = client.initIndex(ALGOLIA_INDEX_NAME);

  const checkInterval = 500;
  const targetSelector = ".dn-search-field";

  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // Replace spaces/special chars with hyphens
      .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
  }

  function createAutocomplete(input) {
    let dropdown = document.createElement("div");
    dropdown.classList.add("autocomplete-results");
    dropdown.style.display = "none";
    input.parentNode.style.position = "relative";
    input.parentNode.appendChild(dropdown);
    // Add mic button
    const micButton = document.createElement("button");
    micButton.type = "button";
    micButton.innerHTML = "🎤";
    micButton.style.position = "absolute";
    micButton.style.right = "8px";
    micButton.style.top = "50%";
    micButton.style.transform = "translateY(-50%)";
    micButton.style.border = "none";
    micButton.style.background = "transparent";
    micButton.style.cursor = "pointer";
    micButton.style.fontSize = "18px";
    input.parentNode.appendChild(micButton);

    micButton.addEventListener("click", () => {
      if (!("webkitSpeechRecognition" in window)) {
        alert("Voice recognition not supported in this browser.");
        return;
      }

      const recognition = new webkitSpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.start();

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        input.value = transcript;
        input.dispatchEvent(new Event("input")); // trigger autocomplete search
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
      };
    });

    let currentFocus = -1;
    let currentHits = [];

    function showSuggestions(results) {
      dropdown.innerHTML = "";
      currentHits = results;

      if (results.length === 0) {
        dropdown.style.display = "none";
        return;
      }

      results.forEach((hit, index) => {
        const option = document.createElement("div");
        option.textContent = hit.name;
        option.className = "autocomplete-item";
        option.addEventListener("click", () => {
          // const slug = slugify(hit.name);
          // window.location.href = `/create_products/${slug}`;
          if (hit.product_url || hit.product_page_url) {
            window.location.href = hit.product_url || hit.product_page_url;
          }
        });
        dropdown.appendChild(option);
      });

      dropdown.style.display = "block";
    }

    function highlightItem(index) {
      const items = dropdown.querySelectorAll(".autocomplete-item");
      items.forEach((el, i) => {
        el.classList.toggle("active", i === index);
        if (i === index) {
          el.scrollIntoView({ block: "nearest" });
        }
      });
    }

    let debounceTimeout;
    input.addEventListener("input", () => {
      const query = input.value.trim();
      if (!query) {
        dropdown.style.display = "none";
        return;
      }

      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        index
          .search(query, { hitsPerPage: 10 })
          .then(({ hits }) => {
            currentFocus = -1;
            showSuggestions(hits);
          })
          .catch((err) => {
            console.error("Algolia search error:", err);
          });
      }, 300);
    });

    input.addEventListener("keydown", (e) => {
      const results = dropdown.querySelectorAll(".autocomplete-item");
      if (e.key === "ArrowDown") {
        currentFocus = (currentFocus + 1) % results.length;
        highlightItem(currentFocus);
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        currentFocus = (currentFocus - 1 + results.length) % results.length;
        highlightItem(currentFocus);
        e.preventDefault();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const items = dropdown.querySelectorAll(".autocomplete-item");

        if (currentFocus >= 0 && currentHits[currentFocus]) {
          items[currentFocus].click(); // Simulate click to ensure consistent behavior
        } else {
          const query = encodeURIComponent(input.value.trim());
          if (query) {
            window.location.href = `/search/results?query=${query}`;
          }
        }
      }
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && e.target !== input) {
        dropdown.style.display = "none";
      }
    });
  }

  const intervalId = setInterval(() => {
    const input = document.querySelector(targetSelector);
    if (input) {
      createAutocomplete(input);
      clearInterval(intervalId);
    }
  }, checkInterval);
});

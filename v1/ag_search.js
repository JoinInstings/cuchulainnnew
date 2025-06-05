// document.addEventListener("DOMContentLoaded", function () {
//   const ALGOLIA_APP_ID = "8F898N22SG";
//   const ALGOLIA_API_KEY = "220989c4d1bf9e3c4c287803161b7c24";
//   const ALGOLIA_INDEX_NAME = "deco_apparel";

//   const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
//   const index = client.initIndex(ALGOLIA_INDEX_NAME);

//   const checkInterval = 500;
//   const targetSelector = ".dn-search-field";

//   function slugify(text) {
//     return text
//       .toLowerCase()
//       .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
//       .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
//     }
  

//   function createAutocomplete(input) {
//     let dropdown = document.createElement("div");
//     dropdown.classList.add("autocomplete-results");
//     dropdown.style.display = "none";
//     input.parentNode.style.position = "relative";
//     input.parentNode.appendChild(dropdown);

//     let currentFocus = -1;

//     function showSuggestions(results) {
//       dropdown.innerHTML = "";
//       if (results.length === 0) {
//         dropdown.style.display = "none";
//         return;
//       }

//       results.forEach((hit, index) => {
//         const option = document.createElement("div");
//         option.textContent = hit.product_name;
//         option.className = "autocomplete-item";
//         option.addEventListener("click", () => {
//           const productName = option.textContent;
//           const slug = slugify(productName);
//           window.location.href = `create_products/${slug}`;
//         });
//         dropdown.appendChild(option);
//       });

//       dropdown.style.display = "block";
//     }

//     function highlightItem(index) {
//       const items = dropdown.querySelectorAll(".autocomplete-item");
//       items.forEach((el, i) => {
//         el.classList.toggle("active", i === index);
//         if (i === index) {
//           el.scrollIntoView({ block: "nearest" });
//         }
//       });
//     }

//     let debounceTimeout;
//     input.addEventListener("input", () => {
//       const query = input.value.trim();
//       if (!query) {
//         dropdown.style.display = "none";
//         return;
//       }

//       clearTimeout(debounceTimeout);
//       debounceTimeout = setTimeout(() => {
//         index
//           .search(query, { hitsPerPage: 10 })
//           .then(({ hits }) => {
//             currentFocus = -1;
//             showSuggestions(hits);
//           })
//           .catch((err) => {
//             console.error("Algolia search error:", err);
//           });
//       }, 300);
//     });

//     input.addEventListener("keydown", (e) => {
//       const results = dropdown.querySelectorAll(".autocomplete-item");
//       if (e.key === "ArrowDown") {
//         currentFocus = (currentFocus + 1) % results.length;
//         highlightItem(currentFocus);
//         e.preventDefault();
//       } else if (e.key === "ArrowUp") {
//         currentFocus = (currentFocus - 1 + results.length) % results.length;
//         highlightItem(currentFocus);
//         e.preventDefault();
//       } else if (e.key === "Enter") {
//         e.preventDefault();
//         const results = dropdown.querySelectorAll(".autocomplete-item");

//         if (currentFocus >= 0 && results[currentFocus]) {
//           const productName = results[currentFocus].textContent;
//           const slug = slugify(productName);
//           window.location.href = `create_products/${slug}`;
//         } else {
//           const query = encodeURIComponent(input.value.trim());
//           if (query) {
//             window.location.href = `search/results?query=${query}`;
//           }
//         }
//       }
//     });

//     document.addEventListener("click", (e) => {
//       if (!dropdown.contains(e.target) && e.target !== input) {
//         dropdown.style.display = "none";
//       }
//     });
//   }

//   const intervalId = setInterval(() => {
//     const input = document.querySelector(targetSelector);
//     if (input) {
//       createAutocomplete(input);
//       clearInterval(intervalId);
//     }
//   }, checkInterval);
// });

document.addEventListener("DOMContentLoaded", function () {
  const ALGOLIA_APP_ID = "8F898N22SG";
  const ALGOLIA_API_KEY = "220989c4d1bf9e3c4c287803161b7c24";
  const ALGOLIA_INDEX_NAME = "deco_apparel";

  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
  const index = client.initIndex(ALGOLIA_INDEX_NAME);

  const checkInterval = 500;
  const targetSelector = ".dn-search-field";

  function createAutocomplete(input) {
    let dropdown = document.createElement("div");
    dropdown.classList.add("autocomplete-results");
    dropdown.style.display = "none";
    input.parentNode.style.position = "relative";
    input.parentNode.appendChild(dropdown);

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
        option.textContent = hit.Product_Name;
        option.className = "autocomplete-item";
        option.addEventListener("click", () => {
          if (hit.URL_Link) {
            window.location.href = hit.URL_Link;
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
        if (currentFocus >= 0 && currentHits[currentFocus]) {
          const selectedHit = currentHits[currentFocus];
          if (selectedHit.URL_Link) {
            window.location.href = selectedHit.URL_Link;
          }
        } else {
          const query = encodeURIComponent(input.value.trim());
          if (query) {
            window.location.href = `search/results?query=${query}`;
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
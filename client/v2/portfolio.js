// Invoking strict mode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#invoking_strict_mode
'use strict';

/**
Description of the available api
GET https://lego-api-blue.vercel.app/deals

Search for specific deals

This endpoint accepts the following optional query string parameters:

- `page` - page of deals to return
- `size` - number of deals to return

GET https://lego-api-blue.vercel.app/sales

Search for current Vinted sales for a given lego set id

This endpoint accepts the following optional query string parameters:

- `id` - lego set id to return
*/

// current deals on the page
let currentDeals = [];
let currentPagination = {};
let favoriteDeals = JSON.parse(localStorage.getItem('favoriteDeals')) || [];

// instantiate the selectors
const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const sectionDeals = document.querySelector('#deals');
const spanNbDeals = document.querySelector('#nbDeals');
// Feature 8 - SELECT THE ELEMENT
const spanNbSales = document.querySelector('#nbSales');
// Feature 9 - SELECT THE ELEMENTS
const spanAverage = document.querySelector('#average');
const spanP5 = document.querySelector('#p5');
const spanP25 = document.querySelector('#p25');
const spanP50 = document.querySelector('#p50');
const spanLifetime = document.querySelector('#lifetime');

/**
 * Set global value
 * @param {Array} result - deals to display
 * @param {Object} meta - pagination meta info
 */
const setCurrentDeals = ({ result, meta }) => {
  currentDeals = result;
  currentPagination = meta;
};

/**
 * Fetch deals from api
 * @param  {Number}  [page=1] - current page to fetch
 * @param  {Number}  [size=12] - size of the page
 * @return {Object}
 */
const fetchDeals = async (page = 1, size = 6) => {
  try {
    const response = await fetch(
      `http://localhost:8092/deals/search?limit=${size}`
    );
    const body = await response.json();

    if (body.success !== true) {
      console.error(body);
      return { currentDeals, currentPagination };
    }

    return body.data;
  } catch (error) {
    console.error(error);
    return { currentDeals, currentPagination };
  }
};

/**
 * Render list of deals
 * @param  {Array} deals
 */
const renderDeals = deals => {
  const fragment = document.createDocumentFragment();
  // Don't wrap all deals in a single div snippet, insert them directly into grid
  const template = deals
    .map(deal => {
      const isFavorite = favoriteDeals.some(d => d.uuid === deal.uuid);
      const favIcon = isFavorite ? '❤️' : '🤍';
      
      // Primary photo from scraper
      const primaryPhoto = deal.photo;
      // Fallback photo from Brickset (predictable CDN)
      const fallbackPhoto = deal.id ? `https://images.brickset.com/sets/images/${deal.id}-1.jpg` : 'https://via.placeholder.com/300x200?text=No+Image';
      
      const photoUrl = primaryPhoto || fallbackPhoto;
      const temperatureHtml = deal.temperature ? `<span class="heat">🔥 ${deal.temperature}°</span>` : '';
      const discountHtml = deal.discount ? `<span class="discount-badge">-${deal.discount}%</span>` : '';
      const retailHtml = deal.retail ? `<span class="retail">${deal.retail}€</span>` : '';
      const scoreBadge = deal.score ? `<div style="background-color: var(--lego-yellow); color: #121212; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-bottom: 10px; display: inline-block;">Score: ${Math.round(deal.score)}</div>` : '';

      return `
      <div class="deal-card" id=${deal.uuid}>
        <img src="${photoUrl}" alt="${deal.title}" class="deal-image" onerror="this.onerror=null;this.src='https://images.brickset.com/sets/images/${deal.id}-1.jpg';">
        <div class="deal-content">
          <div>${scoreBadge}</div>
          <a href="${deal.link}" target="_blank" class="deal-title">${deal.title}</a>
          <div class="deal-meta">
            <span>ID: ${deal.id}</span>
            ${temperatureHtml}
          </div>
          <div class="deal-price-row">
            <span class="price">${deal.price}€</span>
            ${retailHtml}
            ${discountHtml}
          </div>
          <div class="actions">
            <button class="favorite-btn" data-uuid="${deal.uuid}">${favIcon}</button>
          </div>
        </div>
      </div>
    `;
    })
    .join('');

  sectionDeals.innerHTML = template;
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderPagination = pagination => {
  const { currentPage, pageCount } = pagination;
  const options = Array.from(
    { 'length': pageCount },
    (value, index) => `<option value="${index + 1}">${index + 1}</option>`
  ).join('');

  selectPage.innerHTML = options;
  selectPage.selectedIndex = currentPage - 1;
};

/**
 * Render lego set ids selector
 * @param  {Array} lego set ids
 */
const renderLegoSetIds = deals => {
  const ids = getIdsFromDeals(deals);
  const options = ids.map(id =>
    `<option value="${id}">${id}</option>`
  ).join('');

  selectLegoSetIds.innerHTML = options;
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderIndicators = pagination => {
  const { count } = pagination;

  spanNbDeals.innerHTML = count;
};

const render = (deals, pagination) => {
  renderDeals(deals);
  renderPagination(pagination);
  renderIndicators(pagination);
  renderLegoSetIds(deals)
};

/**
 * Declaration of all Listeners
 */

/**
 * Select the number of deals to display
 */
selectShow.addEventListener('change', async (event) => {
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(event.target.value));

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

/**
 * Feature 1 - Browse pages
 * Select the page to display
 */
selectPage.addEventListener('change', async (event) => {
  // 1. We get the new page number the user selected
  const newPage = parseInt(event.target.value);

  // 2. We also need to know how many deals per page the user wants (6, 12, or 24)
  // We get this from the 'show' selector we used in Feature 0
  const size = parseInt(selectShow.value);

  // 3. We fetch the new data from the API with:
  // - The new page number
  // - The current page size
  const deals = await fetchDeals(newPage, size);

  // 4. We update our global variables with the new data
  setCurrentDeals(deals);

  // 5. We redraw (render) the page with the new deals
  render(currentDeals, currentPagination);
});

/**
 * Feature 2 - Filter by best discount
 * Filter the current deals to keep only the ones with > 50% discount
 */
// We select the "By best discount" button (it's the first span in the #filters box)
const filterBestDiscount = document.querySelector('#filters span:nth-child(1)');

filterBestDiscount.addEventListener('click', () => {
  // 1. We create a new list of deals by filtering the current one
  // The .filter() function goes through every deal
  const bestDeals = currentDeals.filter(deal => {
    // Log the discount to see what values we have (Open your browser console to see this!)
    // console.log('Deal:', deal.title, 'Discount:', deal.discount);

    // We keep the deal only if the discount is bigger than 30% (lowered from 50% to find more results)
    // Note: We ensure 'deal.discount' exists; some API items might be missing it.
    return deal.discount > 30;
  });

  // 2. We update the screen with our filtered list
  // We pass the currentPagination because we haven't changed pages, just filtered what we see
  render(bestDeals, currentPagination);
});

/**
 * Feature 3 - Filter by most commented
 * Filter the current deals to keep only the ones with > 5 comments
 */
// We select the "By most commented" button (it's the second span in the #filters box)
const filterMostCommented = document.querySelector('#filters span:nth-child(2)');

filterMostCommented.addEventListener('click', () => {
  // 1. We create a new list of deals by filtering the current one
  // The .filter() function goes through every deal
  const commentedDeals = currentDeals.filter(deal => {
    // We keep the deal only if the number of comments is bigger than 15
    // Note: We confirm that 'deal.comments' exists in the data
    return deal.comments > 5;
  });

  // 2. We update the screen with our filtered list
  render(commentedDeals, currentPagination);
});

/**
 * Feature 4 - Filter by hot deals
 * Filter the current deals to keep only the hot ones (temperature > 100)
 */
// 1. SELECT THE ELEMENT
// We look for the 3rd <span> inside the <div id="filters"> in the HTML
const filterHotDeals = document.querySelector('#filters span:nth-child(3)');

// 2. LISTEN FOR CLICKS
filterHotDeals.addEventListener('click', () => {
  // 3. FILTER THE DATA
  // We create a new list called 'hotDeals'
  const hotDeals = currentDeals.filter(deal => {
    // We keep the deal only if its temperature is greater than 100 degrees
    // (We assume the API gives us a property called 'temperature' or 'heat')
    // Note: If this doesn't work, we might need to check the exact property name from the API data
    return deal.temperature > 100;
  });

  // 4. UPDATE THE UI
  // We redraw the page with only the hot deals
  render(hotDeals, currentPagination);
});

/**
 * Feature 5 - Sort by price
 * Feature 6 - Sort by date
 */
// 1. SELECT THE ELEMENT
const selectSort = document.querySelector('#sort-select');

// 2. LISTEN FOR CHANGES
selectSort.addEventListener('change', (event) => {
  // 3. GET THE SELECTED VALUE
  const sortValue = event.target.value;

  // 4. CREATE A COPY TO SORT
  // We use [...currentDeals] to make a copy so we don't mess up the original order permanently
  const sortedDeals = [...currentDeals];

  // 5. SORT THE DATA BASED ON SELECTION
  switch (sortValue) {
    case 'price-asc':
      // Cheaper First: Small -> Big
      sortedDeals.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      break;
    case 'price-desc':
      // Expensive First: Big -> Small
      sortedDeals.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      break;
    case 'date-asc':
      // Recently published: New -> Old (Descending Date)
      // We convert the date string to a Date object to compare numbers
      sortedDeals.sort((a, b) => new Date(b.published) - new Date(a.published));
      break;
    case 'date-desc':
      // Anciently published: Old -> New (Ascending Date)
      sortedDeals.sort((a, b) => new Date(a.published) - new Date(b.published));
      break;
    case 'profit-desc':
      sortedDeals.sort((a, b) => {
        const profitA = a.discount || (a.retail ? ((a.retail - a.price) / a.retail * 100) : 0);
        const profitB = b.discount || (b.retail ? ((b.retail - b.price) / b.retail * 100) : 0);
        return profitB - profitA;
      });
      break;
  }

  // 6. UPDATE THE UI
  render(sortedDeals, currentPagination);
});

/**
 * Feature 7 - Display Vinted sales
 * Fetch and display sales from Vinted when a Lego Set ID is selected
 */

// 1. function to fetch sales from the API
const fetchSales = async (id) => {
  try {
    const response = await fetch(`http://localhost:8092/sales/search?legoSetId=${id}`);
    const body = await response.json();

    if (body.success !== true) {
      console.error(body);
      return { result: [], meta: {} };
    }

    return body.data;
  } catch (error) {
    console.error(error);
    return { result: [], meta: {} };
  }
};

// 2. LISTEN FOR CHANGES
selectLegoSetIds.addEventListener('change', async (event) => {
  // 3. GET THE SELECTED ID
  const legoSetId = event.target.value;

  // 4. FETCH THE DATA
  const salesData = await fetchSales(legoSetId);

  // We want to include the deals for this ID that are currently displayed
  const dealsForId = currentDeals.filter(deal => String(deal.id) === String(legoSetId));

  // Indicators and statistics should rely ONLY on Vinted data (salesData.result)
  const combinedItems = salesData.result || [];
  
  // We keep the deals for the ID for the main display, but statistics use Vinted only
  // The 'render' function doesn't care if it's a Deal or a Sale, as long as it has a title and price!
  setCurrentDeals({ result: [...dealsForId, ...combinedItems], meta: salesData.meta || {} });

  // Feature 8 - Update the Number of Sales in the UI
  // The 'result' array inside salesData contains all our sales, so we just count its length
  spanNbSales.innerHTML = salesData.result ? salesData.result.length : 0;

  // Feature 10 - Lifetime value
  if (combinedItems.length > 1) {
    const minDate = Math.min(...combinedItems.map(item => item.published));
    const maxDate = Math.max(...combinedItems.map(item => item.published));
    const lifetime = Math.round((maxDate - minDate) / (60 * 60 * 24));
    spanLifetime.innerHTML = `${Math.max(0, lifetime)} days`;
  } else {
    spanLifetime.innerHTML = `0 days`;
  }
  
  // Feature 9 - Calculate average, p5, p25, p50
  if (combinedItems.length > 0) {
    const prices = combinedItems.map(item => parseFloat(item.price));
    
    // Average
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;
    spanAverage.innerHTML = average.toFixed(2);

    // Percentiles
    prices.sort((a, b) => a - b);
    spanP5.innerHTML = prices[Math.floor(prices.length * 0.05)];
    spanP25.innerHTML = prices[Math.floor(prices.length * 0.25)];
    spanP50.innerHTML = prices[Math.floor(prices.length * 0.50)];
  } else {
    spanAverage.innerHTML = '0.00';
    spanP5.innerHTML = '0.00';
    spanP25.innerHTML = '0.00';
    spanP50.innerHTML = '0.00';
  }

  render(currentDeals, currentPagination);
});

/**
 * Feature 14 - Filter by favorite
 */
const filterFavorite = document.querySelector('#filters span:nth-child(4)');

filterFavorite.addEventListener('click', () => {
  render(favoriteDeals, currentPagination);
});

/**
 * Clear Filters
 */
const clearFilters = document.querySelector('#filters span:nth-child(5)');
clearFilters.addEventListener('click', async () => {
  // Re-fetch using original pagination values or just re-render current state without filters
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(selectShow.value));
  setCurrentDeals(deals);
  
  const algoDetails = document.getElementById('algo-details');
  if (algoDetails) algoDetails.style.display = 'none';

  render(currentDeals, currentPagination);
});

/**
 * Best Deals Button
 */
const salesDataCache = {};

const bestDealsBtn = document.querySelector('#best-deals-btn');
bestDealsBtn.addEventListener('click', async () => {
  sectionDeals.innerHTML = '<p style="text-align:center;font-size:1.2rem;color:var(--lego-yellow);">⚙️ Calculating Lego Algorithm... Crunching API details...</p>';

  // Fetch unique sales details to compute lifetime and actual Vinted popularity
  const uniqueIds = [...new Set(currentDeals.map(d => d.id))];
  for (const id of uniqueIds) {
    if (!salesDataCache[id]) {
      const sales = await fetchSales(id);
      salesDataCache[id] = sales.result || [];
    }
  }

  // Calculate scores based on algorithmic weights
  const scoredDeals = currentDeals.map(deal => {
    const sales = salesDataCache[deal.id] || [];
    
    const profitRatio = deal.discount || (deal.retail ? ((deal.retail - deal.price) / deal.retail * 100) : 0);
    const nbSales = sales.length;
    
    let lifetime = 0;
    if (sales.length > 0) {
      const allDates = [...sales.map(s => s.published), deal.published];
      const minDate = Math.min(...allDates);
      const maxDate = Math.max(...allDates);
      lifetime = Math.round((maxDate - minDate) / (60 * 60 * 24));
    } else {
      lifetime = 365; // Penalize lack of sales
    }
    const lifetimeScore = Math.max(0, 30 - lifetime); // Max score 30
    const heatScore = (deal.temperature || 0) / 10;
    const commentScore = (deal.comments || 0);

    const score = (profitRatio * 1.5) + (nbSales * 2.0) + (lifetimeScore * 1.0) + (heatScore * 2.0) + (commentScore * 0.5);
    
    return { ...deal, score };
  });

  scoredDeals.sort((a, b) => b.score - a.score);

  const algoDetails = document.getElementById('algo-details');
  if (algoDetails) {
    algoDetails.style.display = 'block';
    algoDetails.innerHTML = `
      <h3 style="color:var(--lego-red); margin-top:0;">📊 Algorithm Deep Dive: How the Score is Calculated</h3>
      <p style="margin-bottom:10px;">We've analyzed your current view and ranked the sets out of 100+ points using the following metrics (sorted by score):</p>
      <ul style="line-height:1.6; color:var(--text-main);">
        <li><strong style="color:var(--lego-yellow)">Profit Proportion (x1.5):</strong> Deals natively priced lower than their retail worth grab an active profitability boost.</li>
        <li><strong style="color:var(--lego-yellow)">Number of Sales (x2.0):</strong> We actively pinged Vinted! Sets that feature higher actual sales volume are highly boosted. High volume = massive brand interest!</li>
        <li><strong style="color:var(--lego-yellow)">Lifetime Value Velocity (x1.0):</strong> Sets that were pushed online recently and sold easily score high. If no one buys it (0 sales within 365 days) it gets drastically penalized.</li>
        <li><strong style="color:var(--lego-yellow)">Temperature / Heat (x0.2):</strong> A raw indicator of the Dealabs community hype metrics.</li>
        <li><strong style="color:var(--lego-yellow)">Community Support (x0.5):</strong> The raw number of comments attached natively to this deal listing.</li>
      </ul>
    `;
  }

  // Update select to reflect this behavior manually
  if (selectSort.querySelector('option[value="profit-desc"]')) {
     selectSort.value = 'profit-desc';
  }
  
  render(scoredDeals, currentPagination);
});

/**
 * Feature 13 - Save as favorite
 */
sectionDeals.addEventListener('click', (event) => {
  if (event.target.classList.contains('favorite-btn')) {
    const uuid = event.target.dataset.uuid;
    const isFavorite = favoriteDeals.some(d => d.uuid === uuid);
    if (isFavorite) {
      favoriteDeals = favoriteDeals.filter(d => d.uuid !== uuid);
      event.target.innerHTML = '🤍';
    } else {
      const dealToAdd = currentDeals.find(d => d.uuid === uuid) || favoriteDeals.find(d => d.uuid === uuid);
      if (dealToAdd) {
        favoriteDeals.push(dealToAdd);
        event.target.innerHTML = '❤️';
      }
    }
    localStorage.setItem('favoriteDeals', JSON.stringify(favoriteDeals));
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

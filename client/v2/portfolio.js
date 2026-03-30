// Invoking strict mode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#invoking_strict_mode
'use strict';

/**
Description of the available api
GET https://legoproject-5ioiubfoz-tjoliot-30s-projects.vercel.app/deals

Search for specific deals

This endpoint accepts the following optional query string parameters:

- `page` - page of deals to return
- `size` - number of deals to return

GET https://legoproject-5ioiubfoz-tjoliot-30s-projects.vercel.app/sales

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
 * @param {Object} options - { legoSetId, size }
 * @return {Object}
 */
const fetchDeals = async ({ legoSetId = '', size = 12, filterBy = '', page = 1 } = {}) => {
  try {
    const response = await fetch(
      `https://legoproject-5ioiubfoz-tjoliot-30s-projects.vercel.app/deals/search?limit=${size}&legoSetId=${legoSetId}&filterBy=${filterBy}&page=${page}`
    );
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

/**
 * Render list of deals
 * @param  {Array} deals
 * @param  {Object} pagination
 */
const renderDeals = (deals, pagination) => {
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
      const commentHtml = deal.comments !== undefined ? `<span class="comments">💬 ${deal.comments}</span>` : '';
      const discountHtml = deal.discount ? `<span class="discount-badge">-${deal.discount}%</span>` : '';
      const retailHtml = deal.retail ? `<span class="retail">${deal.retail}€</span>` : '';
      const scoreBadge = (deal.score !== undefined) ? `<div style="background-color: var(--lego-yellow); color: #121212; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-bottom: 10px; display: inline-block;">Score: ${Math.round(deal.score)}</div>` : '';

      return `
      <div class="deal-card" id=${deal.uuid}>
        <img src="${photoUrl}" alt="${deal.title}" class="deal-image" onerror="this.onerror=null;this.src='https://images.brickset.com/sets/images/${deal.id}-1.jpg';">
        <div class="deal-content">
          <div>${scoreBadge}</div>
          <a href="${deal.link}" target="_blank" class="deal-title">${deal.title}</a>
          <div class="deal-meta">
            <span>ID: ${deal.id}</span>
            ${temperatureHtml}
            ${commentHtml}
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
  spanNbDeals.innerHTML = deals.length;
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderPagination = pagination => {
  const { currentPage, pageCount } = pagination;
  const options = Array.from(
    { 'length': pageCount || 0 },
    (value, index) => `<option value="${index + 1}">${index + 1}</option>`
  ).join('');

  selectPage.innerHTML = options;
  selectPage.selectedIndex = (currentPage || 1) - 1;
};

/**
 * Render lego set ids selector
 * @param  {Array} lego set ids
 */
const renderLegoSetIds = deals => {
  const ids = Array.from(new Set(deals.map(d => d.id))).filter(id => id);
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
  console.log('Rendering Deals:', deals);
  console.log('Pagination / Meta Data:', pagination);
  renderDeals(deals, pagination);
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
  const deals = await fetchDeals({ size: parseInt(event.target.value) });

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

/**
 * Feature 1 - Browse pages
 * Select the page to display
 */
selectPage.addEventListener('change', async (event) => {
  const newPage = parseInt(event.target.value);
  const size = parseInt(selectShow.value);
  const deals = await fetchDeals({ size, page: newPage });

  // 4. We update our global variables with the new data
  setCurrentDeals(deals);

  // 5. We redraw (render) the page with the new deals
  render(currentDeals, currentPagination);
});

/**
 * Feature 2 - Filter by best discount
 */
// We select the "By best discount" button (it's the first span in the #filters box)
const filterBestDiscount = document.querySelector('#filters span:nth-child(1)');

filterBestDiscount.addEventListener('click', async () => {
  const deals = await fetchDeals({
    size: parseInt(selectShow.value),
    filterBy: 'best-discount'
  });

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

/**
 * Feature 3 - Filter by most commented
 */
// We select the "By most commented" button (it's the second span in the #filters box)
const filterMostCommented = document.querySelector('#filters span:nth-child(2)');

filterMostCommented.addEventListener('click', async () => {
  const deals = await fetchDeals({
    size: parseInt(selectShow.value),
    filterBy: 'most-commented'
  });

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

/**
 * Feature 4 - Filter by hot deals
 */
const filterHotDeals = document.querySelector('#filters span:nth-child(3)');

filterHotDeals.addEventListener('click', () => {
  const hotDeals = currentDeals.filter(deal => deal.temperature > 100);
  render(hotDeals, currentPagination);
});

/**
 * Sort Listeners
 */
const selectSort = document.querySelector('#sort-select');

selectSort.addEventListener('change', (event) => {
  const sortValue = event.target.value;
  const sortedDeals = [...currentDeals];

  switch (sortValue) {
    case 'price-asc':
      sortedDeals.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      break;
    case 'price-desc':
      sortedDeals.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      break;
    case 'date-asc':
      sortedDeals.sort((a, b) => new Date(b.published) - new Date(a.published));
      break;
    case 'date-desc':
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

  render(sortedDeals, currentPagination);
});

/**
 * Feature 7 - Display Vinted sales
 */
const fetchSales = async (id) => {
  try {
    const response = await fetch(`https://legoproject-5ioiubfoz-tjoliot-30s-projects.vercel.app/sales/search?legoSetId=${id}`);
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

selectLegoSetIds.addEventListener('change', async (event) => {
  const legoSetId = event.target.value;
  const salesData = await fetchSales(legoSetId);

  const dealsForId = currentDeals.filter(deal => String(deal.id) === String(legoSetId));
  const combinedItems = salesData.result || [];

  setCurrentDeals({ result: [...dealsForId, ...combinedItems], meta: salesData.meta || {} });

  spanNbSales.innerHTML = salesData.result ? salesData.result.length : 0;

  const now = Math.floor(Date.now() / 1000);
  const validDates = combinedItems.map(item => item.published).filter(d => typeof d === 'number' && !isNaN(d));

  if (validDates.length > 0) {
    const totalDaysOnline = validDates.reduce((sum, pub) => sum + (now - pub) / (60 * 60 * 24), 0);
    const avgLifetime = Math.round(totalDaysOnline / validDates.length);
    spanLifetime.innerHTML = `${Math.max(0, avgLifetime)} days`;
  } else {
    spanLifetime.innerHTML = `0 days`;
  }

  if (combinedItems.length > 0) {
    const prices = combinedItems.map(item => parseFloat(item.price));
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;
    spanAverage.innerHTML = average.toFixed(2);
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
 * Filter Favorites
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
  const deals = await fetchDeals({ size: parseInt(selectShow.value) });
  setCurrentDeals(deals);

  const algoDetails = document.getElementById('algo-details');
  if (algoDetails) algoDetails.style.display = 'none';

  // Reset indicators
  spanNbSales.innerHTML = 0;
  spanAverage.innerHTML = '0.00';
  spanP5.innerHTML = '0.00';
  spanP25.innerHTML = '0.00';
  spanP50.innerHTML = '0.00';
  spanLifetime.innerHTML = '0 days';

  render(currentDeals, currentPagination);
});

/**
 * Best Deals Algorithm
 */
const salesDataCache = {};
const bestDealsBtn = document.querySelector('#best-deals-btn');

bestDealsBtn.addEventListener('click', async () => {
  sectionDeals.innerHTML = '<p style="text-align:center;font-size:1.2rem;color:var(--lego-yellow);">⚙️ Calculating Lego Algorithm... Crunching API details...</p>';

  const uniqueIds = [...new Set(currentDeals.map(d => d.id))];
  for (const id of uniqueIds) {
    if (!salesDataCache[id]) {
      const sales = await fetchSales(id);
      salesDataCache[id] = sales.result || [];
    }
  }

  const scoredDeals = currentDeals.map(deal => {
    const sales = salesDataCache[deal.id] || [];
    const profitRatio = deal.discount || (deal.retail ? ((deal.retail - deal.price) / deal.retail * 100) : 0);
    const nbSales = sales.length;

    let lifetime = 0;
    const allDates = [...sales.map(s => s.published), deal.published].filter(d => typeof d === 'number' && !isNaN(d));

    if (allDates.length > 0) {
      const minDate = Math.min(...allDates);
      const maxDate = Math.max(...allDates);
      lifetime = Math.round((maxDate - minDate) / (60 * 60 * 24));
    } else {
      lifetime = 365;
    }

    const lifetimeScore = Math.max(0, 30 - lifetime);
    const heatScore = (deal.temperature || 0) / 10;
    const commentScore = (deal.comments || 0);

    const score = (profitRatio * 2.5) + (nbSales * 2.0) + (lifetimeScore * 1.0) + (heatScore * 1.0) + (commentScore * 0.5);

    return { ...deal, score };
  });

  scoredDeals.sort((a, b) => b.score - a.score);

  const algoDetails = document.getElementById('algo-details');
  if (algoDetails) {
    algoDetails.style.display = 'block';
    algoDetails.innerHTML = `
      <h3 style="color:var(--lego-red); margin-top:0;">📊 Algorithm Deep Dive: How the Score is Calculated</h3>
      <ul style="line-height:1.6; color:var(--text-main);">
        <li><strong style="color:var(--lego-yellow)">Profit Proportion (x2.5):</strong> Deals natively priced lower than their retail worth grab an active profitability boost.</li>
        <li><strong style="color:var(--lego-yellow)">Number of Sales (x2.0):</strong> We actively pinged Vinted! Sets that feature higher actual sales volume are highly boosted. High volume = massive brand interest!</li>
        <li><strong style="color:var(--lego-yellow)">Lifetime Value Velocity (x1.0):</strong> Sets that were pushed online recently and sold easily score high. If no one buys it (0 sales within 365 days) it gets drastically penalized.</li>
        <li><strong style="color:var(--lego-yellow)">Temperature / Heat (x1.0):</strong> A raw indicator of the Dealabs community hype metrics.</li>
        <li><strong style="color:var(--lego-yellow)">Community Support (x0.5):</strong> The raw number of comments attached natively to this deal listing.</li>
      </ul>
    `;
  }

  if (selectSort.querySelector('option[value="profit-desc"]')) {
    selectSort.value = 'profit-desc';
  }

  render(scoredDeals, currentPagination);
});

/**
 * Favorites Listener
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
  const deals = await fetchDeals({ size: 12 });
  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

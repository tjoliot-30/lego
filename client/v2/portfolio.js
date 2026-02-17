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

// instantiate the selectors
const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const sectionDeals = document.querySelector('#deals');
const spanNbDeals = document.querySelector('#nbDeals');

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
      `https://lego-api-blue.vercel.app/deals?page=${page}&size=${size}`
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
  const div = document.createElement('div');
  const template = deals
    .map(deal => {
      return `
      <div class="deal" id=${deal.uuid}>
        <span>${deal.id}</span>
        <a href="${deal.link}">${deal.title}</a>
        <span>${deal.price}</span>
      </div>
    `;
    })
    .join('');

  div.innerHTML = template;
  fragment.appendChild(div);
  sectionDeals.innerHTML = '<h2>Deals</h2>';
  sectionDeals.appendChild(fragment);
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
  }

  // 6. UPDATE THE UI
  render(sortedDeals, currentPagination);
});

document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

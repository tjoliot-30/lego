import * as cheerio from 'cheerio';
import { v5 as uuidv5 } from 'uuid';

/**
 * Parse webpage data response
 * @param  {String} data - html response
 * @return {Array} items
 */
const parse = data => {
  const $ = cheerio.load(data);

  return $('.feed-grid__item')
    .map((i, element) => {
      const overlay = $(element).find('a.new-item-box__overlay');
      const metaTitle = overlay.attr('title') || '';
      const link = overlay.attr('href');
      
      // The 'title' attribute often contains: "Title, Price €, ..." 
      // Example: "Lego 10343, 25,00 €"
      const titleParts = metaTitle.split(',');
      const title = titleParts[0].trim();
      
      // 1. Try to get price from the dedicated h3 element
      let priceText = $(element).find('h3[class*="Text"], .new-item-box__description h3').text().trim();
      
      // 2. Fallback: Extract price from the metaTitle string (e.g. "25,00 €")
      if (!priceText || !priceText.includes('€')) {
        const priceMatch = metaTitle.match(/(\d+[,\.]\d+)\s*€/);
        if (priceMatch) priceText = priceMatch[1];
      }

      // Clean up price string for parsing
      const price = parseFloat(priceText.replace(',', '.').replace(/[^\d.]/g, '')) || 0;

      const photo = $(element).find('img[src*="images1.vinted.net"]').attr('src') || $(element).find('.new-item-box__image img').attr('src');

      // Extract Lego Set ID from the entire metaTitle (4-7 digits)
      const setIdMatch = metaTitle.match(/\b(\d{4,7})\b/);
      const legoSetId = setIdMatch ? setIdMatch[1] : null;

      return {
        link,
        price,
        title,
        photo,
        legoSetId,
        'id': legoSetId,
        'uuid': uuidv5(link, uuidv5.URL),
        'published': Math.floor(Date.now() / 1000) // Vinted grid doesn't show exact date easily
      };
    })
    .get();
};

/**
 * Convert Vinted "Ajouté" text to seconds since epoch
 * @param {String} text - e.g. "Il y a un jour", "Il y a 3 heures"
 * @returns {Number} - unix timestamp
 */
const parseAjouteText = (text) => {
  const now = Math.floor(Date.now() / 1000);
  const minInSec = 60;
  const hourInSec = 3600;
  const dayInSec = 86400;
  
  if (!text) return now;

  const lowText = text.toLowerCase();
  
  // Handle textual numbers
  let val = 0;
  const digits = lowText.match(/\d+/);
  if (digits) {
    val = parseInt(digits[0]);
  } else if (lowText.includes('un') || lowText.includes('une')) {
    val = 1;
  } else if (lowText.includes('quelque')) {
    val = 0.1; // "Quelques secondes/minutes"
  } else {
    val = 1; // Default
  }
  
  if (lowText.includes('minute')) return now - (val * minInSec);
  if (lowText.includes('heure')) return now - (val * hourInSec);
  if (lowText.includes('jour')) return now - (val * dayInSec);
  if (lowText.includes('semaine')) return now - (val * dayInSec * 7);
  if (lowText.includes('mois')) return now - (val * dayInSec * 30);
  if (lowText.includes('an')) return now - (val * dayInSec * 365);
  
  return now;
};

/**
 * Scrape detail page of a product
 * @param {String} url 
 * @returns {Object} 
 */
const scrapeDetail = async (url) => {
  try {
    const response = await fetch(url, {
      "headers": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.vinted.fr/catalog",
        "cookie": "anonymous-locale=fr; domain_selected=true;"
      }
    });

    if (!response.ok) {
      if (response.status === 403) console.warn(`⚠️ Vinted Detail 403: Bot protection at ${url}`);
      return null;
    }

    const body = await response.text();
    const $ = cheerio.load(body);
    
    // Use the data-testid confirmed by browser subagent
    let ajouteText = $('[data-testid="item-attributes-added-at"]').text().trim();
    
    // Fallback to legacy selector
    if (!ajouteText) {
      ajouteText = $('.details-list__item:contains("Ajouté")').find('.details-list__item-value').text().trim();
    }

    if (!ajouteText) return null;

    return {
      'published': parseAjouteText(ajouteText),
      'ajouteText': ajouteText
    };
  } catch (error) {
    console.error(`Error in scrapeDetail for ${url}:`, error);
    return null;
  }
};

/**
 * Scrape a given search text on Vinted
 * @param {String} searchText - search term
 * @returns {Array|null}
 */
const scrape = async searchText => {
  const url = `https://www.vinted.fr/catalog?search_text=${searchText}`;
  
  try {
    const response = await fetch(url, {
      "headers": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "cookie": "anonymous-locale=fr; domain_selected=true;"
      }
    });

    if (response.ok) {
      const body = await response.text();
      const items = parse(body);
      
      // Scrape detail for first 5 items sequentially with a delay to avoid 403
      const enrichedItems = [];
      for (const item of items.slice(0, 5)) {
        await new Promise(res => setTimeout(res, 800)); // Delay between requests
        const detail = await scrapeDetail(`https://www.vinted.fr${item.link}`);
        if (detail) {
          enrichedItems.push({ ...item, ...detail });
        } else {
          // If we fail, we still keep the original but it has 'Now' published
          enrichedItems.push(item);
        }
      }
      
      return [...enrichedItems, ...items.slice(5)];
    }

    console.error(`Failed to fetch Vinted: ${response.status} ${response.statusText}`);
    return null;
  } catch (error) {
    console.error('Error scraping Vinted:', error);
    return null;
  }
};

export { scrape };
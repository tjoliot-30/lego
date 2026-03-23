import * as cheerio from 'cheerio';
import { v5 as uuidv5 } from 'uuid';

/**
 * Parse webpage data response
 * @param  {String} data - html response
 * @return {Array} deals
 */
const parse = data => {
  const $ = cheerio.load(data);

  return $('article.thread')
    .map((i, element) => {
      const vueDataAttr = $(element).find('div.js-vue3[data-vue3]').attr('data-vue3');
      if (!vueDataAttr) return null;

      try {
        const vueData = JSON.parse(vueDataAttr);
        const thread = vueData.props.thread;
        if (!thread) return null;

        const title = thread.title;
        const link = `https://www.dealabs.com/bons-plans/${thread.titleSlug}-${thread.threadId}`;
        const price = thread.price || 0;
        
        let discount = thread.percentage || 0;
        if (discount === 0 && thread.nextBestPrice > 0 && price > 0) {
          discount = Math.round((1 - price / thread.nextBestPrice) * 100);
        }
        
        const temperature = thread.temperature || 0;
        const comments = thread.commentCount || 0;
        
        const photo = thread.mainImage ? `https://static-pepper.dealabs.com/${thread.mainImage.path}/re/300x300/qt/60/${thread.mainImage.name}.${thread.mainImage.ext}` : '';

        // Extract Lego Set ID from title (4-7 digits)
        const setIdMatch = title.match(/\b(\d{4,7})\b/);
        const legoSetId = setIdMatch ? setIdMatch[1] : null;

        return {
          title,
          link,
          price,
          discount,
          photo,
          temperature,
          comments,
          legoSetId,
          'id': legoSetId || thread.threadId,
          'uuid': uuidv5(link, uuidv5.URL)
        };
      } catch (e) {
        console.error('Error parsing Vue data for an article', e);
        return null;
      }
    })
    .get()
    .filter(d => d !== null);
};



/**
 * Scrape a given url page
 * @param {String} url - url to parse
 * @returns {Array|null}
 */
const scrape = async (url = 'https://www.dealabs.com/groupe/lego') => {
  try {
    const response = await fetch(url, {
      "headers": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.google.com/",
        "Cache-Control": "max-age=0"
      }
    });

    if (response.ok) {
      const body = await response.text();
      const deals = parse(body);
      
      if (deals.length === 0) {
        console.warn(`Warning: Scraped 0 deals from Dealabs. Body length: ${body.length}. Start: ${body.substring(0, 300)}`);
      }
      
      return deals;
    }

    console.error(`Failed to fetch Dealabs: ${response.status} ${response.statusText}`);
    return null;
  } catch (error) {
    console.error('Error scraping Dealabs:', error);
    return null;
  }
};


export { scrape };

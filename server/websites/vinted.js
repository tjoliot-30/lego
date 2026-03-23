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
        "Accept-Language": "en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "cookie": "v_udt=YkZibDA2cWx4eUxvUnVtL3Qrd0EzblZ1dXd2by0teTNoQ2xEZ1FnWEJ4SndWZC0tOHJqVFArL3pjWE5xVHM1RTZ4aC9Qdz09; anon_id=6a8778d1-ee7c-4b58-b65a-f06fc9f5fe26; anonymous-locale=fr; domain_selected=true; _ga=GA1.1.419414986.1768925824; cf_clearance=Os4eEIt2duSAjL9_SxeH6BDZ2XGVqaOS3DgEab9Zi4I-1774271389-1.2.1.1-tVwMHOXOR.k5AdocNHxyAosEhkYxw_3MMmxPmwWBLxoD7.g7k_c7ekYCtzgq7ZkcAxyz1ftj9Ym2Ofr7micqmHVu6RcraczIkVnEN64aaFjjSVMM5dvK.7AtFmJrIxH9zO5fEpR9GdOhuJrNYJL7gpjMJK6oNkSCbL3rD418bGdHfHDTA3UbVmj7k9.W6ikttNEVA5xcC2mrijM2w.8wm0gUxeL_NOo2plQvPHdKymk; __cf_bm=IB9PBq94nF.UkbabLhp43vTQ9Kd4A2f2RpbrGVYmzGU-1774271389.9688916-1.0.1.1-JFoQ.ZJU5Ka16jiQ4karEHvd9yyJ7Bw6AFwodUSxfX6wiJvL1ppXSLozr_8hgKEuEBFRFRFV7UH0dywuRfXrNnxUtyHVGDuz8n4qDG6eFV_1v8hDKhjeMjvS9aZscIWfbuY0Gz8luOaNtVTVuvFTOQ; datadome=pjqghqvcmJK9RrKQuJBsKpY~CjMnHTRVo~OPHB181rC8UWWsz9p1t35WWIRgPfrhLR7JiFYSDHseXEXNChUlHaWD_ne8pGHolb8qXlcQB219tuHnQHL_lwv1_4tSzbeK",
        "sec-ch-ua": "\"Chromium\";v=\"146\", \"Not-A.Brand\";v=\"24\", \"Google Chrome\";v=\"146\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "Referer": "https://www.google.com/"
      }
    });


    if (response.ok) {
      const body = await response.text();
      return parse(body);
    }

    console.error(`Failed to fetch Vinted: ${response.status} ${response.statusText}`);
    return null;
  } catch (error) {
    console.error('Error scraping Vinted:', error);
    return null;
  }
};

export { scrape };
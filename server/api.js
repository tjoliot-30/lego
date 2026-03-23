import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { scrape as scrapeVinted } from './websites/vinted.js';


const PORT = 8092;

const app = express();

// We load json files as data source
let SALES = [];
let DEALS = [];

app.use(bodyParser.json());
app.use(cors());
app.use(helmet());
app.use(cors())

app.get('/', (request, response) => {
  response.send({'ack': true});
});

app.get('/deals/search', (request, response) => {
  try {
    let { limit = 12, price, date, filterBy } = request.query;
    limit = parseInt(limit);

    let results = [...DEALS];

    if (price) {
      results = results.filter(deal => deal.price <= parseFloat(price));
    }

    if (date) {
      // Assuming published is a timestamp in seconds
      const filterDate = new Date(date).getTime() / 1000;
      results = results.filter(deal => deal.published >= filterDate);
    }

    if (filterBy === 'best-discount') {
      results.sort((a, b) => b.discount - a.discount);
    } else if (filterBy === 'most-commented') {
      results.sort((a, b) => b.comments - a.comments);
    } else {
      results.sort((a, b) => a.price - b.price);
    }

    const total = results.length;
    const pageCount = Math.ceil(total / limit);
    results = results.slice(0, limit);

    return response.status(200).json({
      'success': true,
      'data': {
        'result': results,
        'results': results,
        'meta': {
          limit,
          total,
          'count': total,
          'currentPage': 1,
          'pageCount': pageCount
        }
      }
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ 
      'success': false, 
      'data': { 'result': [], 'meta': {} } 
    });
  }
});

app.get('/deals/:id', (request, response) => {
  try {
    const { id } = request.params;
    const deal = DEALS.find(d => d.uuid === id || d.id === id);

    if (!deal) {
      return response.status(404).json({ success: false, message: 'Deal not found' });
    }

    return response.status(200).json(deal);
  } catch (error) {
    console.error(error);
    return response.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.get('/sales/search', async (request, response) => {
  try {
    let { limit = 12, legoSetId } = request.query;
    limit = parseInt(limit);

    let results = [...SALES];

    if (legoSetId) {
      const filterById = (list) => list.filter(sale => 
        String(sale.id) === String(legoSetId)
      );

      results = filterById(results);

      // Feature: If NO results found in SALES cache OR we want to refresh, try an on-demand scrape!
      if (results.length === 0) {
        console.log(`🔍 No local sales for ${legoSetId}. Scraping Vinted on-demand...`);
        const scraped = await scrapeVinted(`Lego ${legoSetId}`);
        if (scraped && scraped.length > 0) {
          // Filter scraped results too!
          const filteredScraped = filterById(scraped);
          results = filteredScraped;
          // Optionally add all to global SALES so it's cached, avoiding UUID duplicates
          scraped.forEach(s => {
            if (!SALES.some(existing => existing.uuid === s.uuid)) {
              SALES.push(s);
            }
          });
        }
      }
    }

    // Sort by date descending (assuming 'published' or similar)
    results.sort((a, b) => (b.published || 0) - (a.published || 0));

    const total = results.length;
    const pageCount = Math.ceil(total / limit);
    results = results.slice(0, limit);

    return response.status(200).json({
      'success': true,
      'data': {
        'result': results,
        'results': results,
        'meta': {
          limit,
          total,
          'count': total,
          'currentPage': 1,
          'pageCount': pageCount
        }
      }
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({
      'success': false,
      'data': { 'result': [], 'meta': {} }
    });
  }
});


app.listen(PORT, () => {
  // when we start the server we load available json files
  try {
    SALES = JSON.parse(
      readFileSync(path.join(__dirname, 'sources', 'vinted.json'), 'utf8')
    );
    // If it's an object with keys as IDs, we might want to normalize it.
    // But based on the example in md, it looks like an array in the output.
    if (!Array.isArray(SALES)) {
      SALES = Object.entries(SALES).flatMap(([id, items]) => 
        items.map(item => ({
          ...item, 
          id, 
          'price': item.price && item.price.amount ? parseFloat(item.price.amount) : item.price 
        }))
      );
    }
  } catch (error) {
    console.warn(`⚠️ Vinted data not found: ${error}`);
  }

  try {
    DEALS = JSON.parse(
      readFileSync(path.join(__dirname, 'deals.json'), 'utf8')
    );
  } catch (error) {
    console.warn(`⚠️ Dealabs data not found: ${error}`);
  }
})

console.log(`📡 Running on port ${PORT}`);

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

// Function to load local data
const loadData = () => {
  try {
    const vintedPath = path.join(__dirname, 'sources', 'vinted.json');
    let vintedRaw = JSON.parse(readFileSync(vintedPath, 'utf8'));
    SALES = Array.isArray(vintedRaw) ? vintedRaw : Object.entries(vintedRaw).flatMap(([id, items]) =>
      items.map(item => ({
        ...item,
        id,
        'price': (item.price && item.price.amount) ? parseFloat(item.price.amount) : item.price
      }))
    );
    console.log(`✅ Loaded ${SALES.length} sales`);
  } catch (error) {
    console.warn(`⚠️ Vinted data error: ${error.message}`);
  }

  try {
    const dealsPath = path.join(__dirname, 'deals.json');
    DEALS = JSON.parse(readFileSync(dealsPath, 'utf8'));
    console.log(`✅ Loaded ${DEALS.length} deals`);
  } catch (error) {
    console.warn(`⚠️ Dealabs data error: ${error.message}`);
  }
};

// INITIALIZE DATA
loadData();

app.use(bodyParser.json());
app.use(cors());
app.use(helmet());

app.get('/', (request, response) => {
  response.send({ 'ack': true, 'dealsCount': DEALS.length });
});

app.get('/deals/search', async (request, response) => {
  try {
    let { limit = 12, page = 1, price, date, filterBy, legoSetId } = request.query;
    limit = parseInt(limit);
    page = parseInt(page);

    let results = [...DEALS];

    if (legoSetId) {
      results = results.filter(deal => String(deal.id) === String(legoSetId) || String(deal.legoSetId) === String(legoSetId));
    }

    if (price) {
      results = results.filter(deal => deal.price <= parseFloat(price));
    }

    if (date) {
      const filterDate = new Date(date).getTime() / 1000;
      results = results.filter(deal => deal.published >= filterDate);
    }

    if (filterBy === 'best-discount') {
      results = results.filter(deal => (deal.discount || 0) >= 30);
      results.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    } else if (filterBy === 'most-commented') {
      results.sort((a, b) => (b.comments || 0) - (a.comments || 0));
    } else {
      results.sort((a, b) => a.price - b.price);
    }

    const total = results.length;
    const pageCount = Math.ceil(total / limit);
    
    // Pagination slicing logic
    const start = (page - 1) * limit;
    const end = page * limit;
    results = results.slice(start, end);

    return response.status(200).json({
      'success': true,
      'data': {
        'result': results,
        'results': results,
        'meta': {
          limit,
          total,
          'count': total,
          'currentPage': page,
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

      if (results.length === 0) {
        console.log(`🔍 Scraping Vinted for ${legoSetId}...`);
        const scraped = await scrapeVinted(`Lego ${legoSetId}`);
        if (scraped && scraped.length > 0) {
          const filteredScraped = filterById(scraped);
          results = filteredScraped;
          scraped.forEach(s => {
            if (!SALES.some(existing => existing.uuid === s.uuid)) {
              SALES.push(s);
            }
          });
        }
      }
    }

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

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`📡 Server running locally at http://localhost:${PORT}`);
  });
}

// Export for Vercel
export default app;

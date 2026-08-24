const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'deals.json');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Environmental Configuration
const AMAZON_TAG = process.env.AMAZON_TAG || 'dealhive-20';
const CUELINKS_PUB_ID = process.env.CUELINKS_PUB_ID || '12345';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// Multi-Platform Fashion, Footwear, Tech & Accessories Stores
const STORES = [
  { name: 'Snitch', domain: 'www.snitch.co.in', defaultCat: 'Clothing & Fashion' },
  { name: 'Campus Shoes', domain: 'www.campusshoes.com', defaultCat: 'Footwear' },
  { name: 'boAt', domain: 'www.boat-lifestyle.com', defaultCat: 'Electronics' },
  { name: 'Souled Store', domain: 'www.thesouledstore.com', defaultCat: 'Clothing & Fashion' },
  { name: 'Noise', domain: 'www.gonoise.com', defaultCat: 'Electronics' }
];

// Amazon Automated Search Targets Across ALL Categories
const AMAZON_CATEGORIES = [
  { term: 'men t-shirts discount sale', category: 'Clothing & Fashion' },
  { term: 'running shoes offer', category: 'Footwear' },
  { term: 'wireless earbuds deal', category: 'Electronics' },
  { term: 'leather wallet men discount', category: 'Accessories' },
  { term: 'sunglasses offer deal', category: 'Accessories' },
  { term: 'laptop backpack sale', category: 'Accessories' },
  { term: 'home kitchen appliances deal', category: 'Home & Kitchen' }
];

// --- DATABASE HELPERS ---
function loadDealsFromDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return [];
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) || [];
  } catch (err) {
    return [];
  }
}

function saveDealsToDB(dealsList) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dealsList, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save DB:', err);
  }
}

let deals = loadDealsFromDB();

// Complete Multi-Category Auto-Detector
function autoDetectCategory(title = '', storeDefault = 'General') {
  const t = title.toLowerCase();

  // 1. Accessories (Bags, Wallets, Watches, Sunglasses, Belts, Caps, Jewelry)
  if (
    t.includes('wallet') || t.includes('bag') || t.includes('backpack') || 
    t.includes('sunglass') || t.includes('goggle') || t.includes('belt') || 
    t.includes('watch') || t.includes('ring') || t.includes('jewel') || 
    t.includes('cap') || t.includes('hat') || t.includes('clutch') || t.includes('purse')
  ) {
    return 'Accessories';
  }

  // 2. Footwear
  if (t.includes('shoe') || t.includes('sneaker') || t.includes('footwear') || t.includes('sandal') || t.includes('boot') || t.includes('slipper') || t.includes('flip flop')) {
    return 'Footwear';
  }

  // 3. Clothing & Fashion
  if (t.includes('shirt') || t.includes('jean') || t.includes('pant') || t.includes('jacket') || t.includes('dress') || t.includes('hoodie') || t.includes('tshirt') || t.includes('t-shirt') || t.includes('apparel') || t.includes('cloth') || t.includes('trouser')) {
    return 'Clothing & Fashion';
  }

  // 4. Electronics
  if (t.includes('phone') || t.includes('earbud') || t.includes('headphone') || t.includes('laptop') || t.includes('speaker') || t.includes('audio') || t.includes('trimmer') || t.includes('charger') || t.includes('powerbank')) {
    return 'Electronics';
  }

  // 5. Home & Kitchen
  if (t.includes('bottle') || t.includes('kitchen') || t.includes('cooker') || t.includes('home') || t.includes('kettle') || t.includes('fryer')) {
    return 'Home & Kitchen';
  }

  return storeDefault;
}

function generateAffiliateUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const urlObj = new URL(rawUrl);
    if (urlObj.hostname.includes('amazon')) {
      urlObj.searchParams.set('tag', AMAZON_TAG);
      return urlObj.toString();
    }
    return `https://links2rev.com/open?pub_id=${CUELINKS_PUB_ID}&url=${encodeURIComponent(rawUrl)}`;
  } catch (err) {
    return rawUrl;
  }
}

// --- TELEGRAM BOT PUSH ALERTS ---
async function sendTelegramAlert(deal) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const message = 
    `📢 *NEW REAL DEAL DETECTED!*\n\n` +
    `📌 *${deal.title}*\n` +
    `🏪 *Platform:* ${deal.store}\n` +
    `🏷️ *Category:* ${deal.category}\n` +
    `💰 *Offer Price:* ₹${deal.offerPrice} ~(₹${deal.originalPrice})~\n` +
    `💥 *Discount:* ${deal.discountPercentage}% OFF\n\n` +
    `🛒 *Buy Link:* ${deal.affiliateUrl}`;

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });
  } catch (err) {
    console.error('[Telegram Alert Failed]');
  }
}

// --- AMAZON REAL-TIME CATEGORY SCRAPER ---
async function syncAmazonCategory(searchTerm, category) {
  let added = 0;
  try {
    const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(searchTerm)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 8000
    });

    const $ = cheerio.load(response.data);

    $('[data-component-type="s-search-result"]').each((i, el) => {
      if (i >= 5) return; // Limit to top 5 items per search term
      const title = $(el).find('h2 a span').text().trim();
      const relativeLink = $(el).find('h2 a').attr('href');
      const imageUrl = $(el).find('img.s-image').attr('src');
      const offerPriceRaw = $(el).find('.a-price-whole').first().text().replace(/[^0-9]/g, '');

      if (title && relativeLink && offerPriceRaw) {
        const fullUrl = 'https://www.amazon.in' + relativeLink.split('?')[0];
        const offerPrice = parseInt(offerPriceRaw, 10);
        const originalPrice = Math.round(offerPrice * 1.35); // Estimated MRP
        const exists = deals.some(d => d.originalUrl === fullUrl);

        if (!exists && offerPrice > 0) {
          const newDeal = {
            id: 'amz_' + Date.now().toString() + Math.random().toString(36).substring(2, 4),
            title: title.slice(0, 80),
            store: 'Amazon',
            category: autoDetectCategory(title, category),
            originalUrl: fullUrl,
            affiliateUrl: generateAffiliateUrl(fullUrl),
            imageUrl: imageUrl || 'https://via.placeholder.com/300',
            originalPrice: originalPrice,
            offerPrice: offerPrice,
            discountPercentage: Math.round(((originalPrice - offerPrice) / originalPrice) * 100),
            isExpired: false,
            clickCount: 0,
            createdAt: new Date().toISOString()
          };

          deals.unshift(newDeal);
          added++;
          sendTelegramAlert(newDeal);
        }
      }
    });
  } catch (err) {
    console.log(`⚠️ Amazon category sync skipped for: ${searchTerm}`);
  }
  return added;
}

// --- D2C STORE SYNC ENGINE (SHOPIFY / PRODUCTS.JSON) ---
async function syncD2CStore(store) {
  let addedCount = 0;
  try {
    const endpoint = `https://${store.domain}/products.json?limit=40`;
    const response = await axios.get(endpoint, { timeout: 8000 });
    const products = response.data?.products || [];

    for (const prod of products) {
      const variant = prod.variants && prod.variants[0];
      if (!variant) continue;

      const offerPrice = parseFloat(variant.price);
      const originalPrice = parseFloat(variant.compare_at_price);

      // Save if item is in stock and currently discounted
      if (variant.available && originalPrice > offerPrice) {
        const productUrl = `https://${store.domain}/products/${prod.handle}`;
        const exists = deals.some(d => d.originalUrl === productUrl);

        if (!exists) {
          const discountPercentage = Math.round(((originalPrice - offerPrice) / originalPrice) * 100);
          const newDeal = {
            id: 'd2c_' + prod.id,
            title: prod.title.slice(0, 80),
            store: store.name,
            category: autoDetectCategory(prod.title, store.defaultCat),
            originalUrl: productUrl,
            affiliateUrl: generateAffiliateUrl(productUrl),
            imageUrl: prod.images && prod.images[0] ? prod.images[0].src : 'https://via.placeholder.com/300',
            originalPrice: Math.round(originalPrice),
            offerPrice: Math.round(offerPrice),
            discountPercentage: discountPercentage,
            isExpired: false,
            clickCount: 0,
            createdAt: new Date().toISOString()
          };

          deals.unshift(newDeal);
          addedCount++;
          sendTelegramAlert(newDeal);
        }
      }
    }
  } catch (err) {
    console.log(`⚠️ Could not sync products from store: ${store.name}`);
  }
  return addedCount;
}

// --- CONTINUOUS BACKGROUND INVENTORY WORKER ---
let isSyncing = false;

async function runFullMultiStoreSync() {
  if (isSyncing) return { count: 0, message: 'Sync worker actively running...' };
  isSyncing = true;
  console.log('🔄 [Multi-Category Sync Worker] Crawling Amazon & D2C Stores...');

  let newDeals = 0;
  let removedCount = 0;

  // 1. Crawl Amazon India Categories (Clothing, Footwear, Electronics, Accessories, Home)
  for (const item of AMAZON_CATEGORIES) {
    const count = await syncAmazonCategory(item.term, item.category);
    newDeals += count;
  }

  // 2. Crawl D2C Stores
  for (const store of STORES) {
    const count = await syncD2CStore(store);
    newDeals += count;
  }

  // 3. Auto-Remove Expired or Out-of-Stock Items
  for (let deal of deals) {
    if (deal.isExpired) continue;

    if (deal.id.startsWith('d2c_')) {
      try {
        const storeDomain = new URL(deal.originalUrl).hostname;
        const prodHandle = deal.originalUrl.split('/products/')[1];
        const checkRes = await axios.get(`https://${storeDomain}/products/${prodHandle}.json`, { timeout: 4000 });
        const variant = checkRes.data?.product?.variants[0];

        // REMOVAL TRIGGER: Item sold out or returned to full price
        if (!variant || !variant.available || parseFloat(variant.price) >= parseFloat(variant.compare_at_price || variant.price)) {
          deal.isExpired = true;
          removedCount++;
        }
      } catch (err) {
        if (err.response && err.response.status === 404) {
          deal.isExpired = true;
          removedCount++;
        }
      }
    }
  }

  saveDealsToDB(deals);
  isSyncing = false;
  const message = `Sync complete. Synced ${newDeals} new deals. Auto-removed ${removedCount} expired items.`;
  console.log(`✅ [Sync Worker] ${message}`);
  return { count: newDeals, removed: removedCount, message };
}

// Schedule sync every 15 minutes
setInterval(runFullMultiStoreSync, 15 * 60 * 1000);
setTimeout(runFullMultiStoreSync, 2000);

// --- API ENDPOINTS ---
app.get('/api/deals', (req, res) => res.json(deals));

app.get('/api/analytics', (req, res) => {
  res.json({
    totalDeals: deals.length,
    activeDeals: deals.filter(d => !d.isExpired).length,
    totalClicks: deals.reduce((sum, d) => sum + (d.clickCount || 0), 0)
  });
});

app.post('/api/sync-now', async (req, res) => {
  const result = await runFullMultiStoreSync();
  res.json({ success: true, ...result });
});

app.post('/api/deals/:id/click', (req, res) => {
  const deal = deals.find(d => d.id === req.params.id);
  if (deal) {
    deal.clickCount = (deal.clickCount || 0) + 1;
    saveDealsToDB(deals);
  }
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Multi-Category Real Deal Engine live on port ${PORT}`));
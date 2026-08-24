# 🛍️ DealHive - All-in-One Multi-Category Deal Engine

DealHive is a real-time deal aggregator that scrapes and displays discounts from multiple platforms including Amazon, boAt, Snitch, Campus Shoes, Souled Store, and Noise.

## Features

✅ **Multi-Platform Scraping**
- Amazon India automated search
- D2C Shopify stores (boAt, Snitch, Campus Shoes, Souled Store, Noise)
- Real-time price monitoring

✅ **Smart Categorization**
- Automatic category detection (Clothing, Footwear, Electronics, Accessories, Home & Kitchen)
- Multi-category filtering interface

✅ **Deal Management**
- Automatic expiration detection for sold-out items
- Click tracking and analytics
- Persistent JSON database

✅ **Monetization**
- Amazon affiliate links integration
- CueLinks affiliate network support

✅ **Notifications**
- Telegram bot alerts for new deals (optional)
- Email support ready

✅ **Analytics Dashboard**
- Real-time statistics
- Deal performance metrics
- Click tracking

## Installation

### Prerequisites
- Node.js 14+
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/satputesatishs-sys/dealhive-website.git
   cd dealhive-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file** (optional)
   ```bash
   touch .env
   ```

4. **Configure environment variables** (`.env` file)
   ```
   PORT=3000
   AMAZON_TAG=dealhive-20
   CUELINKS_PUB_ID=12345
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_CHAT_ID=your_chat_id
   ```

5. **Start the server**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

## API Endpoints

### GET `/api/deals`
Retrieve all deals
```json
[
  {
    "id": "amz_1234567890",
    "title": "Product Name",
    "store": "Amazon",
    "category": "Electronics",
    "originalPrice": 5000,
    "offerPrice": 3500,
    "discountPercentage": 30,
    "imageUrl": "https://...",
    "affiliateUrl": "https://...",
    "isExpired": false,
    "clickCount": 5,
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### GET `/api/analytics`
Get statistics
```json
{
  "totalDeals": 150,
  "activeDeals": 120,
  "totalClicks": 4530
}
```

### POST `/api/sync-now`
Trigger immediate sync across all platforms
```json
{
  "success": true,
  "count": 15,
  "removed": 3,
  "message": "Sync complete. Synced 15 new deals. Auto-removed 3 expired items."
}
```

### POST `/api/deals/:id/click`
Track a deal click
```json
{
  "success": true
}
```

## Architecture

### Backend
- **Express.js** - Server framework
- **Axios** - HTTP client for scraping
- **Cheerio** - HTML parsing
- **CORS** - Cross-origin requests
- **File System** - JSON-based database

### Frontend
- **Vanilla JavaScript** - No dependencies
- **Responsive CSS Grid** - Mobile-friendly design
- **Fetch API** - Real-time data updates

### Database
- JSON file-based persistence
- Auto-saved after every sync and interaction

## Auto-Sync Schedule

- **Interval**: Every 15 minutes
- **Initial Sync**: 2 seconds after server start
- **Manual Sync**: Available via API and UI button

## Supported Stores

1. **Amazon.in** - Automated multi-category search
2. **Snitch** - Fashion & Clothing (Shopify)
3. **Campus Shoes** - Footwear (Shopify)
4. **boAt** - Electronics & Lifestyle (Shopify)
5. **Souled Store** - Fashion & Merchandise (Shopify)
6. **Noise** - Electronics & Wearables (Shopify)

## Categories

- 👔 Clothing & Fashion
- 👟 Footwear
- 🎧 Electronics
- 🕶️ Accessories
- 🏠 Home & Kitchen

## Telegram Integration

Set up Telegram bot alerts:

1. Create a bot with [@BotFather](https://t.me/botfather)
2. Get your chat ID from [@userinfobot](https://t.me/userinfobot)
3. Add to `.env`:
   ```
   TELEGRAM_BOT_TOKEN=your_token
   TELEGRAM_CHAT_ID=your_chat_id
   ```
4. Receive instant alerts for new deals

## Monetization

### Amazon Associates
- Add your Amazon affiliate tag: `AMAZON_TAG` env variable
- Earn commission on clicks and purchases

### CueLinks
- Add your CueLinks publisher ID: `CUELINKS_PUB_ID` env variable
- Earn from non-Amazon store clicks

## Performance

- **Response time**: < 200ms for API requests
- **Page load**: < 1s with cached data
- **Sync time**: 30-60 seconds for full multi-store sync
- **Database**: Auto-compacts expired deals

## Development

### Run with nodemon
```bash
npm run dev
```

### Debug mode
```bash
DEBUG=* npm start
```

## Deployment

### Heroku
```bash
heroku create dealhive
git push heroku main
heroku config:set AMAZON_TAG=your_tag
```

### Docker
```bash
docker build -t dealhive .
docker run -p 3000:3000 dealhive
```

### AWS/DigitalOcean
- Use Node.js runtime
- Configure environment variables
- Mount persistent storage for deals.json

## Legal

- Respect robots.txt on all domains
- Follow each store's terms of service
- Affiliate links must be disclosed
- Data is used for aggregation purposes only

## License

ISC

## Contributing

Pull requests welcome! Please follow existing code style.

## Support

For issues or questions, open a GitHub issue.

---

**Built with ❤️ for deal hunters everywhere**

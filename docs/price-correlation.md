# Tweet-Price Correlation

Analyze how crypto founder tweets correlate with token price movements. Interactive candlestick charts with tweet markers, impact statistics, and CSV export.

Data from [tweet-price-charts](https://github.com/rohunvora/tweet-price-charts) by rohunvora.

---

## Dashboard

Open `dashboard/price-correlation.html` in your browser or visit [xactions.app/price-correlation](https://xactions.app/price-correlation).

### Features

- **Asset selector** — switch between 15 tracked tokens ($PUMP, $HYPE, $ASTER, $LAUNCHCOIN, $JUP, $MON, $USELESS, $ZORA, $META, $WIF, $XPL, $FARTCOIN, $WLD, $ZEC, $GORK)
- **TradingView candlestick chart** — real OHLCV price data with 15m/1h/1D timeframes
- **Tweet markers** — hover for tweet text, engagement stats, 1h/24h price impact
- **Data table** — sortable, searchable, CSV export of all tweet events
- **About view** — tweet-day vs no-tweet-day comparison, impact scatter plot, summary stats

### Tracked Assets

| Token | Founder | Network | Tweets |
|-------|---------|---------|--------|
| $PUMP | @a1lon9 | Solana | 109 |
| $HYPE | @chameleon_jeff | Hyperliquid | — |
| $ASTER | @cz_binance | BSC | — |
| $LAUNCHCOIN | @pasternak | Solana | — |
| $JUP | @weremeow | Solana | — |
| $MON | @keoneHD | Monad | — |
| $USELESS | @theunipcs | Solana | — |
| $ZORA | @js_horne | Base | — |
| $META | @metaproph3t | Solana | — |
| $WIF | @blknoiz06 | Solana | — |
| $XPL | @pauliepunt | BSC | — |
| $FARTCOIN | @DipWheeler | Solana | — |
| $WLD | @sama | Ethereum | — |
| $ZEC | @mert | Zcash | — |
| $GORK | @elonmusk | Solana | — |

### Deep Linking

Link directly to an asset with a URL hash:

```
price-correlation.html#pump
price-correlation.html#hype
price-correlation.html#gork
```

---

## Data Format

All data lives in `dashboard/data/tweet-price/`. Structure:

```
dashboard/data/tweet-price/
├── assets.json              # Master asset list
├── pump/
│   ├── tweet_events.json    # Tweet events with price impact
│   ├── prices_1d.json       # Daily OHLCV candles
│   ├── prices_1h.json       # Hourly OHLCV candles
│   ├── prices_15m.json      # 15-minute candles (some assets)
│   └── stats.json           # Pre-computed statistics
├── hype/
│   └── ...
└── (13 more assets)
```

### Tweet Event Schema

```json
{
  "tweet_id": "1944804295611650538",
  "asset_id": "pump",
  "asset_name": "PUMP",
  "founder": "a1lon9",
  "timestamp": 1752512451,
  "timestamp_iso": "2025-07-14T13:00:51Z",
  "text": "the ticker is $PUMP",
  "likes": 4052,
  "retweets": 335,
  "replies": 1668,
  "impressions": 557030,
  "price_at_tweet": 0.00580901,
  "price_1h": 0.00580901,
  "price_24h": 0.00565352,
  "change_1h_pct": 0.0,
  "change_24h_pct": -2.68,
  "market_cap_at_tweet": 5808947550.65
}
```

### Candle Schema

```json
{
  "t": 1752523200,
  "o": 0.00556425,
  "h": 0.00597475,
  "l": 0.00537395,
  "c": 0.00552439,
  "v": 1344653.89
}
```

Fields: `t` (unix timestamp), `o` (open), `h` (high), `l` (low), `c` (close), `v` (volume).

### Stats Schema

```json
{
  "summary": {
    "total_tweets": 109,
    "tweets_with_price": 109,
    "date_range": { "start": "2025-07-14", "end": "2026-01-15" },
    "total_days_analyzed": 186
  },
  "daily_comparison": {
    "tweet_day_count": 72,
    "tweet_day_avg_return": 1.52,
    "tweet_day_win_rate": 54.2,
    "no_tweet_day_count": 113,
    "no_tweet_day_avg_return": -1.06,
    "no_tweet_day_win_rate": 39.8
  }
}
```

---

## Browser Script

Run `scripts/tweetPriceCorrelation.js` in your browser DevTools console on any X/Twitter profile page. It:

1. Scrapes tweets from the current timeline
2. Fetches prices from CoinGecko or GeckoTerminal
3. Aligns each tweet to the nearest price candle
4. Computes 1h and 24h price impact
5. Exports JSON + CSV results

```js
// Configure before running:
const CONFIG = {
  TOKEN_ID: 'solana',           // CoinGecko token ID
  NETWORK: '',                  // GeckoTerminal network (alternative)
  POOL_ADDRESS: '',             // GeckoTerminal pool (alternative)
  WINDOWS: [1, 24],             // Impact windows in hours
  MAX_TWEETS: 200,
};
```

---

## Node.js Module

```js
import { analyzeTweetPriceCorrelation } from 'xactions/analytics';

const result = await analyzeTweetPriceCorrelation({
  tweets: [{ timestamp: 1700000000000, text: 'GM' }],
  tokenId: 'solana',
  windows: [1, 24],
});

console.log(result.aligned);  // Tweets with price data attached
console.log(result.stats);    // Correlation statistics
```

### Functions

| Function | Description |
|----------|-------------|
| `fetchCoinGeckoPrices(tokenId, from, to)` | Fetch hourly prices from CoinGecko |
| `fetchGeckoTerminalPrices(network, pool, from, to)` | Fetch OHLCV from GeckoTerminal |
| `alignTweetsWithPrices(tweets, prices, windows)` | Align tweets to nearest price point |
| `computeCorrelationStats(aligned)` | Compute aggregate statistics |
| `analyzeTweetPriceCorrelation(options)` | Full pipeline: fetch + align + stats |

---

## API Endpoint

```
POST /api/analytics/price-correlation
```

**Request body:**

```json
{
  "tweets": [
    { "timestamp": 1700000000000, "text": "GM" }
  ],
  "tokenId": "solana",
  "windows": [1, 24]
}
```

Or for DEX tokens:

```json
{
  "tweets": [...],
  "network": "solana",
  "poolAddress": "0x...",
  "windows": [1, 24]
}
```

**Response:**

```json
{
  "aligned": [...],
  "stats": { "totalTweets": 109, "avgChange24h": 1.52, "winRate": 54.2 },
  "meta": { "token": "solana", "priceSource": "coingecko", "pricePoints": 4444 }
}
```

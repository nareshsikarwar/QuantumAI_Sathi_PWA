const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3001;

require('dotenv').config();
const { placeMarketOrder, getMarketsDetails } = require('./coindcxClient');

const ENABLE_REAL_TRADE = process.env.ENABLE_REAL_TRADE === 'true';
const COINDCX_API_KEY = process.env.COINDCX_API_KEY || '';
const COINDCX_API_SECRET = process.env.COINDCX_API_SECRET || '';

app.use(express.static(__dirname));
app.use(express.json());

app.get('/usdt-inr', async (req, res) => {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=USDTINR');
    const price = parseFloat(response.data.price);
    if (price > 0) {
      res.json({ price });
    } else {
      res.status(500).json({ error: "Invalid price" });
    }
  } catch (err) {
    console.error("USDTINR fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch USDT-INR price" });
  }
});

app.get('/api/trading-status', (req, res) => {
  res.json({
    enabled: ENABLE_REAL_TRADE && !!COINDCX_API_KEY && !!COINDCX_API_SECRET,
  });
});

async function fetchBinancePrice(symbolUpper) {
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbolUpper}`;
  const response = await axios.get(url, { timeout: 10000 });
  return parseFloat(response.data.price);
}

app.post('/api/trade', async (req, res) => {
  try {
    if (!(ENABLE_REAL_TRADE && COINDCX_API_KEY && COINDCX_API_SECRET)) {
      return res.status(403).json({ error: 'Real trading is disabled. Set ENABLE_REAL_TRADE=true and API keys.' });
    }

    const { coin, side, amountInInr } = req.body || {};
    if (!coin || !side || !amountInInr) {
      return res.status(400).json({ error: 'Missing coin, side, or amountInInr' });
    }

    const market = String(coin).toUpperCase().replace('/', '').replace('-', ''); // e.g., BTCUSDT

    const [usdtInr, coinUsdt] = await Promise.all([
      fetchBinancePrice('USDTINR'),
      fetchBinancePrice(market)
    ]);

    if (!usdtInr || !coinUsdt || !(usdtInr > 0) || !(coinUsdt > 0)) {
      return res.status(502).json({ error: 'Failed to fetch prices for conversion' });
    }

    const usdtAmount = Number(amountInInr) / usdtInr;
    let quantity = usdtAmount / coinUsdt;

    // Basic precision trim to 6 decimals to avoid exchange rejections
    quantity = Math.max(0, Math.floor(quantity * 1e6) / 1e6);

    if (!(quantity > 0)) {
      return res.status(400).json({ error: 'Computed quantity is too small. Increase amount.' });
    }

    const orderResponse = await placeMarketOrder({
      apiKey: COINDCX_API_KEY,
      apiSecret: COINDCX_API_SECRET,
      market,
      side,
      quantity
    });

    return res.json({
      ok: true,
      market,
      side,
      quantity,
      order: orderResponse
    });
  } catch (err) {
    console.error('Trade error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Order failed', details: err.response?.data || err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Quantum AI Supreme server running at http://localhost:${PORT}`);
});

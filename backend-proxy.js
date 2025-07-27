const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3001;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/api/usdtinr', async (req, res) => {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr");
    if (!response.ok) return res.status(500).json({ error: "CoinGecko unavailable" });
    const data = await response.json();
    if (data && data.tether && data.tether.inr) res.json({ price: data.tether.inr });
    else res.status(500).json({ error: "Price data unavailable" });
  } catch (error) { res.status(500).json({ error: "Error fetching USDTINR" }); }
});
app.listen(PORT, () => console.log(`Backend proxy server running on port ${PORT}`));

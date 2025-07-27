const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3001;

app.use(express.static(__dirname));

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

app.listen(PORT, () => {
  console.log(`✅ Quantum AI Supreme server running at http://localhost:${PORT}`);
});

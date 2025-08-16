# Quantum AI Supreme v2.5

Demo trading UI with optional real trading via CoinDCX (OFF by default).

## Setup
1. Copy `.env.example` to `.env` and keep `ENABLE_REAL_TRADE=false` initially.
2. Install deps:
   - `npm i`
3. Run:
   - `npm start`
4. Open `http://localhost:3001`.

## Enable Real Trading (at your own risk)
- Set environment variables in `.env`:
```
ENABLE_REAL_TRADE=true
COINDCX_API_KEY=your_key
COINDCX_API_SECRET=your_secret
```
- Restart the server. The backend exposes `POST /api/trade` which places market orders using CoinDCX.

Notes:
- Quantities are derived from INR amount using Binance prices (USDTINR and the selected market) and trimmed to 6 decimals.
- Keep your API keys secure; never commit `.env`.
- Start with tiny amounts, verify order fills on the exchange, and consider rate limits and min order sizes.
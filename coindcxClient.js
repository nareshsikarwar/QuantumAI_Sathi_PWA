const axios = require('axios');
const crypto = require('crypto');

const COINDCX_BASE_URL = process.env.COINDCX_BASE_URL || 'https://api.coindcx.com';

function generateSignature(secretKey, bodyObject) {
  const payload = JSON.stringify(bodyObject);
  return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
}

async function placeMarketOrder({ apiKey, apiSecret, market, side, quantity }) {
  const endpointPath = '/exchange/v1/orders/create';
  const url = `${COINDCX_BASE_URL}${endpointPath}`;

  const orderBody = {
    market: String(market).toUpperCase(),
    side: String(side).toUpperCase(), // BUY or SELL
    order_type: 'market',
    total_quantity: String(quantity)
  };

  const signature = generateSignature(apiSecret, orderBody);

  const headers = {
    'Content-Type': 'application/json',
    'X-AUTH-APIKEY': apiKey,
    'X-AUTH-SIGNATURE': signature
  };

  const response = await axios.post(url, orderBody, { headers, timeout: 15000 });
  return response.data;
}

async function getBalances({ apiKey, apiSecret }) {
  const endpointPath = '/exchange/v1/users/balances';
  const url = `${COINDCX_BASE_URL}${endpointPath}`;

  const body = {};
  const signature = generateSignature(apiSecret, body);
  const headers = {
    'Content-Type': 'application/json',
    'X-AUTH-APIKEY': apiKey,
    'X-AUTH-SIGNATURE': signature
  };

  const response = await axios.post(url, body, { headers, timeout: 15000 });
  return response.data;
}

async function getMarketsDetails() {
  const endpointPath = '/exchange/v1/markets_details';
  const url = `${COINDCX_BASE_URL}${endpointPath}`;
  const response = await axios.get(url, { timeout: 15000 });
  return response.data;
}

module.exports = {
  placeMarketOrder,
  getBalances,
  getMarketsDetails
};
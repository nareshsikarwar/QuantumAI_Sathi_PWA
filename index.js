// ====== Global Variables ======
let balance = 1000, success = 0, fail = 0, trades = 0, aiRunning = false, tradeMode = "demo", lastTradeSide = null;
let prices = [], coin = 'btcusdt', tf = '1m';

// ====== DOM Elements ======
const livePrice = document.getElementById("livePrice");
const lastTrade = document.getElementById("lastTrade");
const tradeAmountInput = document.getElementById("tradeAmount");
const tradeModeLabel = document.getElementById("tradeModeLabel");
const aiStatusLight = document.getElementById("aiStatusLight");
const aiBtnLabel = document.getElementById("aiBtnLabel");
const indicatorsBox = document.getElementById("indicatorsBox");
const tradeHistory = document.getElementById("tradeHistory");
const coinSelect = document.getElementById("coinSelect");
const tfSelect = document.getElementById("tfSelect");

// ====== Chart Setup ======
const ctx = document.getElementById("chart").getContext("2d");
const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [{
      label: "Balance",
      data: [],
      borderColor: "lime",
      backgroundColor: "black",
      tension: 0.1
    }]
  },
  options: {
    scales: {
      x: { display: true },
      y: { beginAtZero: false }
    }
  }
});

// ====== Helper Functions ======
function updateUI() {
  const acc = trades ? ((success / trades) * 100).toFixed(2) : 0;
  document.getElementById("balance").textContent = balance.toFixed(2);
  document.getElementById("success").textContent = success;
  document.getElementById("fail").textContent = fail;
  document.getElementById("trades").textContent = trades;
  document.getElementById("accuracy").textContent = acc;
}
function pushChartData() {
  chart.data.labels.push(new Date().toLocaleTimeString());
  chart.data.datasets[0].data.push(balance);
  if (chart.data.labels.length > 100) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.update();
}
function addTradeHistory(type, profit, amount) {
  const entry = document.createElement('li');
  entry.className = profit ? 'history-profit' : 'history-loss';
  entry.innerHTML = `${type.toUpperCase()} | ${profit ? 'PROFIT' : 'LOSS'} | ₹${amount.toFixed(2)} | ${new Date().toLocaleTimeString()}`;
  tradeHistory.prepend(entry);
  if (tradeHistory.children.length > 30) tradeHistory.removeChild(tradeHistory.lastChild);
}
function toggleTradeMode() {
  tradeMode = tradeMode === "demo" ? "real" : "demo";
  tradeModeLabel.textContent = tradeMode.charAt(0).toUpperCase() + tradeMode.slice(1);
}
function resetBalance() {
  balance = 1000; success = 0; fail = 0; trades = 0; lastTradeSide = null;
  chart.data.labels = []; chart.data.datasets[0].data = []; chart.update();
  updateUI(); lastTrade.textContent = "Balance Reset Done.";
}
function placeRealTrade(side, amountInInr) {
  return fetch('/api/trade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coin: coin.toUpperCase(), side: side.toUpperCase(), amountInInr })
  }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error || 'Trade failed');
    return data;
  });
}

function maybeExecuteRealTrade(side) {
  if (tradeMode !== 'real') return Promise.resolve(null);
  const amount = parseFloat(tradeAmountInput.value) || 100;
  return placeRealTrade(side, amount).catch((err) => {
    console.warn('Real trade error:', err.message);
    return null;
  });
}

function manualTrade(type) {
  const amount = parseFloat(tradeAmountInput.value);
  if (isNaN(amount) || amount <= 0) return alert("Enter valid trade amount.");
  if (tradeMode === 'real') {
    maybeExecuteRealTrade(type);
  }
  trades++;
  const priceChangePercent = (Math.random() * 4) - 2;
  const amountChange = amount * priceChangePercent / 100;
  const profit = priceChangePercent > 0;
  balance += amountChange;
  profit ? success++ : fail++;
  lastTrade.textContent = `Manual ${type.toUpperCase()} | ${profit ? 'PROFIT' : 'LOSS'} | ₹${amountChange.toFixed(2)}`;
  addTradeHistory(type, profit, amountChange);
  updateUI(); pushChartData();
}
function toggleAI() {
  aiRunning = !aiRunning;
  if (aiRunning) {
    aiStatusLight.classList.replace("off", "on");
    aiBtnLabel.textContent = "AI On";
    startLiveFeed();
  } else {
    aiStatusLight.classList.replace("on", "off");
    aiBtnLabel.textContent = "AI Off";
    if (ws) ws.close();
  }
}

// ====== Indicator Functions ======
function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  let emaArray = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    emaArray[i] = prices[i] * k + emaArray[i - 1] * (1 - k);
  }
  return emaArray;
}
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    diff > 0 ? gains += diff : losses += Math.abs(diff);
  }
  return losses === 0 ? 100 : 100 - (100 / (1 + (gains / losses)));
}
function calculateBB(prices, period = 20, mult = 2) {
  if (prices.length < period) return {};
  const sma = prices.slice(-period).reduce((s, x) => s + x, 0) / period;
  const variance = prices.slice(-period).reduce((s, x) => s + Math.pow(x - sma, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { upper: sma + mult * std, lower: sma - mult * std };
}
function calculateMACD(prices) {
  if (prices.length < 26) return null;
  const ema12 = calculateEMA(prices.slice(-26), 12);
  const ema26 = calculateEMA(prices.slice(-26), 26);
  return ema12.at(-1) - ema26.at(-1);
}
function calculateADX() {
  return 30; // Stub
}

// ====== WebSocket Binance Feed ======
let ws = null;
function startLiveFeed() {
  coin = coinSelect.value;
  tf = tfSelect.value;
  prices = [];
  if (ws) ws.close();
  ws = new WebSocket(`wss://stream.binance.com:9443/ws/${coin}@trade`);
  ws.onmessage = (e) => {
    const trade = JSON.parse(e.data);
    const price = parseFloat(trade.p);
    if (!price || price <= 0) return;
    livePrice.textContent = price.toFixed(2);
    prices.push(price);
    if (prices.length > 100) prices.shift();
    const ema5 = calculateEMA(prices, 5).slice(-1)[0];
    const ema20 = calculateEMA(prices, 20).slice(-1)[0];
    const rsi = calculateRSI(prices, 14);
    const macd = calculateMACD(prices);
    const bb = calculateBB(prices, 20, 2);
    const adx = calculateADX();
    let signal = '🟡 HOLD';
    let shouldBuy = false, shouldSell = false;

    if (ema5 > ema20 && rsi > 30 && macd > 0 && price < bb.lower && adx > 25) {
      signal = '🟢 BUY';
      shouldBuy = true;
    }
    if (ema5 < ema20 && rsi < 70 && macd < 0 && price > bb.upper && adx > 25) {
      signal = '🔴 SELL';
      shouldSell = true;
    }

    indicatorsBox.innerHTML = `
      <b>EMA:</b> ${ema5?.toFixed(2)} / ${ema20?.toFixed(2)} |
      <b>RSI:</b> ${rsi?.toFixed(2)} |
      <b>MACD:</b> ${macd?.toFixed(4)} |
      <b>BB:</b> ${bb.lower?.toFixed(2)} – ${bb.upper?.toFixed(2)} |
      <b>ADX:</b> ${adx} |
      <span>${signal}</span>
    `;

    if (aiRunning) {
      if (shouldBuy && lastTradeSide !== "buy") {
        triggerAITrade("buy"); lastTradeSide = "buy";
      }
      if (shouldSell && lastTradeSide !== "sell") {
        triggerAITrade("sell"); lastTradeSide = "sell";
      }
    }
  };
}

function triggerAITrade(side) {
  const amount = parseFloat(tradeAmountInput.value) || 100;
  const sl = parseFloat(document.getElementById("slPercent").value) || 2;
  const tp = parseFloat(document.getElementById("tpPercent").value) || 4;
  if (tradeMode === 'real') {
    maybeExecuteRealTrade(side);
  }
  trades++;
  const profit = Math.random() < 0.9;
  const change = profit ? amount * tp / 100 : -amount * sl / 100;
  balance += change;
  profit ? success++ : fail++;
  lastTrade.textContent = `🤖 AI ${side.toUpperCase()} | ${profit ? 'PROFIT' : 'LOSS'} | ₹${change.toFixed(2)}`;
  addTradeHistory('AI ' + side, profit, change);
  updateUI(); pushChartData();
}

// ====== Init ======
coinSelect.addEventListener("change", () => { if (aiRunning) startLiveFeed(); });
tfSelect.addEventListener("change", () => { if (aiRunning) startLiveFeed(); });
updateUI();

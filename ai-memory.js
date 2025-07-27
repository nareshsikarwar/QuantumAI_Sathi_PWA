function predictTrade(rsi, macd) {
  if (rsi >= 60 && macd > 0) return "BUY";
  if (rsi <= 40 && macd < 0) return "SELL";
  return "HOLD";
}

module.exports = { predictTrade };

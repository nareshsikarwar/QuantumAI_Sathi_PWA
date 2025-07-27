function detectPattern(open, close, low, high) {
  const body = Math.abs(close - open);
  const range = high - low;
  const bodyRatio = body / range;

  if (bodyRatio < 0.2) return "Doji";
  if (close > open && (low + body) < high * 0.8) return "Hammer";
  return "None";
}

module.exports = { detectPattern };

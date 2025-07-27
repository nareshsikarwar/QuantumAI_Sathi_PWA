const fs = require("fs");
const path = require("path");

const commandPath = path.join(__dirname, "updates", "commands.json");
const indexPath = path.join(__dirname, "index.js");

function applyUpdate(commandObj) {
  if (!commandObj.update || !commandObj.target) {
    console.log("❌ Invalid command object.");
    return;
  }

  const targetFile = path.join(__dirname, commandObj.target);
  if (!fs.existsSync(targetFile)) {
    console.log("❌ Target file not found.");
    return;
  }

  let content = fs.readFileSync(targetFile, "utf8");
  const backupFile = targetFile + ".bak";
  fs.writeFileSync(backupFile, content);

  let updated = false;

  switch (commandObj.update.toLowerCase()) {
    case "add trailing-sl":
      if (!content.includes("trailingSL")) {
        content = content.replace(
          "function triggerDemoTrade(side) {",
          `function triggerDemoTrade(side) {
  let trailingSL = 0.98; // Trailing SL 2% below peak
`
        );
        updated = true;
      }
      break;

    case "add 15m pattern":
      if (!content.includes("15min")) {
        content = content.replace(
          "// Initialize",
          `// Add 15m candle logic here (stub - add real scanner later)
let last15mCandle = null;
// Initialize`
        );
        updated = true;
      }
      break;

    case "optimize rsi":
      content = content.replace("rsi >= 30", "rsi >= 35").replace("rsi <= 70", "rsi <= 65");
      updated = true;
      break;

    case "switch to live":
      content = content.replace('tradeMode = "demo"', 'tradeMode = "real"');
      updated = true;
      break;

    default:
      console.log("⚠️ Unknown update command.");
      return;
  }

  if (updated) {
    fs.writeFileSync(targetFile, content);
    console.log(`✅ Update applied: ${commandObj.update} → ${commandObj.target}`);
  } else {
    console.log("⚠️ Nothing changed (maybe already applied).");
  }
}

function watchCommandFile() {
  if (!fs.existsSync(commandPath)) {
    fs.mkdirSync(path.dirname(commandPath), { recursive: true });
    fs.writeFileSync(commandPath, JSON.stringify({ update: "", target: "" }, null, 2));
    console.log("🆕 Created command file.");
  }

  fs.watchFile(commandPath, (curr, prev) => {
    const raw = fs.readFileSync(commandPath, "utf8");
    try {
      const cmd = JSON.parse(raw);
      applyUpdate(cmd);
    } catch (e) {
      console.error("❌ Failed to parse update command.", e.message);
    }
  });

  console.log("🚀 Smart Auto-Updater is watching for commands...");
}

watchCommandFile();

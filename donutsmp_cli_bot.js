const axios = require("axios");
const fs = require("fs");
const { exec } = require("child_process");
const mineflayer = require("mineflayer");
const readline = require("readline");
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const mcData = require('minecraft-data')('1.20.4');
const toolPlugin = require('mineflayer-tool').plugin;
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');
const { authenticator } = require('prismarine-auth');

const BOT_VERSION = "1.2";
const REMOTE_URL = "https://raw.githubusercontent.com/forestg10/Donutbot/main/donutsmp_cli_bot.js";

async function checkForUpdatesSingleFile() {
  try {
    const res = await axios.get(REMOTE_URL);
    const remoteCode = res.data;

    const match = remoteCode.match(/const BOT_VERSION\s*=\s*["'](.+)["']/);
    if (!match) {
      console.log("Could not find version info in remote file.");
      return true;
    }

    const remoteVersion = match[1];

    if (remoteVersion !== BOT_VERSION) {
      console.log(`⚠️ Update available! Local: ${BOT_VERSION}, Remote: ${remoteVersion}`);
      console.log("Downloading update...");

      fs.writeFileSync(__filename, remoteCode, "utf8");
      console.log("Update complete. Please restart the bot manually to apply the update.");

      return false;
    } else {
      console.log(`Bot is up to date (v${BOT_VERSION}).`);
      return true;
    }
  } catch (e) {
    console.error("Update check failed:", e.message);
    return true;
  }
}

let config;
try {
  config = JSON.parse(fs.readFileSync("config.json", "utf8"));
} catch (e) {
  console.error("Error loading config.json. Make sure it exists and is valid JSON.");
  process.exit(1);
}

const { DONUT_API_KEY, MINECRAFT_HOST } = config;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});





let farming = false;
let farmingInterval;

function showMenu() {
  console.clear();
  console.log("=== DonutSMP CLI Bot ===");
  console.log("1. Check Balance");
  console.log("2. View Playtime");
  console.log("3. Check Stats");
  console.log("4. Warp to Spawn");
  console.log("5. Open Crate");
  console.log("6. Teleport to Home");
  console.log("7. Warp to Shards");
  console.log("8. Claim Daily Reward");
  console.log("9. Toggle PvP");
  console.log("10. Open Auction House");
  console.log("11. View Auction Listings");
  console.log("12. Broadcast Message");
  console.log("13. View Inventory");
  console.log("14. More API Commands (Page 2)");
  console.log("15. Exit");
  console.log("16. Live Chat View");
  console.log("17. Pay Player");
  console.log("18. Teleport to Player (/tpa)");
  console.log("19. Accept Teleport Request (/tpaccept)");
  console.log("20. Spam /tpahere drdonutt");
  console.log("21. Walk Bot");
  console.log("22. Mine Blocks by Type and Amount");

  rl.question("Select option: ", handleInput);
}

function showApiMenu() {
  console.clear();
  console.log("=== DonutSMP API Commands Page 2 ===");
  console.log("1. Auction List (page)");
  console.log("2. Auction Transactions (page)");
  console.log("3. Leaderboard Broken Blocks (page)");
  console.log("4. Leaderboard Deaths (page)");
  console.log("5. Leaderboard Kills (page)");
  console.log("6. Leaderboard Mobs Killed (page)");
  console.log("7. Leaderboard Money (page)");
  console.log("8. Leaderboard Placed Blocks (page)");
  console.log("9. Leaderboard Playtime (page)");
  console.log("10. Leaderboard Sell (page)");
  console.log("11. Leaderboard Shards (page)");
  console.log("12. Leaderboard Shop (page)");
  console.log("13. Lookup Player (username)");
  console.log("14. Shield Metrics (service)");
  console.log("15. Player Stats (username)");
  console.log("16. Back to Main Menu");
  rl.question("Select API command: ", handleApiInput);
}

async function handleApiInput(choice) {
  try {
    switch (choice.trim()) {
      case "1":
        await askPageAndCall(apiAuctionList);
        break;
      case "2":
        await askPageAndCall(apiAuctionTransactions);
        break;
      case "3":
        await askPageAndCall(apiLeaderboardBrokenBlocks);
        break;
      case "4":
        await askPageAndCall(apiLeaderboardDeaths);
        break;
      case "5":
        await askPageAndCall(apiLeaderboardKills);
        break;
      case "6":
        await askPageAndCall(apiLeaderboardMobsKilled);
        break;
      case "7":
        await askPageAndCall(apiLeaderboardMoney);
        break;
      case "8":
        await askPageAndCall(apiLeaderboardPlacedBlocks);
        break;
      case "9":
        await askPageAndCall(apiLeaderboardPlaytime);
        break;
      case "10":
        await askPageAndCall(apiLeaderboardSell);
        break;
      case "11":
        await askPageAndCall(apiLeaderboardShards);
        break;
      case "12":
        await askPageAndCall(apiLeaderboardShop);
        break;
      case "13": {
        rl.question("Enter player username: ", async (username) => {
          await apiLookupPlayer(username.trim());
          rl.question("Press Enter to continue...", showApiMenu);
        });
        return;
      }
      case "14": {
        rl.question("Enter shield service name: ", async (service) => {
          await apiShieldMetrics(service.trim());
          rl.question("Press Enter to continue...", showApiMenu);
        });
        return;
      }
      case "15": {
        rl.question("Enter player username: ", async (username) => {
          await apiPlayerStats(username.trim());
          rl.question("Press Enter to continue...", showApiMenu);
        });
        return;
      }
      case "16":
        showMenu();
        return;
  break;

      default:
        console.log("Invalid choice.");
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
  rl.question("Press Enter to continue...", showApiMenu);
}

async function askPageAndCall(apiFunc) {
  rl.question("Enter page number (default 1): ", async (page) => {
    page = page.trim();
    if (!page || isNaN(page) || page < 1) page = 1;
    await apiFunc(page);
    rl.question("Press Enter to continue...", showApiMenu);
  });
}

async function apiRequest(endpoint) {
  try {
    const res = await axios.get(`https://api.donutsmp.net/v1/${endpoint}`, {
      headers: { Authorization: `Bearer ${DONUT_API_KEY}` },
    });
    return res.data;
  } catch (e) {
    console.log("API request error:", e.response ? e.response.data.message || e.response.statusText : e.message);
    return null;
  }
}

async function apiAuctionList(page) {
  const data = await apiRequest(`auction/list/${page}`);
  if (data && data.result) {
    console.log(`\nAuction List Page ${page}:`);
    data.result.slice(0, 10).forEach((item, i) => {
      const itemName =
        item.item?.display_name ||
        item.item?.name ||
        item.item?.type ||
        "(Unnamed Item)";
      const price = item.price?.toLocaleString() ?? "???";
      const seller = item.seller?.name ?? "Unknown";
      console.log(`${i + 1}. ${itemName} - $${price} - Seller: ${seller}`);
    });
  } else {
    console.log("No auction data found.");
  }
}


async function apiAuctionTransactions(page) {
  const data = await apiRequest(`auction/transactions/${page}`);
  if (data && data.result) {
    console.log(`\nAuction Transactions Page ${page}:`);
    data.result.slice(0, 10).forEach((tx, i) => {
      console.log(
        `${i + 1}. ${tx.item.display_name} sold for $${tx.price.toLocaleString()} by ${tx.seller.name} at ${new Date(tx.unixMillisDateSold).toLocaleString()}`
      );
    });
  } else {
    console.log("No transaction data found.");
  }
}

async function apiLeaderboardBrokenBlocks(page) {
  await genericLeaderboard("brokenblocks", page);
}
async function apiLeaderboardDeaths(page) {
  await genericLeaderboard("deaths", page);
}
async function apiLeaderboardKills(page) {
  await genericLeaderboard("kills", page);
}
async function apiLeaderboardMobsKilled(page) {
  await genericLeaderboard("mobskilled", page);
}
async function apiLeaderboardMoney(page) {
  await genericLeaderboard("money", page);
}
async function apiLeaderboardPlacedBlocks(page) {
  await genericLeaderboard("placedblocks", page);
}
async function apiLeaderboardPlaytime(page) {
  await genericLeaderboard("playtime", page);
}
async function apiLeaderboardSell(page) {
  await genericLeaderboard("sell", page);
}
async function apiLeaderboardShards(page) {
  await genericLeaderboard("shards", page);
}
async function apiLeaderboardShop(page) {
  await genericLeaderboard("shop", page);
}

async function genericLeaderboard(type, page) {
  const data = await apiRequest(`leaderboards/${type}/${page}`);
  if (data && data.result) {
    console.log(`\nLeaderboard for ${type} - Page ${page}:`);
    data.result.slice(0, 10).forEach((entry, i) => {
      console.log(`${i + 1}. ${entry.username} - ${entry.value}`);
    });
  } else {
    console.log("No leaderboard data found.");
  }
}

async function apiLookupPlayer(username) {
  const data = await apiRequest(`lookup/${username}`);
  if (data && data.result) {
    const p = data.result;
    console.log(`\nPlayer Info for ${username}:\nLocation: ${p.location}\nRank: ${p.rank}\nUsername: ${p.username}`);
  } else {
    console.log("Player not found.");
  }
}

async function apiShieldMetrics(service) {
  const data = await apiRequest(`shield/metrics/${service}`);
  if (data && data.result) {
    console.log(`\nShield Metrics for ${service}:`);
    console.log(JSON.stringify(data.result, null, 2));
  } else {
    console.log("No shield metrics found.");
  }
}

async function apiPlayerStats(username) {
  const data = await apiRequest(`stats/${username}`);
  if (data && data.result) {
    const s = data.result;
    console.log(`\nStats for ${username}:
Kills: ${s.kills}
Deaths: ${s.deaths}
Broken Blocks: ${s.broken_blocks}
Placed Blocks: ${s.placed_blocks}
Money: $${s.money}
Money Made from Sell: $${s.money_made_from_sell}
Money Spent on Shop: $${s.money_spent_on_shop}
Playtime: ${s.playtime}
Shards: ${s.shards}`);
  } else {
    console.log("Player stats not found.");
  }
}

// Parsing shorthand prices for auction
function parsePrice(input) {
  input = input.toLowerCase().trim();
  let multiplier = 1;

  if (input.endsWith("k")) {
    multiplier = 1_000;
    input = input.slice(0, -1);
  } else if (input.endsWith("m")) {
    multiplier = 1_000_000;
    input = input.slice(0, -1);
  } else if (input.endsWith("b")) {
    multiplier = 1_000_000_000;
    input = input.slice(0, -1);
  } else if (input.endsWith("t")) {
    multiplier = 1_000_000_000_000;
    input = input.slice(0, -1);
  }

  const num = parseFloat(input);
  if (isNaN(num) || num <= 0) {
    return null;
  }

  return Math.floor(num * multiplier);
}

function viewInventory() {
  const items = bot.inventory.items();
  if (items.length === 0) {
    return done("Your inventory is empty!");
  }

  console.log("\nYour Inventory:");
  items.forEach((item, i) => {
    const name = item.displayName || item.name || item.type;
    console.log(`${i + 1}. ${name} x${item.count}`);
  });
  done("Inventory displayed.");
}
function done(msg) {
  console.log("\n" + msg);
  rl.question("Press Enter to continue...", showMenu);
}

async function getBalance() {
  try {
const username = config.USERNAME;
const res = await axios.get(`https://api.donutsmp.net/v1/stats/${username}`, {
  headers: { Authorization: `Bearer ${DONUT_API_KEY}` },
});

    if (res.data && res.data.result) {
      done(`Balance: $${res.data.result.money.toLocaleString()}`);
    } else {
      done("Could not get balance data.");
    }
  } catch (e) {
    done("Error getting balance: " + e.message);
  }
}

async function getPlaytime() {
  try {
    const res = await axios.get("https://api.donutsmp.net/v1/leaderboards/playtime/1", {
      headers: { Authorization: `Bearer ${DONUT_API_KEY}` },
    });
    if (res.data && res.data.result) {
      done(`Playtime leaderboard first page retrieved. (Use API page 2 for details)`);
    } else {
      done("Could not get playtime data.");
    }
  } catch (e) {
    done("Error getting playtime: " + e.message);
  }
}

async function getStats() {
  try {
    const res = await axios.get("https://api.donutsmp.net/v1/stats/me", {
      headers: { Authorization: `Bearer ${DONUT_API_KEY}` },
    });
    if (res.data && res.data.result) {
      const s = res.data.result;
      done(`Kills: ${s.kills}, Deaths: ${s.deaths}, KD: ${(s.kills / (s.deaths || 1)).toFixed(2)}`);
    } else {
      done("Could not get stats data.");
    }
  } catch (e) {
    done("Error getting stats: " + e.message);
  }
}

// Farming shards with live update and stop
function startFarmingShards() {
  if (farming) {
    console.log("Already farming shards.");
    return rl.question("Press Enter to continue...", showMenu);
  }

  farming = true;
  bot.chat("/warp shards");
  setTimeout(() => bot.chat("/farm start"), 2000);

  let shardsCollected = 0;
  console.log("Started farming shards. Press 's' then Enter to stop.");

  const shardListener = (msg) => {
    const text = msg.toString();
    const match = text.toLowerCase().match(/you collected (\d+) shards?/);
    if (match) {
      shardsCollected += parseInt(match[1], 10);
      process.stdout.write(`\rShards collected: ${shardsCollected}          `);
    }
  };

  bot.on("message", shardListener);

  farmingInterval = setInterval(() => {
    if (!farming) {
      bot.removeListener("message", shardListener);
      clearInterval(farmingInterval);
      done(`Stopped farming. Total shards collected: ${shardsCollected}`);
      return;
    }
  }, 1000);

  // Listen for 's' input to stop farming live
  rl.once("line", (input) => {
    if (input.trim().toLowerCase() === "s" && farming) {
      farming = false;
    }
  });
}

function liveChatView() {
  console.clear();
  console.log("Starting live chat view. Press Enter to return to menu.\n");

  const isPrivateMessage = (msg) => {
    const text = msg.toString().toLowerCase();
    return (
      text.includes("/msg") ||
      text.includes("/tell") ||
      text.includes("/w") ||
      text.includes("/dm") ||
      text.includes("whispers to you") ||
      text.includes("->") // Common PM format
    );
  };

  const chatListener = (username, message) => {
    const raw = message.toString();
    if (isPrivateMessage(raw)) {
      console.log(`\x1b[1m[PRIVATE] ${raw}\x1b[0m`); // bold text
    } else if (username !== bot.username) {
      console.log(`[${username}]: ${raw}`);
    }
  };

  bot.on("message", chatListener);

  rl.question("\nPress Enter to stop live chat view...\n", () => {
    bot.removeListener("message", chatListener);
    showMenu();
  });
}


function payCommand() {
  rl.question("Enter player name to pay: ", (player) => {
    if (!player.trim()) {
      console.log("Invalid player name.");
      return rl.question("Press Enter to continue...", showMenu);
    }
    rl.question("Enter amount to pay (e.g., 5k, 3.5m): $", (amountStr) => {
      const amount = parsePrice(amountStr.trim());
      if (amount === null) {
        console.log("Invalid amount format.");
        return rl.question("Press Enter to continue...", showMenu);
      }
      const cmd = `/pay ${player.trim()} ${amount}`;
      console.log(`Sending command: ${cmd}`);
      bot.chat(cmd);
      done(`Attempted to pay ${player.trim()} $${amount.toLocaleString()}.`);
    });
  });
}

function handleInput(choice) {
  switch (choice.trim()) {
    case "1":
      getBalance();
      break;
    case "2":
      getPlaytime();
      break;
    case "3":
      getStats();
      break;
    case "4":
     bot.chat("/warp spawn");
     done("Warped to spawn...");
      break;
    case "5":
      bot.chat("/crate open");
      done("Crate opened.");
      break;
    case "6":
      rl.question("Which home? 1, 2?: ", (msg) => {
       if (msg.trim()) {
         bot.chat(`/home ${msg.trim()}`);
       }
        done(`Teleported to home ${msg.trim()}.`);
      });
      break;
 case "7":
  bot.chat("/warp afk");
  done("Warping to shard area... Moving to coordinates shortly.");

  setTimeout(() => {
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    const goalX = 19, goalY = 67, goalZ = 91;
    const goal = new goals.GoalBlock(goalX, goalY, goalZ);
    bot.pathfinder.setGoal(goal);

    const arrivalCheck = setInterval(() => {
      const pos = bot.entity.position;
      if (
        Math.floor(pos.x) === goalX &&
        Math.floor(pos.y) === goalY &&
        Math.floor(pos.z) === goalZ
      ) {
        clearInterval(arrivalCheck);
        console.log("Arrived at shard portal. Jumping twice...");

        let jumps = 0;
        const jump = () => {
          if (jumps >= 2) {
            console.log("Finished jumping.");
            return;
          }

          bot.setControlState("jump", true);
          setTimeout(() => {
            bot.setControlState("jump", false);
            jumps++;
            setTimeout(jump, 500);
          }, 250);
        };

        jump();
      }
    }, 500);
  }, 6000);
  break;

    case "8":
      bot.chat("/daily");
      done("Claimed daily reward.");
      break;
    case "9":
      bot.chat("/pvp");
      done("Toggled PvP.");
      break;
    case "10":
      bot.chat("/ah");
      done("Opened Auction House.");
      break;
    case "11":
      viewAuctionAPI();
      break;
   case "12":
  rl.question("Enter message to broadcast: ", (msg) => {
    if (msg.trim()) {
      bot.chat(msg.trim());
      done("Broadcasted message.");
    } else {
      done("No message entered.");
    }
  });
  break;

    case "13":
        viewInventory();
      break;
    case "14":
      showApiMenu();
      break;
    case "15":
      rl.close();
      bot.end();
      console.log("Goodbye!");
      process.exit(0);
      break;
    case "16":
      liveChatView();
      break;
    case "17":
      payCommand();
      break;
          case "18":
      rl.question("Enter player name to teleport to: ", (player) => {
        if (player.trim()) {
          bot.chat(`/tpa ${player.trim()}`);
          done(`Sent teleport request to ${player.trim()}.`);
        } else {
          done("Invalid player name.");
        }
      });
      break;

    case "19":
      rl.question("Enter username to accept teleport from: ", (player) => {
        if (player.trim()) {
          bot.chat(`/tpaccept ${player.trim()}`);
          done(`Accepted teleport request from ${player.trim()}.`);
        } else {
          done("Invalid username.");
        }
      });
      break;
          case "20":
      spamTpahere();
      break;
    case "21":
      walkController();
      break;
      case "22":
  mineBlocksMenu();
  break;

    default:
      done("Invalid choice.");
  }
}

async function viewAuctionAPI() {
  try {
    const res = await axios.get("https://api.donutsmp.net/v1/auction/list/1", {
      headers: { Authorization: `Bearer ${DONUT_API_KEY}` },
    });
    const items = res.data.result || [];
    console.log("\nAuction Listings (Page 1):");
    items.slice(0, 5).forEach((item, i) => {
      console.log(`${i + 1}. ${item.item.display_name} - $${item.price.toLocaleString()} - Seller: ${item.seller.name}`);
    });
  } catch (e) {
    console.log("Error fetching auction listings:", e.message);
  }
  rl.question("Press Enter to continue...", showMenu);
}

function walkController() {
  console.clear();
  console.log("=== Walk Bot ===");
  console.log("1. Forward");
  console.log("2. Backward");
  console.log("3. Left");
  console.log("4. Right");

  rl.question("Choose direction (1-4): ", (dir) => {
    const direction = parseInt(dir.trim());
    if (![1, 2, 3, 4].includes(direction)) {
      return done("Invalid direction.");
    }

    rl.question("How many blocks? ", (blockStr) => {
      const distance = parseInt(blockStr.trim());
      if (isNaN(distance) || distance < 1) {
        return done("Invalid block distance.");
      }

      const pos = bot.entity.position.clone();
      let dx = 0, dz = 0;

      switch (direction) {
        case 1: dz = 1; break;  // forward
        case 2: dz = -1; break; // backward
        case 3: dx = -1; break; // left
        case 4: dx = 1; break;  // right
      }

      const targetX = Math.floor(pos.x + dx * distance);
      const targetY = Math.floor(pos.y);
      const targetZ = Math.floor(pos.z + dz * distance);

      const movement = new Movements(bot, mcData);
      bot.pathfinder.setMovements(movement);
      bot.pathfinder.setGoal(new goals.GoalBlock(targetX, targetY, targetZ));

      console.log(`Walking ${distance} blocks to (${targetX}, ${targetY}, ${targetZ})...`);
      rl.question("Press Enter to return to menu...", showMenu);
    });
  });
}

function mineBlocksMenu() {
  rl.question("Enter block type to mine (e.g., 'stone', 'oak_log'): ", (blockName) => {
    if (!blockName.trim()) return done("Invalid block name.");
    rl.question("Enter amount to mine: ", (amountStr) => {
      const amount = parseInt(amountStr);
      if (isNaN(amount) || amount <= 0) return done("Invalid amount.");

      mineBlocks(blockName.trim(), amount);
    });
  });
}

async function mineBlocks(blockName, amount) {
  const blocks = bot.findBlocks({
    matching: (b) => b.name === blockName,
    maxDistance: 64,
    count: amount * 2, // Buffer in case some fail
  });

  if (!blocks.length) return done(`No '${blockName}' blocks found nearby.`);

  const defaultMove = new Movements(bot, mcData);
  bot.pathfinder.setMovements(defaultMove);

  let mined = 0;

  for (const pos of blocks) {
    if (mined >= amount) break;

    const block = bot.blockAt(pos);
    if (!block?.diggable) continue;

    const goal = new goals.GoalBlock(pos.x, pos.y, pos.z);
    bot.pathfinder.setGoal(goal);

    await bot.pathfinder.goto(goal).catch(() => {});

    await bot.tool.equipForBlock(block).catch(() => {});
    await bot.dig(block).catch(() => {});
    mined++;
    console.log(`Mined ${mined}/${amount} ${blockName}`);
  }

  done(`Finished mining ${mined} ${blockName}.`);
}


function spamTpahere() {
  console.log("Started spamming /tpahere drdonutt every 0.5s for 2s, then wait 1s. Press Enter to stop.");

  let spamming = true;
  let spamInterval;

  function startSpamCycle() {
    if (!spamming) return;

    // spam every 0.5s
    spamInterval = setInterval(() => {
      if (bot && bot.chat) {
        bot.chat("/tpahere drdonutt");
      }
    }, 500);

    // stop after 2 seconds
    setTimeout(() => {
      clearInterval(spamInterval);
      if (!spamming) return;
      // wait 1 second, then restart cycle
      setTimeout(() => {
        if (spamming) startSpamCycle();
      }, 1000);
    }, 2000);
  }

  startSpamCycle();

  // Stop on Enter key
  rl.question("Press Enter to stop spamming...\n", () => {
    spamming = false;
    clearInterval(spamInterval);
    done("Stopped spamming /tpahere.");
  });
}




const bot = mineflayer.createBot({
  host: MINECRAFT_HOST,
  auth: 'microsoft',
  version: "1.20.4",
  authHandler: authenticator,
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(toolPlugin);

let viewer; 

bot.once('spawn', () => {
  console.log('Bot spawned, waiting for chunks to load...');

  // Start prismarine viewer in orbit/panning mode only
  viewer = mineflayerViewer(bot, { port: 3000, firstPerson: false });
  console.log("Viewer running on http://localhost:3000 (panning mode)");

  // Keep camera following bot's position
  setInterval(() => {
    if (bot.entity && viewer) {
      viewer.setViewPosition(bot.entity.position);
    }
  }, 1000);

  // Show menu after a short delay
  setTimeout(showMenu, 2000);
});



bot.on("end", (reason) => {
  console.log("Bot disconnected.", reason || "");
  process.exit(1);
});

bot.on("error", (err) => {
  console.log("Bot error:", err.message);
  process.exit(1);
});






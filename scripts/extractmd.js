import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

// Fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const DB_PATH = path.join(__dirname, "../data/symbols.db");
const SYMBOLS_DIR = path.join(__dirname, "../data/symbols");
const SVG_DIR = path.join(__dirname, "../data/svgs");

// Normalize cleaning names 
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/\.svg$/, "")
    .replace(/[_\-\s]/g, "");
}

function getProperty(block, propertyName) {
  const match = block.match(new RegExp(`${propertyName}"\\s+"([^"]*)"`));
  return match ? match[1] : null;
}

function getSymbolName(block) {
  const match = block.match(/^\s*\(symbol\s+"([^"]+)"/);
  return match ? match[1] : null;
}

function getExtends(block) {
  const match = block.match(/\(extends\s+"([^"]+)"\)/);
  return match ? match[1] : null;
}

function countPins(block, blockByName, seen = new Set()) {
  if (!block) return null;

  const ownCount = (block.match(/\(pin\b/g) || []).length;
  if (ownCount > 0) return ownCount;

  const parent = getExtends(block);
  if (!parent || seen.has(parent)) return null;

  seen.add(parent);
  return countPins(blockByName.get(parent), blockByName, seen);
}

function parseTopLevelSymbols(content) {
  const symbols = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let symbolStart = -1;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "(") {
      if (depth === 1 && content.startsWith("(symbol ", i)) {
        symbolStart = i;
      }
      depth++;
      continue;
    }

    if (char === ")") {
      depth--;
      if (symbolStart !== -1 && depth === 1) {
        symbols.push(content.slice(symbolStart, i + 1));
        symbolStart = -1;
      }
    }
  }

  return symbols;
}

function wordsFromName(str) {
  return (str || "")
    .replace(/\.svg$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9+]+/g, " ")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function includesAny(text, words, patterns) {
  const wordSet = new Set(words);
  return patterns.some(pattern => {
    if (pattern instanceof RegExp) return pattern.test(text);
    return wordSet.has(pattern);
  });
}

function inferCategory(fileCategory, symbolName, baseName, description, keywords, svgFile) {
  const parts = [
    fileCategory,
    symbolName,
    baseName,
    description,
    keywords,
    svgFile
  ].filter(Boolean);

  const text = parts.join(" ").toLowerCase();
  const nameParts = [fileCategory, symbolName, baseName, svgFile]
    .filter(Boolean);
  const nameText = nameParts.join(" ").toLowerCase();
  const nameWords = nameParts.flatMap(wordsFromName);
  const compact = normalize(parts.join(""));
  const fileCompact = normalize(svgFile || "");
  const symbolLower = (symbolName || "").toLowerCase();
  const baseLower = (baseName || "").toLowerCase();

  if (/^r(_|$)/.test(symbolLower) || /^r(_|$)/.test(baseLower)) return "Resistor";
  if (includesAny(nameText, nameWords, [
    /^r\d*$/i,
    "resistor",
    "resistors",
    "res",
    /\bpotentiometer\b/,
    /\bvaristor\b/
  ]) || /^r\d*$/.test(fileCompact)) return "Resistor";

  if (/^c(_|$)/.test(symbolLower) || /^c(_|$)/.test(baseLower)) return "Capacitor";
  if (includesAny(nameText, nameWords, [
    /^c\d*$/i,
    "capacitor",
    "capacitors",
    "cap",
    "polarized",
    "electrolytic"
  ]) || /^c\d*$/.test(fileCompact) || /^cp\d*$/.test(fileCompact)) return "Capacitor";

  if (/^l(_|$)/.test(symbolLower) || /^l(_|$)/.test(baseLower)) return "Inductor";
  if (includesAny(nameText, nameWords, [
    /^l\d*$/i,
    "inductor",
    "inductors",
    "coil",
    "choke",
    "ferrite"
  ]) || /^l\d*$/.test(fileCompact)) return "Inductor";

  if (/\b(op[\s-]?amp|operational amplifier|instrumentation amplifier)\b/.test(text) || compact.includes("opamp")) {
    return "OpAmp";
  }

  if (/\b(shift\s+)?registers?\b|\bregister\s+files?\b/.test(text)) return "Register";
  if (/\bvoltage regulator\b|\bcurrent regulator\b|\bregulators?\b/.test(text) || fileCompact.includes("regulator")) return "Regulator";
  if (/\bcomparators?\b/.test(text)) return "Comparator";
  if (/\b(adc|analog to digital|a\/d converter)\b/.test(text)) return "ADC";
  if (/\b(dac|digital to analog|d\/a converter)\b/.test(text)) return "DAC";
  if (/\bdiodes?\b/.test(text) || /^d\d*$/.test(fileCompact)) return "Diode";
  if (/\bleds?\b|light emitting diode/.test(text) || fileCompact.includes("led")) return "LED";
  if (/\b(mosfet|jfet|igbt|transistors?|bjt)\b/.test(text) || /^q\d*$/.test(fileCompact)) return "Transistor";
  if (/\b(connectors?|conn|header|socket|plug|jack)\b/.test(text) || /^j\d*$/.test(fileCompact)) return "Connector";
  if (/\b(switches?|pushbutton|button|dip switch)\b/.test(text) || /^sw\d*$/.test(fileCompact)) return "Switch";
  if (/\brelays?\b/.test(text) || /^k\d*$/.test(fileCompact)) return "Relay";
  if (/\btransformers?\b/.test(text) || /^t\d*$/.test(fileCompact)) return "Transformer";
  if (/\bfuses?\b/.test(text) || /^f\d*$/.test(fileCompact)) return "Fuse";
  if (/\b(crystal|oscillator|resonator)\b/.test(text) || /^y\d*$/.test(fileCompact)) return "Oscillator";
  if (/\b(motors?|servo|stepper)\b/.test(text) || /^m\d*$/.test(fileCompact)) return "Motor";
  if (/\b(battery|cell)\b/.test(text) || /^bt\d*$/.test(fileCompact)) return "Battery";
  if (/\b(gnd|ground|earth|vcc|vdd|vss|power symbol|supply)\b/.test(text)) return "Power";
  if (/\b(sensors?|temperature|humidity|pressure|current sensor|proximity|motion)\b/.test(text)) return "Sensor";
  if (/\b(mcu|microcontroller|microchip|stm32|atmega|attiny|pic\d*)\b/.test(text)) return "Microcontroller";
  if (/\b(memory|sram|dram|eeprom|eprom|flash|nvram|rom|ram)\b/.test(text)) return "Memory";
  if (/\b(logic|gate|flip[\s-]?flop|latch|counter|multiplexer|decoder|encoder)\b/.test(text)) return "Logic";
  if (/\b(amplifiers?|buffer)\b/.test(text)) return "Amplifier";

  return fileCategory;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function splitWords(value) {
  return (value || "")
    .replace(/[_\-+/]+/g, " ")
    .replace(/[^a-zA-Z0-9.µ]+/g, " ")
    .split(/\s+/)
    .map(word => word.trim())
    .filter(Boolean);
}

function extractRating(text, kind) {
  if (!text) return null;

  const patterns = {
    voltage: /(\d+(?:\.\d+)?)\s*(mV|kV|V)\b/i,
    current: /(\d+(?:\.\d+)?)\s*(uA|µA|mA|kA|A)\b/i,
    power: /(\d+(?:\.\d+)?)\s*(mW|kW|W)\b/i,
  };

  const match = text.match(patterns[kind]);
  return match ? `${match[1]}${match[2]}` : null;
}

function inferMountType(packageType) {
  if (!packageType) return null;

  const pkg = packageType.toLowerCase();
  if (/(smd|smt|soic|qfn|bga|sot|tssop|msop|lqfp|tqfp|qfp|dfn|wlcsp)/.test(pkg)) {
    return "SMD";
  }
  if (/(dip|sip|tht|through|p[0-9.]+mm|pinheader|terminalblock)/.test(pkg)) {
    return "Through Hole";
  }

  return null;
}

function inferCompany(fileCategory, symbolName, description, keywords, datasheet) {
  const text = [
    fileCategory,
    symbolName,
    description,
    keywords,
    datasheet,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const companies = [
    [/microchip|atmel|samd|same|saml|samv|pic\d*|atmega|attiny/, "Microchip"],
    [/texas instruments|\bti\.com\b|\bti\b|msp430|simplelink/, "Texas Instruments"],
    [/stmicroelectronics|\bst\b|stm32|stm8/, "STMicroelectronics"],
    [/\bnxp\b|freescale|kinetis|lpc|imx|powerpc/, "NXP"],
    [/analog devices|analogdevices|ad\d|ltc\d|linear technology/, "Analog Devices"],
    [/renesas/, "Renesas"],
    [/xilinx|amd/, "Xilinx"],
    [/altera|intel/, "Intel/Altera"],
    [/lattice/, "Lattice"],
    [/efinix/, "Efinix"],
    [/nordic/, "Nordic Semiconductor"],
    [/espressif|esp32|esp8266/, "Espressif"],
    [/silicon labs|siliconlabs|silabs/, "Silicon Labs"],
    [/raspberry ?pi/, "Raspberry Pi"],
    [/motorola/, "Motorola"],
    [/\bwch\b|ch32/, "WCH"],
    [/puya/, "Puya"],
    [/parallax/, "Parallax"],
    [/cypress/, "Cypress"],
    [/dialog/, "Dialog Semiconductor"],
    [/onsemi|on semiconductor/, "onsemi"],
  ];

  for (const [pattern, company] of companies) {
    if (pattern.test(text)) return company;
  }

  return null;
}

function buildTags({
  category,
  deviceType,
  company,
  symbolName,
  baseName,
  description,
  keywords,
  packageType,
  mountType,
  pinCount,
  voltage,
  current,
  power,
}) {
  const tags = [
    category,
    deviceType,
    company,
    mountType,
    packageType,
    pinCount ? `${pinCount} pins` : null,
    voltage ? `voltage ${voltage}` : null,
    current ? `current ${current}` : null,
    power ? `power ${power}` : null,
    ...splitWords(symbolName),
    ...splitWords(baseName),
    ...splitWords(description),
    ...splitWords(keywords),
  ];

  return JSON.stringify(
    unique(tags)
      .map(tag => tag.toString().trim())
      .map(tag => tag.replace(/^[^a-zA-Z0-9µ]+|[^a-zA-Z0-9µ]+$/g, ""))
      .filter(tag => tag.length > 1)
      .slice(0, 30)
  );
}

// Load SVGs normalizing strings
const svgList = fs.existsSync(SVG_DIR)
  ? fs.readdirSync(SVG_DIR)
      .filter(f => f.endsWith(".svg"))
      .map(file => ({
        file,
        norm: normalize(file)
      }))
  : [];

// Check symbols folder
if (!fs.existsSync(SYMBOLS_DIR)) {
  console.error("Symbols folder not found:", SYMBOLS_DIR);
  process.exit(1);
}

// DB connect
const db = new Database(DB_PATH);

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS symbols (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol_name TEXT,
    base_name TEXT,
    category TEXT,
    device_type TEXT,
    company TEXT,
    package TEXT,
    pin_count TEXT,
    mount_type TEXT,
    voltage TEXT,
    current TEXT,
    power TEXT,
    datasheet TEXT,
    description TEXT,
    keywords TEXT,
    tags TEXT,
    license TEXT,
    svg_path TEXT
  )
`);

const requiredColumns = {
  symbol_name: "TEXT",
  base_name: "TEXT",
  category: "TEXT",
  device_type: "TEXT",
  company: "TEXT",
  package: "TEXT",
  pin_count: "TEXT",
  mount_type: "TEXT",
  voltage: "TEXT",
  current: "TEXT",
  power: "TEXT",
  datasheet: "TEXT",
  description: "TEXT",
  keywords: "TEXT",
  tags: "TEXT",
  license: "TEXT",
  svg_path: "TEXT"
};

const existingColumns = new Set(
  db.prepare("PRAGMA table_info(symbols)").all().map(column => column.name)
);

for (const [columnName, columnType] of Object.entries(requiredColumns)) {
  if (!existingColumns.has(columnName)) {
    db.exec(`ALTER TABLE symbols ADD COLUMN ${columnName} ${columnType}`);
  }
}

// Clear old data
db.exec("DELETE FROM symbols");

// Prepare insert
const insert = db.prepare(`
  INSERT INTO symbols (
    symbol_name,
    base_name,
    category,
    device_type,
    company,
    package,
    pin_count,
    mount_type,
    voltage,
    current,
    power,
    datasheet,
    description,
    keywords,
    tags,
    license,
    svg_path
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Get files
const files = fs.readdirSync(SYMBOLS_DIR)
  .filter(f => f.endsWith(".kicad_sym"));

const indexedSvgFiles = new Set();
let insertedSymbols = 0;

// Transaction for faster insert 
const insertMany = db.transaction((symbols, fileName) => {
  const blockByName = new Map();

  for (const block of symbols) {
    const name = getSymbolName(block);
    if (name) blockByName.set(name, block);
  }

  for (const block of symbols) {
    try {

      // NAME
      const rawName = getSymbolName(block);
      if (!rawName) continue;
      if (/_\d+_\d+$/.test(rawName)) continue;

      const symbol_name = rawName.split(":")[0].trim();
      const base_name = rawName.includes(":")
        ? rawName.split(":")[1].trim()
        : rawName;

      // CATEGORY
      const fileCategory = fileName.replace(".kicad_sym", "");
      const device_type = fileCategory;

      // FOOTPRINT
      const footprint = getProperty(block, "Footprint");
      let packageType = footprint ? footprint.split(":").pop().trim() : null;

      // DATASHEET
      const datasheet = getProperty(block, "Datasheet");

      // DESCRIPTION
      const description = getProperty(block, "Description");

      // KEYWORDS
      const keywords = getProperty(block, "ki_keywords");

      // PIN COUNT
      const pin_count = countPins(block, blockByName);

      // POWER
      let power = /(vcc|gnd|vdd|vss|vin|vout)/i.test(block)
        ? "Yes"
        : null;

      // MOUNT TYPE
      const mount_type = inferMountType(packageType);

      // VOLTAGE / CURRENT
      let voltage = null;
      let current = null;

      const ratingText = [description, keywords, packageType].filter(Boolean).join(" ");
      voltage = extractRating(ratingText, "voltage");
      current = extractRating(ratingText, "current");
      const extractedPower = extractRating(ratingText, "power");
      if (extractedPower) power = extractedPower;

      // LICENSE
      const license = "Open/Generic";

      //   SVG MATCHING

      let svg_path = null;

      const base = normalize(symbol_name);

      let bestMatch = null;
      let bestScore = 0;

      for (const svg of svgList) {
        const file = svg.norm;

        let score = 0;

        if (file === base) score = 10;           // exact
        else if (file.startsWith(base)) score = 8; // prefix (cd14529)
        else if (file.includes(base)) score = 5;  // contains

        if (score > bestScore) {
          bestScore = score;
          bestMatch = svg.file;
        }
      }

      // accept only strong matches
      if (bestMatch && bestScore >= 5) {
        svg_path = `svgs/${bestMatch}`;
        indexedSvgFiles.add(bestMatch);
      }

      const category = inferCategory(
        fileCategory,
        symbol_name,
        base_name,
        description,
        keywords,
        bestMatch
      );
      const company = inferCompany(
        fileCategory,
        symbol_name,
        description,
        keywords,
        datasheet
      );

      const tags = buildTags({
        category,
        deviceType: device_type,
        company,
        symbolName: symbol_name,
        baseName: base_name,
        description,
        keywords,
        packageType,
        mountType: mount_type,
        pinCount: pin_count,
        voltage,
        current,
        power,
      });

      // INSERT
      insert.run(
        symbol_name,
        base_name,
        category,
        device_type,
        company,
        packageType,
        pin_count ? pin_count.toString() : null,
        mount_type,
        voltage,
        current,
        power,
        datasheet,
        description,
        keywords,
        tags,
        license,
        svg_path
      );
      insertedSymbols++;

    } catch (err) {
      console.log("Error:", err.message);
    }
  }
});

const insertSvgOnly = db.transaction((svgs) => {
  let count = 0;

  for (const svg of svgs) {
    if (indexedSvgFiles.has(svg.file)) continue;

    const symbolName = svg.file.replace(/\.svg$/i, "");
    const category = inferCategory(
      "SVG",
      symbolName,
      symbolName,
      "SVG image from svgs folder",
      null,
      svg.file
    );

    insert.run(
      symbolName,
      symbolName,
      category,
      "SVG",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      "SVG image from svgs folder",
      null,
      buildTags({
        category,
        deviceType: "SVG",
        company: null,
        symbolName,
        baseName: symbolName,
        description: "SVG image from svgs folder",
        keywords: null,
        packageType: null,
        mountType: null,
        pinCount: null,
        voltage: null,
        current: null,
        power: null,
      }),
      "Open/Generic",
      `svgs/${svg.file}`
    );

    indexedSvgFiles.add(svg.file);
    count++;
  }

  return count;
});

// RUN
let total = 0;

for (const file of files) {
  console.log("Processing:", file);  //which file is running

  const content = fs.readFileSync(
    path.join(SYMBOLS_DIR, file),
    "utf-8"
  );

  const symbols = parseTopLevelSymbols(content);

  total += symbols.length;

  insertMany(symbols, file);
}

const insertedSvgOnly = insertSvgOnly(svgList);

// DONE
console.log(`Parsed ${total} symbol blocks`);
console.log(`Inserted ${insertedSymbols} KiCad symbols`);
console.log(`Inserted ${insertedSvgOnly} SVG-only symbols`);
console.log(`Indexed ${insertedSymbols + insertedSvgOnly} total searchable symbols`);
db.close();

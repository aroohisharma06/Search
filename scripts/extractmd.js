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
const KICAD_LIBRARY_LICENSE = "Creative Commons CC-BY-SA 4.0 with KiCad exception";

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
  const categoryCompact = normalize(fileCategory || "");
  const fileCompact = normalize(svgFile || "");
  const symbolLower = (symbolName || "").toLowerCase();
  const baseLower = (baseName || "").toLowerCase();

  if (categoryCompact.startsWith("amplifier") || categoryCompact.startsWith("rfamplifier")) return "Amplifier";
  if (categoryCompact === "analogadc") return "ADC";
  if (categoryCompact === "analogdac") return "DAC";
  if (categoryCompact.startsWith("battery")) return "Battery";
  if (categoryCompact.startsWith("comparator")) return "Comparator";
  if (categoryCompact.startsWith("connector") || categoryCompact.startsWith("jumper")) return "Connector";
  if (categoryCompact.startsWith("diode")) return "Diode";
  if (/\b(capacitors?|capacitance|farads?)\b/.test(text)) return "Capacitor";
  if (categoryCompact.startsWith("driverled") || categoryCompact.startsWith("led") || categoryCompact.startsWith("display")) return "LED";
  if (categoryCompact.startsWith("drivermotor") || categoryCompact.startsWith("motor")) return "Motor";
  if (categoryCompact.startsWith("driverrelay") || categoryCompact.startsWith("relay")) return "Relay";
  if (categoryCompact.startsWith("logic") || categoryCompact.startsWith("buffer") || /^74|^4xxx/.test(categoryCompact)) return "Logic";
  if (categoryCompact.startsWith("mcu") || categoryCompact.startsWith("cpu") || categoryCompact.startsWith("dsp")) return "Microcontroller";
  if (categoryCompact.startsWith("memory")) return "Memory";
  if (categoryCompact.startsWith("oscillator") || categoryCompact.startsWith("timer")) return "Oscillator";
  if (categoryCompact === "power" || categoryCompact.startsWith("powermanagement") || categoryCompact.startsWith("powerprotection")) return "Power";
  if (categoryCompact.startsWith("regulator") || categoryCompact.startsWith("referencevoltage") || categoryCompact.startsWith("converter")) return "Regulator";
  if (categoryCompact.startsWith("sensor")) return "Sensor";
  if (categoryCompact.startsWith("switch") || categoryCompact.startsWith("analogswitch") || categoryCompact.startsWith("rfswitch")) return "Switch";
  if (categoryCompact.startsWith("transformer")) return "Transformer";
  if (categoryCompact.startsWith("transistor") || categoryCompact.startsWith("driverfet")) return "Transistor";

  if (/^[+-]?\d+(?:\.\d+)?v[a-z]*$/.test(fileCompact) || /^(gnd|earth|vcc|vdd|vss|vdc|vsw)$/.test(fileCompact)) {
    return "Power";
  }
  if (/^(batt|bat|battery|cell)/.test(fileCompact)) return "Battery";
  if (/^(1n|bav|bas|bat\d|bzt|smaj|smbj|smcj|sod|tvs|zener)/.test(fileCompact)) return "Diode";
  if (/^(74|54|cd4|he[cf]4|mc14|tc4|sn74)/.test(fileCompact)) return "Logic";
  if (/^(78|79)\d{2}/.test(fileCompact) || /^(ams1117|lm1117|lm317|lm337|ldo|buck|boost)/.test(fileCompact)) return "Regulator";
  if (/^(2n|bc|bd|bss|bs|irf|irfz|irl|ao\d|fdn|fet|mosfet|igbt)/.test(fileCompact)) return "Transistor";
  if (/^(xtal|crystal|osc|resonator|resomator|tcxo|vcxo)/.test(fileCompact)) return "Oscillator";
  if (/^(conn|connector|jst|usb|rj|jack|header|pinheader|terminal|socket|plug)/.test(fileCompact)) return "Connector";
  if (/^(sw|switch|button|pushbutton|dip)/.test(fileCompact)) return "Switch";
  if (/^(relay|rel|k\d+)/.test(fileCompact)) return "Relay";
  if (/^(fuse|polyfuse|ptc)/.test(fileCompact)) return "Fuse";
  if (/^(mcu|stm32|stm8|atmega|attiny|atxmega|pic|esp32|esp8266|nrf|samd|same|rp2040)/.test(fileCompact)) return "Microcontroller";
  if (/^(eeprom|eprom|flash|sram|dram|fram|memory|rom|ram)/.test(fileCompact)) return "Memory";
  if (/^(adc|ad[cs]|mcp3\d|ads\d)/.test(fileCompact)) return "ADC";
  if (/^(dac|mcp47|mcp48)/.test(fileCompact)) return "DAC";

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
  if (/\b(inductors?|inductance|chokes?|coils?|ferrite)\b/.test(text)) return "Inductor";

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

  return fileCategory === "SVG" ? "Component" : fileCategory;
}

function unitForCategory(category) {
  const units = {
    Resistor: "Ohm",
    Capacitor: "Farad",
    Inductor: "Henry",
    OpAmp: "Decibel",
    Register: "Bit",
    Regulator: "Volt",
    Comparator: "Volt",
    ADC: "Bit",
    DAC: "Bit",
    Diode: "Volt",
    LED: "Volt",
    Transistor: "Ampere",
    Connector: "Pins",
    Switch: "Ampere",
    Relay: "Volt",
    Transformer: "Watt",
    Fuse: "Ampere",
    Oscillator: "Hertz",
    Motor: "RPM",
    Battery: "Volt",
    Power: "Volt",
    Sensor: "Unit",
    Microcontroller: "Megahertz",
    Memory: "Megabyte",
    Logic: "Volt",
    Amplifier: "Decibel",
  };

  return units[category] || "Unit";
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

function normalizeParameterNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toPrecision(12)).toString();
}

function parameterKindsForCategory(category) {
  const kinds = {
    Resistor: ["resistance"],
    Capacitor: ["capacitance"],
    Inductor: ["inductance", "resistance"],
    Amplifier: ["gain"],
    OpAmp: ["gain"],
  };

  return kinds[category] || [];
}

function normalizeParameterUnit(rawUnit, expectedKinds = []) {
  const raw = String(rawUnit || "").trim();
  const compact = raw.replace(/\s+/g, "").replace(/Ω/g, "ohm").replace(/µ/g, "u");
  const lower = compact.toLowerCase();
  const expected = new Set(expectedKinds);

  if (/^db$/.test(lower)) return { kind: "gain", label: "Gain", multiplier: 1, unit: "dB" };

  if (/^(v|vac|vdc|volt|volts)$/.test(lower)) return { kind: "voltage", label: "Voltage", multiplier: 1, unit: raw.toUpperCase() === "VAC" || raw.toUpperCase() === "VDC" ? raw.toUpperCase() : "V" };
  if (/^mv$/.test(lower)) return { kind: "voltage", label: "Voltage", multiplier: 1e-3, unit: "mV" };
  if (/^kv$/.test(lower)) return { kind: "voltage", label: "Voltage", multiplier: 1e3, unit: "kV" };

  if (/^(a|amp|amps|ampere|amperes)$/.test(lower)) return { kind: "current", label: "Current", multiplier: 1, unit: "A" };
  if (/^ma$/.test(lower)) return { kind: "current", label: "Current", multiplier: 1e-3, unit: "mA" };
  if (/^(ua|microa|microamp|microamps|microampere|microamperes)$/.test(lower)) return { kind: "current", label: "Current", multiplier: 1e-6, unit: "uA" };
  if (/^ka$/.test(lower)) return { kind: "current", label: "Current", multiplier: 1e3, unit: "kA" };

  if (/^(w|watt|watts)$/.test(lower)) return { kind: "power", label: "Power", multiplier: 1, unit: "W" };
  if (/^mw$/.test(lower)) return { kind: "power", label: "Power", multiplier: 1e-3, unit: "mW" };
  if (/^kw$/.test(lower)) return { kind: "power", label: "Power", multiplier: 1e3, unit: "kW" };

  if (/^(hz|hertz)$/.test(lower)) return { kind: "frequency", label: "Frequency", multiplier: 1, unit: "Hz" };
  if (/^khz$/.test(lower)) return { kind: "frequency", label: "Frequency", multiplier: 1e3, unit: "kHz" };
  if (/^mhz$/.test(lower)) return { kind: "frequency", label: "Frequency", multiplier: 1e6, unit: "MHz" };
  if (/^ghz$/.test(lower)) return { kind: "frequency", label: "Frequency", multiplier: 1e9, unit: "GHz" };

  if (/^rpm$/.test(lower)) return { kind: "speed", label: "Speed", multiplier: 1, unit: "RPM" };
  if (/^(bit|bits)$/.test(lower)) return { kind: "resolution", label: "Resolution", multiplier: 1, unit: "bit" };
  if (/^(b|byte|bytes)$/.test(lower)) return { kind: "memory", label: "Memory", multiplier: 1, unit: "B" };
  if (/^(kb|kbyte|kbytes|kilobyte|kilobytes)$/.test(lower)) return { kind: "memory", label: "Memory", multiplier: 1e3, unit: "kB" };
  if (/^(mb|mbyte|mbytes|megabyte|megabytes)$/.test(lower)) return { kind: "memory", label: "Memory", multiplier: 1e6, unit: "MB" };
  if (/^(gb|gbyte|gbytes|gigabyte|gigabytes)$/.test(lower)) return { kind: "memory", label: "Memory", multiplier: 1e9, unit: "GB" };
  if (/^(kbit|kbits)$/.test(lower)) return { kind: "memory", label: "Memory", multiplier: 1e3, unit: "kbit" };
  if (/^(mbit|mbits)$/.test(lower)) return { kind: "memory", label: "Memory", multiplier: 1e6, unit: "Mbit" };
  if (/^(gbit|gbits)$/.test(lower)) return { kind: "memory", label: "Memory", multiplier: 1e9, unit: "Gbit" };

  if (/^(h|henry|henries)$/.test(lower)) return { kind: "inductance", label: "Inductance", multiplier: 1, unit: "H" };
  if (/^mh$/.test(lower)) return { kind: "inductance", label: "Inductance", multiplier: 1e-3, unit: "mH" };
  if (/^(uh|microh|microhenry|microhenries)$/.test(lower)) return { kind: "inductance", label: "Inductance", multiplier: 1e-6, unit: "uH" };
  if (/^nh$/.test(lower)) return { kind: "inductance", label: "Inductance", multiplier: 1e-9, unit: "nH" };

  if (/^(f|farad|farads)$/.test(lower)) return { kind: "capacitance", label: "Capacitance", multiplier: 1, unit: "F" };
  if (/^mf$/.test(lower)) return { kind: "capacitance", label: "Capacitance", multiplier: 1e-3, unit: "mF" };
  if (/^(uf|microf|microfarad|microfarads)$/.test(lower)) return { kind: "capacitance", label: "Capacitance", multiplier: 1e-6, unit: "uF" };
  if (/^nf$/.test(lower)) return { kind: "capacitance", label: "Capacitance", multiplier: 1e-9, unit: "nF" };
  if (/^pf$/.test(lower)) return { kind: "capacitance", label: "Capacitance", multiplier: 1e-12, unit: "pF" };

  if (/^(ohm|ohms)$/.test(lower)) return { kind: "resistance", label: "Resistance", multiplier: 1, unit: "Ohm" };
  if (/^k(ohm|ohms)?$/.test(lower)) return { kind: "resistance", label: "Resistance", multiplier: 1e3, unit: "kOhm" };
  if (/^(meg|mega)(ohm|ohms)?$/.test(lower)) return { kind: "resistance", label: "Resistance", multiplier: 1e6, unit: "MOhm" };
  if (/^m(ohm|ohms)$/.test(lower)) {
    return raw.startsWith("M")
      ? { kind: "resistance", label: "Resistance", multiplier: 1e6, unit: "MOhm" }
      : { kind: "resistance", label: "Resistance", multiplier: 1e-3, unit: "mOhm" };
  }
  if (lower === "k" && expected.has("resistance")) {
    return { kind: "resistance", label: "Resistance", multiplier: 1e3, unit: "kOhm" };
  }
  if (lower === "m" && expected.has("resistance")) {
    return raw.startsWith("M")
      ? { kind: "resistance", label: "Resistance", multiplier: 1e6, unit: "MOhm" }
      : { kind: "resistance", label: "Resistance", multiplier: 1e-3, unit: "mOhm" };
  }

  return null;
}

function extractParameterValues(text, expectedKinds = []) {
  const values = [];
  const seen = new Set();
  const pattern = /(\d+(?:\.\d+)?)\s*([a-zA-ZµΩ]+(?:\s*ohms?)?|Ω)(?=$|[^a-zA-ZµΩ])/g;

  for (const match of String(text || "").matchAll(pattern)) {
    const unit = normalizeParameterUnit(match[2], expectedKinds);
    if (!unit) continue;

    const normalized = normalizeParameterNumber(Number(match[1]) * unit.multiplier);
    if (!normalized) continue;

    const key = `${unit.kind}:${normalized}`;
    if (seen.has(key)) continue;

    seen.add(key);
    values.push({
      label: unit.label,
      raw: match[0],
      display: `${match[1]}${unit.unit}`,
      canonical: key,
    });
  }

  return values;
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
  parameterValues = [],
}) {
  const tags = [
    category,
    company,
    mountType,
    packageType,
    pinCount ? `${pinCount} pins` : null,
    unitForCategory(category) ? `unit ${unitForCategory(category)}` : null,
    voltage ? `voltage ${voltage}` : null,
    current ? `current ${current}` : null,
    power ? `power ${power}` : null,
    ...parameterValues.flatMap(value => [
      value.raw,
      value.display,
      `${value.label} ${value.display}`,
      value.canonical,
    ]),
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
    unit TEXT,
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
  unit: "TEXT",
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
    unit,
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
      const license = KICAD_LIBRARY_LICENSE;

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
      const unit = unitForCategory(category);
      const company = inferCompany(
        fileCategory,
        symbol_name,
        description,
        keywords,
        datasheet
      );
      const parameterValues = extractParameterValues([
        symbol_name,
        base_name,
        description,
        keywords,
        packageType,
      ].filter(Boolean).join(" "), parameterKindsForCategory(category));

      const tags = buildTags({
        category,
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
        parameterValues,
      });

      // INSERT
      insert.run(
        symbol_name,
        base_name,
        category,
        unit,
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
    const unit = unitForCategory(category);

    insert.run(
      symbolName,
      symbolName,
      category,
      unit,
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
        parameterValues: extractParameterValues(symbolName),
      }),
      KICAD_LIBRARY_LICENSE,
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

const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

/* ---------- Database ---------- */

const dbPath = path.join(__dirname, "../data/symbols.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.log("Database connection failed:", err.message);
  } else {
    console.log("Database connected");
  }
});

/* ---------- Serve Files ---------- */

// SVGs
const svgFolder = path.join(__dirname, "../data/svgs");
app.use("/svgs", express.static(svgFolder));

// PNGs
const pngFolder = path.join(__dirname, "../data/images");
app.use("/images", express.static(pngFolder));

// STEP files 
const stepFolder = path.join(__dirname, "../data/ship_symbols");
app.use("/step", express.static(stepFolder));

console.log("Serving SVGs from:", svgFolder);
console.log("Serving PNGs from:", pngFolder);
console.log("Serving STEP files from:", stepFolder);

function fileUrl(route, fileName) {
  return `http://localhost:${PORT}${route}/${encodeURIComponent(fileName)}`;
}

function normalizeCategoryQuery(query) {
  const normalized = String(query || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const aliases = {
    adc: "ADC",
    adcs: "ADC",
    amplifier: "Amplifier",
    amplifiers: "Amplifier",
    battery: "Battery",
    batteries: "Battery",
    resistor: "Resistor",
    resistors: "Resistor",
    ohm: "Resistor",
    ohms: "Resistor",
    resistance: "Resistor",
    capactor: "Capacitor",
    capacator: "Capacitor",
    capacitor: "Capacitor",
    capacitors: "Capacitor",
    condenser: "Capacitor",
    farad: "Capacitor",
    farads: "Capacitor",
    indactor: "Inductor",
    indactors: "Inductor",
    inductor: "Inductor",
    inductors: "Inductor",
    comparator: "Comparator",
    comparators: "Comparator",
    connector: "Connector",
    connectors: "Connector",
    dac: "DAC",
    dacs: "DAC",
    diode: "Diode",
    diodes: "Diode",
    fuse: "Fuse",
    fuses: "Fuse",
    led: "LED",
    leds: "LED",
    logic: "Logic",
    memory: "Memory",
    microcontroller: "Microcontroller",
    microcontrollers: "Microcontroller",
    motor: "Motor",
    motors: "Motor",
    opam: "OpAmp",
    opams: "OpAmp",
    opamp: "OpAmp",
    opamps: "OpAmp",
    operationalamplifier: "OpAmp",
    oscillator: "Oscillator",
    oscillators: "Oscillator",
    power: "Power",
    register: "Register",
    registers: "Register",
    regulator: "Regulator",
    regulators: "Regulator",
    relay: "Relay",
    relays: "Relay", 
    switch: "Switch",
    switches: "Switch",
    transistor: "Transistor",
    transistors: "Transistor",
    transformer: "Transformer",
    transformers: "Transformer",
  };

  return aliases[normalized] || query;
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

function escapeLike(value) {
  return String(value || "").replace(/([_%\\])/g, "\\$1");
}

const CATEGORY_ALIASES = {
  adc: "ADC",
  adcs: "ADC",
  amplifier: "Amplifier",
  amplifiers: "Amplifier",
  battery: "Battery",
  batteries: "Battery",
  resistor: "Resistor",
  resistors: "Resistor",
  resistance: "Resistor",
  capacitor: "Capacitor",
  capacitors: "Capacitor",
  capactor: "Capacitor",
  capacator: "Capacitor",
  condenser: "Capacitor",
  capacitance: "Capacitor",
  inductor: "Inductor",
  inductors: "Inductor",
  indactor: "Inductor",
  indactors: "Inductor",
  inductance: "Inductor",
  choke: "Inductor",
  chokes: "Inductor",
  coil: "Inductor",
  coils: "Inductor",
  comparator: "Comparator",
  comparators: "Comparator",
  connector: "Connector",
  connectors: "Connector",
  dac: "DAC",
  dacs: "DAC",
  diode: "Diode",
  diodes: "Diode",
  fuse: "Fuse",
  fuses: "Fuse",
  led: "LED",
  leds: "LED",
  logic: "Logic",
  memory: "Memory",
  microcontroller: "Microcontroller",
  microcontrollers: "Microcontroller",
  motor: "Motor",
  motors: "Motor",
  opamp: "OpAmp",
  opamps: "OpAmp",
  oscillator: "Oscillator",
  oscillators: "Oscillator",
  power: "Power",
  register: "Register",
  registers: "Register",
  regulator: "Regulator",
  regulators: "Regulator",
  relay: "Relay",
  relays: "Relay",
  switch: "Switch",
  switches: "Switch",
  transistor: "Transistor",
  transistors: "Transistor",
  transformer: "Transformer",
  transformers: "Transformer",
};

const PARAMETER_KIND_BY_CATEGORY = {
  Resistor: ["resistance"],
  Capacitor: ["capacitance"],
  Inductor: ["inductance", "resistance"],
  Amplifier: ["gain"],
  OpAmp: ["gain"],
};

const CATEGORY_SEARCH_TERMS = {
  Resistor: ["resistor", "resistance", "ohm", "ohms"],
  Capacitor: ["capacitor", "capacitance", "farad", "farads"],
  Inductor: ["inductor", "inductance", "choke", "coil", "henry", "henries"],
  Amplifier: ["amplifier", "gain", "decibel", "dB"],
  OpAmp: ["opamp", "op amp", "amplifier", "gain", "decibel", "dB"],
};

function normalizeParameterNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toPrecision(12)).toString();
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

function parameterCanonical(kind, value) {
  const normalized = normalizeParameterNumber(value);
  return normalized ? `${kind}:${normalized}` : null;
}

function parseComponentCategory(query) {
  const text = String(query || "").toLowerCase();
  if (/\bop\s*amp(s)?\b/.test(text) || /\boperational\s+amplifier(s)?\b/.test(text)) {
    return "OpAmp";
  }

  const words = text.match(/[a-z]+/g) || [];
  for (const word of words) {
    if (CATEGORY_ALIASES[word]) return CATEGORY_ALIASES[word];
  }

  return null;
}

function parseParameterValues(text, expectedKinds = []) {
  const values = [];
  const seen = new Set();
  const pattern = /(\d+(?:\.\d+)?)\s*([a-zA-ZµΩ]+(?:\s*ohms?)?|Ω)(?=$|[^a-zA-ZµΩ])/g;

  for (const match of String(text || "").matchAll(pattern)) {
    const unit = normalizeParameterUnit(match[2], expectedKinds);
    if (!unit) continue;

    const baseValue = Number(match[1]) * unit.multiplier;
    const canonical = parameterCanonical(unit.kind, baseValue);
    if (!canonical || seen.has(canonical)) continue;

    seen.add(canonical);
    values.push({
      kind: unit.kind,
      label: unit.label,
      raw: match[0],
      display: `${match[1]}${unit.unit}`,
      canonical,
    });
  }

  return values;
}

function parseParameterSearch(query) {
  const category = parseComponentCategory(query);
  const expectedKinds = category ? PARAMETER_KIND_BY_CATEGORY[category] || [] : [];

  return {
    category,
    values: parseParameterValues(query, expectedKinds),
  };
}

function parameterSearchTerms(query) {
  const text = String(query || "").trim();
  const lower = text.toLowerCase();
  const compact = lower.replace(/\s+/g, "");
  const parsed = parseParameterSearch(text);
  const terms = [text, parsed.category, ...parsed.values.flatMap((value) => [
    value.raw,
    value.display,
    value.raw.replace(/\s+/g, ""),
    value.display.replace(/\s+/g, ""),
  ])];

  const addTerms = (...values) => {
    values.forEach((value) => {
      if (value && !terms.some((term) => term.toLowerCase() === value.toLowerCase())) {
        terms.push(value);
      }
    });
  };

  if (/(^|\d|\s)(m|k|meg)?(ohm|ohms|\u03a9)\b/i.test(text) || lower.includes("ohm")) {
    addTerms("ohm", "ohms", "resistor", "resistance");
  }

  if (/\d+(?:\.\d+)?\s*(p|n|u|\u00b5|m)?f\b/i.test(compact) || /farads?\b/i.test(text)) {
    addTerms("farad", "farads", "capacitor", "capacitance");
  }

  if (/\d+(?:\.\d+)?\s*(n|u|\u00b5|m)?h\b/i.test(compact) || /henr(?:y|ies)\b/i.test(text)) {
    addTerms("henry", "henries", "inductor", "inductance");
  }

  if (/\d+(?:\.\d+)?\s*db\b/i.test(compact) || /\bdb\b/i.test(text)) {
    addTerms("dB", "decibel", "gain", "attenuation", "amplifier", "filter");
  }

  if (parsed.category && CATEGORY_SEARCH_TERMS[parsed.category]) {
    addTerms(...CATEGORY_SEARCH_TERMS[parsed.category]);
  }

  return terms.filter(Boolean); 
}

const licenseFilePath = path.join(__dirname, "../data/symbols/LICENSE.md");

function plainMarkdown(text) {
  return String(text || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[_*`#>-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readLicenseInfo() {
  const fallbackAnalysis = {
    license_name: "Creative Commons CC-BY-SA 4.0 with KiCad exception",
    license_type: "CC-BY-SA-4.0 with KiCad exception",
    category: "Share-alike content license with KiCad design exception",
    commercial_use: true,
    private_use: true,
    redistribution:
      "Redistributed KiCad library collections, including modified collections, must be shared under the same license and retain attribution/license documents.",
    attribution_required: true,
  };

  const fallback = {
    title: "KiCad Libraries License",
    name: "Creative Commons CC-BY-SA 4.0 with KiCad exception",
    license_type: "CC-BY-SA-4.0 with KiCad exception",
    url: "https://creativecommons.org/licenses/by-sa/4.0/legalcode",
    source_file: "data/symbols/LICENSE.md",
    summary:
      "KiCad library data can be used in commercial, closed, and non-commercial designs without requiring design files to use the same license.",
    attribution_required: true,
    attribution_requirements:
      "Attribution/license documents must be retained when redistributing KiCad libraries or modified library collections. Attribution is not required inside designs that merely use the library data.",
    exception:
      "The KiCad exception waives share-alike requirements for electronic designs and generated files that use the library data.",
    redistribution:
      "Redistributed KiCad library collections, including modified collections, must be shared under the same license and retain attribution/license documents.",
    warranty: "Provided without warranty of any kind.",
    license_analysis: fallbackAnalysis,
    full_text: "",
  };

  try {
    const fullText = fs.readFileSync(licenseFilePath, "utf8");
    const lines = fullText.split(/\r?\n/).map((line) => line.trim());
    const title = plainMarkdown(lines.find((line) => line.startsWith("###")) || fallback.title);
    const licenseLine = lines.find((line) => line.includes("Creative Commons CC-BY-SA 4.0 License"));
    const exceptionLine = lines.find((line) => line.includes("waives article 3"));
    const summaryLine = lines.find((line) => line.includes("free use of library data"));
    const redistributionLine = lines.find((line) => line.includes("if you wish to redistribute"));
    const warrantyLine = lines.find((line) => line.includes("provided without warranty"));
    const commercialUse = fullText.includes("commercial, closed, and non-commercial projects without restriction");
    const privateUse = fullText.includes("your own projects without the obligation to share your project files");
    const attributionRequired = fullText.includes("retain attribution information");
    const licenseName = licenseLine
      ? "Creative Commons CC-BY-SA 4.0 with KiCad exception"
      : fallback.name;
    const licenseType = licenseLine
      ? "CC-BY-SA-4.0 with KiCad exception"
      : fallback.license_type;
    const redistribution = plainMarkdown(redistributionLine) || fallback.redistribution;

    return {
      ...fallback,
      title,
      name: licenseName,
      license_type: licenseType,
      summary: plainMarkdown(summaryLine) || fallback.summary,
      exception: plainMarkdown(exceptionLine) || fallback.exception,
      redistribution,
      warranty: plainMarkdown(warrantyLine) || fallback.warranty,
      license_analysis: {
        license_name: licenseName,
        license_type: licenseType,
        category: exceptionLine
          ? "Share-alike content license with KiCad design exception"
          : fallbackAnalysis.category,
        commercial_use: commercialUse || fallbackAnalysis.commercial_use,
        private_use: privateUse || fallbackAnalysis.private_use,
        redistribution,
        attribution_required: attributionRequired || fallbackAnalysis.attribution_required,
      },
      full_text: fullText,
    };
  } catch (error) {
    console.log("License read error:", error.message);
    return fallback;
  }
}

const kicadLicenseInfo = readLicenseInfo();

function licenseInfoForSymbol(row = {}) {
  const license = String(row.license || "").trim();
  const hasSvgAsset = Boolean(row.svg_path || row.svg_file);
  const isExplicitKicadLicense =
    license === kicadLicenseInfo.name || license === kicadLicenseInfo.license_type;
  const isLegacyKicadSvgLicense = license === "Open/Generic" && hasSvgAsset;

  if (isExplicitKicadLicense || isLegacyKicadSvgLicense) {
    return kicadLicenseInfo;
  }

  return {
    title: "Symbol License",
    name: license || "Not specified",
    license_type: license || "Not specified",
    url: "",
    source_file: "",
    summary: "",
    attribution_required: false,
    attribution_requirements: "No attribution requirements were found in the backend metadata for this SVG.",
    exception: "",
    redistribution: "",
    warranty: "",
    license_analysis: {
      license_name: license || "Not specified",
      license_type: license || "Not specified",
      category: "Unknown",
      commercial_use: false,
      private_use: false,
      redistribution: "",
      attribution_required: false,
    },
    full_text: "",
  };
}

/* ---------- Ship Parts  ---------- */

const shipParts = [
  {
    id: "1",
    symbol_name: "BMB Pump",
    category: "Mechanical",
    png_url: `http://localhost:${PORT}/images/bmb.png`,
    step_url: `http://localhost:${PORT}/step/BMB.step`,
  },

  {
    id: "2",
    symbol_name: "Valve",
    category: "Piping",
    png_url: `http://localhost:${PORT}/images/valve.png`,
    step_url: `http://localhost:${PORT}/step/valve.step`,
  },

  {
    id: "3",
    symbol_name: "Flowjet",
    category: "Piping",
    png_url: `http://localhost:${PORT}/images/Flowjet.png`,
    step_url: `http://localhost:${PORT}/step/Flowjet.step`,
  },

  {
    id: "4",
    symbol_name: "Last Model",
    category: "Structure",
    png_url: `http://localhost:${PORT}/images/last1.png`,
    step_url: `http://localhost:${PORT}/step/last1.step`,
  },

  {
    id: "5",
    symbol_name: "Shaft",
    category: "Mechanical",
    png_url: `http://localhost:${PORT}/images/shaft.png`,
    step_url: `http://localhost:${PORT}/step/shaft.step`,
  },

  {
    id: "6",
    symbol_name: "Rudder Base",
    category: "Structure",
    png_url: `http://localhost:${PORT}/images/rudder_base.png`,
    step_url: `http://localhost:${PORT}/step/rudder_base.step`,
  },

  {
    id: "7",
    symbol_name: "Anchor Bracket",
    category: "Structure",
    png_url: `http://localhost:${PORT}/images/anchor_bracket.png`,
    step_url: `http://localhost:${PORT}/step/anchor_bracket.step`,
  },

  {
    id: "8",
    symbol_name: "Navigation Light",
    category: "Electrical",
    png_url: `http://localhost:${PORT}/images/nav_light.png`,
    step_url: `http://localhost:${PORT}/step/NAV LIGHT.step`,
  },

  {
    id: "9",
    symbol_name: "Smiglo",
    category: "Mechanical",
    png_url: `http://localhost:${PORT}/images/Smiglo.png`,
    step_url: `http://localhost:${PORT}/step/Smiglo.step`,
  },

  {
    id: "10",
    symbol_name: "Hibbeler Plate",
    category: "Structure",
    png_url: `http://localhost:${PORT}/images/hibbeler_plate.png`,
    step_url: `http://localhost:${PORT}/step/hibbeler_plate.step`,
  },

  {
    id: "11",
    symbol_name: "Pipe Elbow",
    category: "Piping",
    png_url: `http://localhost:${PORT}/images/pipe_elbow.png`,
    step_url: `http://localhost:${PORT}/step/pipe_elbow.step`,
  },

  {
    id: "12",
    symbol_name: "Tee Joint",
    category: "Piping",
    png_url: `http://localhost:${PORT}/images/tee_joint.png`,
    step_url: `http://localhost:${PORT}/step/tee_joint.step`,
  },

  {
    id: "13",
    symbol_name: "Flange",
    category: "Piping",
    png_url: `http://localhost:${PORT}/images/Flange.png`,
    step_url: `http://localhost:${PORT}/step/Flange.step`,
  },

  {
    id: "14",
    symbol_name: "Cable Ladder",
    category: "Structure",
    png_url: `http://localhost:${PORT}/images/Cable ladder.png`,
    step_url: `http://localhost:${PORT}/step/Cable ladder.step`,
  },

  {
    id: "15",
    symbol_name: "gearbox",
    category: "Mechanical",
    png_url: `http://localhost:${PORT}/images/gearbox.png`,
    step_url: `http://localhost:${PORT}/step/gear.step`,
  },

  {
    id: "16",
    symbol_name: "Fuel Pump",
    category: "Mechanical",
    png_url: `http://localhost:${PORT}/images/fuelPump.png`,
    step_url: `http://localhost:${PORT}/step/fuelPump.step`,
  },

  {
    id: "17",
    symbol_name: "Assembly",
    category: "Structure",
    png_url: `http://localhost:${PORT}/images/assembly.png`,
    step_url: `http://localhost:${PORT}/step/final assembly.step`,
  },

  {
    id: "18",
    symbol_name: "Winch",
    category: "Mechanical",
    png_url: `http://localhost:${PORT}/images/winch.png`,
    step_url: `http://localhost:${PORT}/step/12V Mini Winch v1.step`,
  },

  {
    id: "19",
    symbol_name: "Deck Plate",
    category: "Structure",
    png_url: `http://localhost:${PORT}/images/deck_plate.png`,
    step_url: `http://localhost:${PORT}/step/2T_DECK_PLATE.step`,
  },

  {
    id: "20",
    symbol_name: "Bulkhead Plug Box",
    category: "Structure",
    png_url: `http://localhost:${PORT}/images/bulkhead_plugbox.png`,
    step_url: `http://localhost:${PORT}/step/BulkHead Plug Back Box.step`,
  },

  {
    id: "21",
    symbol_name: "Rocket Nozzle",
    category: "Mechanical",
    png_url: `http://localhost:${PORT}/images/rocket_nozzle.png`,
    step_url: `http://localhost:${PORT}/step/rocket_nozzle.step`,
  },

  {
    id: "22",
    symbol_name: "Pump Housing",
    category: "Mechanical",
    png_url: `http://localhost:${PORT}/images/pumpengehÃ¤use.png`,
    step_url: `http://localhost:${PORT}/step/PumpengehÃ¤use.step`,
  },

  {
    id: "23",
    symbol_name: "Anchor Chain",
    category: "Mechanical",
    png_url: `http://localhost:${PORT}/images/anchor_chain.png`,
    step_url: `http://localhost:${PORT}/step/anchor_chain.step`,
  },

  {
    id: "24",
    symbol_name: "ship structure",
    category: "Mechanical",
    png_url: `http://localhost:${PORT}/images/ship_structure.png`,
    step_url: `http://localhost:${PORT}/step/ship_structure.step`,
  },
];

const shipStepFiles = {
  "1": "BMB.STEP",
  "2": "valve of force chest pump.stp",
  "3": "Flowjet Pump-Filter-Elbow Assembly.STEP",
  "4": "last1 (1).STEP",
  "5": "COUPLING SHAFT (1).step",
  "6": "rudder_base_v2 (1).stp",
  "7": "Model Anchor Bracket in FreeCAD-Body (1).step",
  "8": "NAV LIGHT.stp",
  "9": "Smiglo.STEP",
  "10": "Hibbeler_Example_1_2 (1).stp",
  "11": "pipe_elbow.STEP",
  "12": "tee_joint.stp",
  "13": "Flange.STEP",
  "14": "Cable ladder.STEP",
  "16": "fuelPump.STEP",
  "17": "assembly.STEP",
  "18": "Winch.step",
  "19": "DECK PLATE.stp",
  "20": "BulkHead Plug Back Box.step",
  "21": "rocket_nozzle.step",
  "22": "pump_housing.stp",
  "23": "anchor_chain.stp",
  "24": "ship_structutre.STEP",
};

function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;

  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Keep going and split plain text tags below.
  }

  return String(tags)
    .split(/[,;]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function ratingValue(textValue, numericValue) {
  if (textValue !== undefined && textValue !== null && textValue !== "") {
    return textValue;
  }

  if (numericValue !== undefined && numericValue !== null && numericValue !== 0) {
    return numericValue;
  }

  return "";
}

function cleanValue(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function isKnownValue(value) {
  const text = cleanValue(value);
  return text && text !== "0" && text.toLowerCase() !== "yes";
}

function addComponentValue(values, seen, label, value) {
  const clean = cleanValue(value);
  if (!clean) return;

  const key = `${label}:${clean}`.toLowerCase();
  if (seen.has(key)) return;

  seen.add(key);
  values.push({ label, value: clean });
}

function addMatches(values, seen, text, label, pattern) {
  for (const match of String(text || "").matchAll(pattern)) {
    addComponentValue(values, seen, label, match[0]);
  }
}

function componentValues(row) {
  const values = [];
  const seen = new Set();
  const categoryKey = String(row.category || "").toLowerCase();
  const text = [
    row.symbol_name,
    row.base_name,
    row.category,
    row.device_type,
    row.description,
    row.keywords,
    row.tags,
    row.package,
  ]
    .filter(Boolean)
    .join(" ");

  if (categoryKey === "connector") {
    if (isKnownValue(row.pin_count)) addComponentValue(values, seen, "Pins", row.pin_count);
  }

  if (isKnownValue(row.voltage)) addComponentValue(values, seen, "Voltage", row.voltage);
  if (isKnownValue(row.current)) addComponentValue(values, seen, "Current", row.current);
  if (isKnownValue(row.power)) addComponentValue(values, seen, "Power", row.power);

  parseParameterValues(text).forEach((value) => {
    addComponentValue(values, seen, value.label, value.display);
  });

  if (/\bunity gain\b/i.test(text)) addComponentValue(values, seen, "Gain", "Unity gain");

  return values;
}

function rowTags(row) {
  const tags = normalizeTags(row.tags);
  if (tags.length) return tags;

  return normalizeTags(row.keywords || row.description || row.category);
}

function publicSvgUrl(row) {
  const svgPath = row.svg_path || row.svg_file;
  if (!svgPath) return fileUrl("/svgs", "default.svg");
  return fileUrl("/svgs", path.basename(svgPath));
}

function normalizeDbRow(row) {
  const licenseInfo = licenseInfoForSymbol(row);
  const category = row.category || "";

  return {
    id: row.id ?? row.kid_symbol,
    symbol_name: row.symbol_name || row.name || row.base_name || "",
    svg_url: publicSvgUrl(row),
    company: row.company || "",
    category,
    unit: row.unit || unitForCategory(category),
    description: row.description || "",
    keywords: row.keywords || "",
    package: row.package || "",
    pin_count: row.pin_count ?? "",
    mount_type: row.mount_type || "",
    voltage_rating: ratingValue(row.voltage, row.voltage_rating),
    current_rating: ratingValue(row.current, row.current_rating),
    power_rating: ratingValue(row.power, row.power_rating),
    voltage: ratingValue(row.voltage, row.voltage_rating),
    current: ratingValue(row.current, row.current_rating),
    power: ratingValue(row.power, row.power_rating),
    component_values: componentValues(row),
    datasheet: row.datasheet || "",
    tags: rowTags(row),
    license: licenseInfo.name,
    license_info: licenseInfo,
    license_analysis: licenseInfo.license_analysis,
  };
}

function normalizeShipPart(item) {
  const stepFile = shipStepFiles[item.id];

  return {
    company: "",
    unit: "",
    package: "",
    pin_count: "",
    mount_type: "",
    voltage_rating: "",
    current_rating: "",
    power_rating: "",
    voltage: "",
    current: "",
    power: "",
    datasheet: "",
    description: "",
    tags: [],
    license: "Local/Open",
    license_info: {
      title: "Local Ship Part Asset",
      name: "Local/Open",
      license_type: "Local/Open",
      url: "",
      source_file: "",
      summary: "This asset is served from the local ship parts dataset.",
      attribution_required: false,
      attribution_requirements: "No attribution requirements were found in the backend metadata for this local asset.",
      exception: "",
      redistribution: "Check the source model before redistributing outside this app.",
      warranty: "Provided without warranty of any kind.",
      license_analysis: {
        license_name: "Local/Open",
        license_type: "Local/Open",
        category: "Local asset",
        commercial_use: false,
        private_use: true,
        redistribution: "Check the source model before redistributing outside this app.",
        attribution_required: false,
      },
      full_text: "",
    },
    ...item,
    step_url: stepFile ? fileUrl("/step", stepFile) : item.step_url || null,
  };
}

function searchableRowText(row) {
  return [
    row.symbol_name,
    row.base_name,
    row.name,
    row.category,
    row.device_type,
    row.description,
    row.keywords,
    row.tags,
    row.package,
    row.contents,
    row.voltage,
    row.current,
    row.power,
  ]
    .filter(Boolean)
    .join(" ");
}

function rowMatchesComponentCategory(row, category) {
  if (!category) return true;
  if (String(row.category || "").toLowerCase() === category.toLowerCase()) return true;

  const text = searchableRowText(row).toLowerCase();
  if (category === "Capacitor") return /\b(capacitors?|capacitance|farads?)\b/i.test(text);
  if (category === "Inductor") return /\b(inductors?|inductance|chokes?|coils?|ferrite)\b/i.test(text);
  if (category === "OpAmp") return /\b(op\s*amps?|operational\s+amplifiers?)\b/i.test(text);

  return false;
}

function rowMatchesParameterSearch(row, parsedSearch) {
  if (!parsedSearch.category && parsedSearch.values.length === 0) return true;
  if (!rowMatchesComponentCategory(row, parsedSearch.category)) return false;
  if (parsedSearch.values.length === 0) return true;

  const expectedKinds = parsedSearch.category
    ? PARAMETER_KIND_BY_CATEGORY[parsedSearch.category] || []
    : [];
  const rowValues = parseParameterValues(searchableRowText(row), expectedKinds);
  const rowCanonicalValues = new Set(rowValues.map((value) => value.canonical));

  return parsedSearch.values.every((value) => rowCanonicalValues.has(value.canonical));
}

/* ---------- Search API ---------- */

app.get("/api/search", (req, res) => {
  const q = req.query.q || "";

  const queryText = normalizeCategoryQuery(q);
  const parsedSearch = parseParameterSearch(q);
  const searchTerms = parameterSearchTerms(queryText);
  const searchColumns = [
    "kid_symbol",
    "symbol_name",
    
    "company",
    "category",
    "unit",
    
    "description",
    "package",
    "keywords",
    "tags",
    "voltage",
    "current",
    "power",
    "contents",
    "license",
  ];
  const searchClauses = searchTerms
    .map(() =>
      searchColumns
        .map((column) => `LOWER(${column}) LIKE LOWER(?) ESCAPE '\\'`)
        .join("\n      OR "),
    )
    .join("\n      OR ");
  const searchParams = searchTerms.flatMap((term) =>
    searchColumns.map(() => `%${escapeLike(term)}%`),
  );
  const search = `%${escapeLike(queryText)}%`;
  const exactCategory = queryText.trim();

  const sql = `
    SELECT *
    FROM symbols
    WHERE (
      ${searchClauses}
    )
    ORDER BY
      CASE
        WHEN LOWER(category) = LOWER(?) THEN 0
        WHEN CAST(kid_symbol AS TEXT) = ? THEN 1
        WHEN LOWER(category) LIKE LOWER(?) ESCAPE '\\' THEN 2
        WHEN LOWER(symbol_name) LIKE LOWER(?) ESCAPE '\\' THEN 3
        ELSE 3
      END,
      symbol_name
    LIMIT ${parsedSearch.values.length ? 2000 : 500}
  `;

  db.all(
    sql,
    [
      ...searchParams,
      exactCategory,
      exactCategory,
      search,
      search,
    ],
    (err, rows) => {
    if (err) {
      console.log("Search error:", err.message);
      return res.status(500).json({ error: "Database error" });
    }

    const dbResults = rows
      .filter((row) => rowMatchesParameterSearch(row, parsedSearch))
      .slice(0, 500)
      .map(normalizeDbRow);

    let filteredShipParts;

    if (q.toLowerCase() === "ship_parts") {
      // Return ALL ship parts
      filteredShipParts = shipParts;
    } else {
      // Normal search
      filteredShipParts = shipParts.filter((item) =>
        item.symbol_name.toLowerCase().includes(q.toLowerCase()),
      );
    }
    res.json([...filteredShipParts.map(normalizeShipPart), ...dbResults]);
    },
  );
});

app.get("/api/license", (req, res) => {
  res.json(kicadLicenseInfo);
});

app.get("/api/svg-licenses", (req, res) => {
  db.all(
    "SELECT kid_symbol, symbol_name, license FROM symbols ORDER BY symbol_name",
    [],
    (err, rows) => {
      if (err) {
        console.log("SVG license list error:", err.message);
        return res.status(500).json({ error: "Database error" });
      }

      return res.json(
        rows.map((row) => {
          const licenseInfo = licenseInfoForSymbol(row);

          return {
            id: row.kid_symbol,
            symbol_name: row.symbol_name || "",
            license: licenseInfo.name,
            license_type: licenseInfo.license_type,
            license_analysis: licenseInfo.license_analysis,
            attribution_required: licenseInfo.attribution_required,
            attribution_requirements: licenseInfo.attribution_requirements,
          };
        }),
      );
    },
  );
});

app.get("/api/symbol/:id", (req, res) => {
  const id = req.params.id;
  const shipPart = shipParts.find((item) => item.id === id);

  if (shipPart) {
    return res.json(normalizeShipPart(shipPart));
  }

  db.get("SELECT * FROM symbols WHERE kid_symbol = ? LIMIT 1", [id], (err, row) => {
    if (err) {
      console.log("Symbol detail error:", err.message);
      return res.status(500).json({ error: "Database error" });
    }

    if (!row) {
      return res.status(404).json({ error: "Symbol not found" });
    }

    return res.json(normalizeDbRow(row));
  });
});

app.get("/", (req, res) => {
  res.send("Server is running properly ");
});

/* ---------- Start server ---------- */

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

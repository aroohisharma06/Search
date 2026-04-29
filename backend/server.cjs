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

// STEP files (NEW )
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
    resistor: "Resistor",
    resistors: "Resistor",
    capactor: "Capacitor",
    capacator: "Capacitor",
    capacitor: "Capacitor",
    capacitors: "Capacitor",
    condenser: "Capacitor",
    indactor: "Inductor",
    indactors: "Inductor",
    inductor: "Inductor",
    inductors: "Inductor",
    opam: "OpAmp",
    opams: "OpAmp",
    opamp: "OpAmp",
    opamps: "OpAmp",
    operationalamplifier: "OpAmp",
  };

  return aliases[normalized] || query;
}

/* ---------- Ship Parts (LOCAL DATA) ---------- */

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
  return {
    id: row.id ?? row.kid_symbol,
    kid_symbol: row.kid_symbol ?? row.id,
    symbol_name: row.symbol_name || row.name || row.base_name || "",
    name: row.name || "",
    base_name: row.base_name || "",
    name_and_path: row.name_and_path || "",
    kicad_file: row.kicad_file || "",
    svg_file: row.svg_file || "",
    svg_path: row.svg_path || "",
    svg_url: publicSvgUrl(row),
    company: row.company || "",
    category: row.category || "",
    subcategory: row.subcategory || "",
    device_type: row.device_type || "",
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
    datasheet: row.datasheet || "",
    simulation_available: Boolean(row.simulation_available),
    simulation_parameters: row.simulation_parameters || "",
    tags: rowTags(row),
    license: row.license || "Open/Generic",
  };
}

function normalizeShipPart(item) {
  const stepFile = shipStepFiles[item.id];

  return {
    company: "",
    device_type: "Ship Part",
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
    simulation_available: false,
    tags: [],
    license: "Local/Open",
    ...item,
    step_url: stepFile ? fileUrl("/step", stepFile) : item.step_url || null,
  };
}

function isMissingSymbolInfo(item) {
  const missing = (value) =>
    value === undefined ||
    value === null ||
    value === "" ||
    value === 0 ||
    value === "SVG" ||
    value === "SVG image from svgs folder";

  return (
    missing(item.description) ||
    missing(item.category) ||
    missing(item.device_type) ||
    missing(item.tags) ||
    (Array.isArray(item.tags) && item.tags.length === 0)
  );
}

function cleanLlmString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLlmInfo(info, fallbackName) {
  const tags = Array.isArray(info.tags)
    ? info.tags.map(cleanLlmString).filter(Boolean).slice(0, 8)
    : [];

  return {
    symbol_name: cleanLlmString(info.symbol_name) || fallbackName,
    company: cleanLlmString(info.company),
    category: cleanLlmString(info.category) || "Electronic Symbol",
    subcategory: cleanLlmString(info.subcategory),
    device_type: cleanLlmString(info.device_type) || "Component",
    description:
      cleanLlmString(info.description) ||
      `Likely electronic schematic symbol for ${fallbackName}.`,
    keywords: cleanLlmString(info.keywords),
    package: cleanLlmString(info.package),
    pin_count: cleanLlmString(info.pin_count),
    mount_type: cleanLlmString(info.mount_type),
    voltage_rating: cleanLlmString(info.voltage_rating),
    current_rating: cleanLlmString(info.current_rating),
    power_rating: cleanLlmString(info.power_rating),
    datasheet: cleanLlmString(info.datasheet),
    tags: tags.length ? tags : ["AI inferred", fallbackName].filter(Boolean),
    license: "AI inferred",
    llm_generated: true,
  };
}

function inferSymbolInfoFromName(name, svgText = "") {
  const rawName = String(name || "Unknown SVG").replace(/\.svg$/i, "");
  const compactName = rawName.toLowerCase();
  const text = `${compactName} ${svgText.toLowerCase()}`;

  const rules = [
    ["resistor", /(^|[_\-\s])r(es)?\d*|resistor|ohm/, "Passive", "Resistor"],
    ["capacitor", /(^|[_\-\s])c\d*|capacitor|capacit/, "Passive", "Capacitor"],
    ["inductor", /(^|[_\-\s])l\d*|inductor|coil/, "Passive", "Inductor"],
    ["diode", /diode|led|zener|schottky|rectifier/, "Semiconductor", "Diode"],
    ["transistor", /transistor|mosfet|bjt|fet|igbt/, "Semiconductor", "Transistor"],
    ["connector", /conn|connector|header|jack|usb|terminal/, "Connector", "Connector"],
    ["amplifier", /opamp|amplifier|amp|comparator/, "Analog", "Amplifier"],
    ["microcontroller", /mcu|microcontroller|stm32|atmega|pic\d|esp32|nrf/, "IC", "Microcontroller"],
    ["power", /power|vcc|gnd|\+\d+v|-\d+v|battery/, "Power", "Power Symbol"],
  ];

  const match = rules.find(([, regex]) => regex.test(text));
  const category = match ? match[2] : "Electronic Symbol";
  const deviceType = match ? match[3] : "Component";

  return normalizeLlmInfo(
    {
      symbol_name: rawName,
      category,
      device_type: deviceType,
      description: `Likely ${deviceType.toLowerCase()} schematic symbol inferred from the SVG filename and drawing content.`,
      keywords: [rawName, category, deviceType].join(", "),
      tags: ["AI inferred", category, deviceType],
    },
    rawName,
  );
}

function responseText(responseJson) {
  if (typeof responseJson.output_text === "string") return responseJson.output_text;

  for (const output of responseJson.output || []) {
    for (const content of output.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return "";
}

function findSvgFile(input) {
  const candidates = [
    input.svg_file,
    input.svg_path,
    input.svg_url,
    input.symbol_name ? `${input.symbol_name}.svg` : "",
  ]
    .filter(Boolean)
    .map((value) => path.basename(String(value)));

  for (const fileName of candidates) {
    const filePath = path.resolve(svgFolder, fileName);
    if (filePath.startsWith(svgFolder) && fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return "";
}

async function generateSvgInfoWithLlm(input) {
  const fallbackName =
    cleanLlmString(input.symbol_name) ||
    cleanLlmString(input.svg_file).replace(/\.svg$/i, "") ||
    "Unknown SVG";
  const svgFile = findSvgFile(input);
  const svgText = svgFile ? fs.readFileSync(svgFile, "utf8").slice(0, 12000) : "";
  const heuristicInfo = inferSymbolInfoFromName(fallbackName, svgText);

  if (!process.env.OPENAI_API_KEY) {
    return {
      ...heuristicInfo,
      llm_source: "local-inference",
      llm_note: "Set OPENAI_API_KEY on the backend to enable live LLM enrichment.",
    };
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    required: [
      "symbol_name",
      "company",
      "category",
      "subcategory",
      "device_type",
      "description",
      "keywords",
      "package",
      "pin_count",
      "mount_type",
      "voltage_rating",
      "current_rating",
      "power_rating",
      "datasheet",
      "tags",
    ],
    properties: {
      symbol_name: { type: "string" },
      company: { type: "string" },
      category: { type: "string" },
      subcategory: { type: "string" },
      device_type: { type: "string" },
      description: { type: "string" },
      keywords: { type: "string" },
      package: { type: "string" },
      pin_count: { type: "string" },
      mount_type: { type: "string" },
      voltage_rating: { type: "string" },
      current_rating: { type: "string" },
      power_rating: { type: "string" },
      datasheet: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
    },
  };

  try {
    const llmResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions:
          "You identify electronic schematic SVG symbols. Return concise metadata only. If a value is unknown, use an empty string instead of guessing exact electrical ratings or datasheet URLs.",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  known: input,
                  svg_file: svgFile ? path.basename(svgFile) : "",
                  svg_excerpt: svgText,
                }),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "svg_symbol_info",
            strict: true,
            schema,
          },
        },
      }),
    });

    if (!llmResponse.ok) {
      throw new Error(`OpenAI request failed: ${llmResponse.status}`);
    }

    const llmJson = await llmResponse.json();
    const parsed = JSON.parse(responseText(llmJson));

    return {
      ...heuristicInfo,
      ...normalizeLlmInfo(parsed, fallbackName),
      llm_source: "openai",
    };
  } catch (error) {
    console.log("LLM SVG info error:", error.message);
    return {
      ...heuristicInfo,
      llm_source: "local-inference",
      llm_note: "Live LLM enrichment failed; returned local filename/SVG inference.",
    };
  }
}

/* ---------- Search API ---------- */

app.get("/api/search", (req, res) => {
  const q = req.query.q || "";

  const queryText = normalizeCategoryQuery(q);
  const escapedQuery = queryText.replace(/([_%\\])/g, "\\$1");
  const search = `%${escapedQuery}%`;
  const exactCategory = queryText.trim();

  const sql = `
    SELECT *
    FROM symbols
    WHERE (
      LOWER(symbol_name) LIKE LOWER(?) ESCAPE '\\'
      OR LOWER(base_name) LIKE LOWER(?) ESCAPE '\\'
      OR LOWER(company) LIKE LOWER(?) ESCAPE '\\'
      OR LOWER(category) LIKE LOWER(?) ESCAPE '\\'
      OR LOWER(device_type) LIKE LOWER(?) ESCAPE '\\'
      OR LOWER(description) LIKE LOWER(?) ESCAPE '\\'
      OR LOWER(package) LIKE LOWER(?) ESCAPE '\\'
    )
    ORDER BY
      CASE
        WHEN LOWER(category) = LOWER(?) THEN 0
        WHEN LOWER(category) LIKE LOWER(?) ESCAPE '\\' THEN 1
        WHEN LOWER(symbol_name) LIKE LOWER(?) ESCAPE '\\' THEN 2
        ELSE 3
      END,
      symbol_name
    LIMIT 500
  `;

  db.all(
    sql,
    [
      search,
      search,
      search,
      search,
      search,
      search,
      search,
      exactCategory,
      search,
      search,
    ],
    (err, rows) => {
    if (err) {
      console.log("Search error:", err.message);
      return res.status(500).json({ error: "Database error" });
    }

    const dbResults = rows.map(normalizeDbRow);

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

app.post("/api/llm/svg-info", async (req, res) => {
  try {
    const info = await generateSvgInfoWithLlm(req.body || {});
    return res.json(info);
  } catch (error) {
    console.log("SVG LLM endpoint error:", error.message);
    return res.status(500).json({ error: "Unable to generate SVG info" });
  }
});

app.get("/api/symbol/:id", (req, res) => {
  const id = req.params.id;
  const shipPart = shipParts.find((item) => item.id === id);

  if (shipPart) {
    return res.json(normalizeShipPart(shipPart));
  }

  db.get("SELECT * FROM symbols WHERE kid_symbol = ? LIMIT 1", [id], async (err, row) => {
    if (err) {
      console.log("Symbol detail error:", err.message);
      return res.status(500).json({ error: "Database error" });
    }

    if (!row) {
      return res.status(404).json({ error: "Symbol not found" });
    }

    const normalized = normalizeDbRow(row);

    if (!isMissingSymbolInfo(normalized)) {
      return res.json(normalized);
    }

    const llmInfo = await generateSvgInfoWithLlm(normalized);
    return res.json({ ...normalized, ...llmInfo });
  });
});

app.get("/", (req, res) => {
  res.send("Server is running properly ");
});

/* ---------- Start server ---------- */

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

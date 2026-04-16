const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

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
    png_url: `http://localhost:${PORT}/images/pumpengehäuse.png`,
    step_url: `http://localhost:${PORT}/step/Pumpengehäuse.step`,
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

/* ---------- Search API ---------- */

app.get("/api/search", (req, res) => {
  const q = req.query.q || "";

  const escapedQuery = q.replace(/([_%\\])/g, "\\$1");
  const search = `%${escapedQuery}%`;

  const sql = `
    SELECT *
    FROM symbols
    WHERE (
      LOWER(symbol_name) LIKE LOWER(?) ESCAPE '\\'
      OR LOWER(category) LIKE LOWER(?) ESCAPE '\\'
      OR LOWER(device_type) LIKE LOWER(?) ESCAPE '\\'
    )
    LIMIT 50
  `;

  db.all(sql, [search, search, search], (err, rows) => {
    if (err) {
      console.log("Search error:", err.message);
      return res.status(500).json({ error: "Database error" });
    }

    const dbResults = rows.map((row) => {
      let svg_url;

      if (row.svg_file) {
        const fileName = path.basename(row.svg_file);
        svg_url = `http://localhost:${PORT}/svgs/${encodeURIComponent(fileName)}`;
      } else {
        svg_url = `http://localhost:${PORT}/svgs/default.svg`;
      }

      return {
        id: row.id,
        symbol_name: row.symbol_name ?? "",
        svg_url,
        category: row.category ?? "",
        device_type: row.device_type ?? "",
        description: row.description ?? "",
      };
    });

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
    res.json([...filteredShipParts, ...dbResults]);
  });
});

app.get("/", (req, res) => {
  res.send("Server is running properly ");
});

/* ---------- Start server ---------- */

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

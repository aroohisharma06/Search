import { useEffect, useState } from "react";

interface SymbolItem {
  id: number | string;
  kid_symbol?: number | string;
  symbol_name: string;
  svg_url?: string;
  png_url?: string;
  step_url?: string | null;
  description?: string;
  company?: string;
  category?: string;
  subcategory?: string;
  device_type?: string;
  voltage_rating?: number;
  current_rating?: number;
  power_rating?: number;
  voltage?: string | number;
  current?: string | number;
  power?: string | number;
  package?: string;
  pin_count?: number;
  mount_type?: string;
  datasheet?: string;
  simulation_available?: boolean;
  tags?: string[];
  license?: string;
  llm_generated?: boolean;
  llm_source?: string;
  llm_note?: string;
  _uid?: string;
  _time?: number;
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CloseIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolItem[]>([]);
  const [selected, setSelected] = useState<SymbolItem | null>(null);
  const [recent, setRecent] = useState<SymbolItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const isHome = !hasSearched;

  const getUniqueId = (item: SymbolItem) =>
    (item.id ?? item.kid_symbol ?? "") +
    "_" +
    item.symbol_name +
    "_" +
    (item.png_url || item.svg_url || "");

  const getImageUrl = (item: SymbolItem) => item.png_url || item.svg_url || "";

  const showValue = (value: unknown) => {
    if (value === undefined || value === null || value === "" || value === 0) {
      return "-";
    }

    return String(value);
  };

  const showMeta = (value: unknown) => {
    if (value === undefined || value === null || value === "" || value === 0) {
      return "Not specified";
    }

    return String(value);
  };

  const showRating = (value: unknown, unit: string) => {
    if (value === undefined || value === null || value === "" || value === 0) {
      return "Not specified";
    }

    const text = String(value);
    return /[a-zA-Z]/.test(text) ? text : `${text} ${unit}`;
  };

  const hasMissingInfo = (item: SymbolItem) => {
    const missing = (value: unknown) =>
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
      !item.tags?.length
    );
  };

  const enrichWithLlm = (item: SymbolItem) => {
    if (aiLoading) return;

    setAiLoading(true);

    fetch("http://localhost:3000/api/llm/svg-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data === "object") {
          const enriched = { ...item, ...data };
          setSelected((current) =>
            current && getUniqueId(current) === getUniqueId(item)
              ? { ...current, ...data }
              : current,
          );
          saveRecent(enriched);
        }
      })
      .finally(() => setAiLoading(false));
  };

  const openItem = (item: SymbolItem) => {
    saveRecent(item);
    setSelected(item);

    fetch(`http://localhost:3000/api/symbol/${encodeURIComponent(item.id)}`)
      .then((res) => (res.ok ? res.json() : item))
      .then((data) => {
        if (data && typeof data === "object") {
          const fullItem = { ...item, ...data };
          setSelected(fullItem);
          saveRecent(fullItem);
          if (hasMissingInfo(fullItem)) enrichWithLlm(fullItem);
        }
      })
      .catch(() => {
        setSelected(item);
        enrichWithLlm(item);
      });
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark";
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const saved = localStorage.getItem("recently-viewed");
    if (saved) {
      try {
        setRecent(JSON.parse(saved));
      } catch {
        setRecent([]);
      }
    }
  }, []);

  useEffect(() => {
    if (!selected) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

  const fetchResults = () => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      return;
    }

    setHasSearched(true);
    setLoading(true);

    fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(trimmed)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setResults(data);
        else setResults([]);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  };

  const saveRecent = (item: SymbolItem) => {
    const uid = getUniqueId(item);
    const newItem = { ...item, _uid: uid, _time: Date.now() };

    setRecent((prev) => {
      const filtered = prev.filter((r) => r._uid !== uid);
      const updated = [newItem, ...filtered].slice(0, 6);
      localStorage.setItem("recently-viewed", JSON.stringify(updated));
      return updated;
    });
  };

  const removeRecent = (uid: string) => {
    setRecent((prev) => {
      const updated = prev.filter((item) => item._uid !== uid);
      localStorage.setItem("recently-viewed", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${
        theme === "light" ? "bg-gray-200 text-black" : "bg-[#0f172a] text-white"
      }`}
    >
      {/* HOME */}
      {isHome ? (
        <div className="flex flex-col items-center justify-center flex-1">
          <h1 className="text-4xl font-bold mb-6">
            <span>Component</span>
            <span className="text-yellow-400">Search</span>
          </h1>

          <div className="w-full max-w-2xl">
            <div className="flex border-2 border-yellow-400 rounded-full overflow-hidden bg-white">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchResults()}
                placeholder="Search components..."
                className="flex-1 px-5 py-3 outline-none"
              />
              <span
                onClick={fetchResults}
                className="px-5 text-gray-700 hover:text-black text-lg flex items-center cursor-pointer"
                role="button"
                aria-label="Search"
              >
                <SearchIcon />
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* NAVBAR */}
          <div className="bg-[#131921] text-white px-4 py-2 flex items-center gap-4">
            <h1 className="text-lg font-bold">
              Component<span className="text-yellow-400">Search</span>
            </h1>

            {/* SEARCH SECTION */}
            <div className="relative flex flex-1 max-w-3xl">
              <div className="flex w-full border-2 border-yellow-400 rounded-md bg-white">
                {/* INPUT  */}
                <div className="relative flex-1">
                  <input
                    value={query}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchResults()}
                    placeholder="Search components..."
                    className="w-full px-3 py-2 pr-12 text-black outline-none"
                  />

                  {query && (
                    <span
                      onClick={() => {
                        setQuery("");
                        setResults([]);
                      }}
                      className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-500 cursor-pointer hover:text-black"
                      role="button"
                      aria-label="Clear search"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </span>
                  )}
                </div>

                {/* SEARCH ICON  */}
                <span
                  onClick={fetchResults}
                  className="px-3 text-gray-700 hover:text-black text-lg flex items-center cursor-pointer"
                  role="button"
                  aria-label="Search"
                >
                  <SearchIcon />
                </span>
              </div>

              {/* DROPDOWN  */}
              {showDropdown && recent.length > 0 && !query && (
                <div className="absolute top-full left-0 w-full bg-white shadow-lg rounded-md mt-1 z-50 border max-h-72 overflow-y-auto">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 border-b">
                    Recently Viewed
                  </div>

                  {recent.map((item) => (
                    <div
                      key={item._uid}
                      className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <div
                        className="flex items-center gap-2 flex-1"
                        onClick={() => {
                          openItem(item);
                          setShowDropdown(false);
                        }}
                      >
                        <img
                          src={getImageUrl(item)}
                          className="w-9 h-9 object-contain bg-gray-50 rounded p-1"
                        />
                        <span className="text-sm text-black">
                          {item.symbol_name}
                        </span>
                      </div>

                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecent(item._uid!);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "black",
                          padding: "0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        aria-label="Remove recent item"
                      >
                        <CloseIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT SIDE */}
            <div className="ml-auto flex items-center gap-3">
              {/* VIEW TOGGLE */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded ${
                    viewMode === "grid"
                      ? "text-yellow-400"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  <div className="grid grid-cols-2 gap-[2px]">
                    <span className="w-2 h-2 bg-current"></span>
                    <span className="w-2 h-2 bg-current"></span>
                    <span className="w-2 h-2 bg-current"></span>
                    <span className="w-2 h-2 bg-current"></span>
                  </div>
                </button>

                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded ${
                    viewMode === "list"
                      ? "text-yellow-400"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  <div className="flex flex-col gap-[3px]">
                    <span className="w-4 h-[2px] bg-current"></span>
                    <span className="w-4 h-[2px] bg-current"></span>
                    <span className="w-4 h-[2px] bg-current"></span>
                  </div>
                </button>
              </div>

              {/* THEME BUTTON */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="px-3 py-1 rounded bg-black text-white"
              >
                {theme === "dark" ? "Light" : "Dark"}
              </button>
            </div>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="text-center py-4 font-bold">Loading...</div>
          )}

          {/* RESULTS  */}
          {results.length > 0 && (
            <div className="px-4 py-4">
              <h2 className="font-bold mb-2">Search Results</h2>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {results.map((item) => (
                    <div
                      key={getUniqueId(item)}
                      onClick={() => {
                        openItem(item);
                      }}
                      className={`border p-2 cursor-pointer hover:shadow-md rounded ${
                        theme === "light" ? "bg-white" : "bg-[#1e293b]"
                      }`}
                    >
                      <div className="h-28 flex items-center justify-center bg-gray-200 rounded mb-1">
                        <img
                          src={getImageUrl(item)}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <p className="text-xs text-center font-semibold truncate">
                        {item.symbol_name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {results.map((item) => (
                    <div
                      key={getUniqueId(item)}
                      onClick={() => openItem(item)}
                      className="flex gap-4 bg-white p-3 rounded cursor-pointer hover:shadow-md"
                    >
                      <img src={getImageUrl(item)} className="w-12" />
                      <div>
                        <p>{item.symbol_name}</p>
                        <p className="text-xs text-gray-500">{item.company}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL  */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-[80%] max-h-[90vh] overflow-y-auto rounded-lg p-6 flex gap-6 ${
              theme === "light"
                ? "bg-white text-black"
                : "bg-[#1e293b] text-white"
            }`}
          >
            <button
              onClick={() => setSelected(null)}
              style={{
                position: "absolute",
                top: "10px",
                right: "15px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "black",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label="Close details"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
            <img
              src={getImageUrl(selected)}
              className="w-1/3 object-contain bg-gray-100"
              onError={(event) => {
                event.currentTarget.style.display = "none";
                enrichWithLlm(selected);
              }}
            />
            <div className="text-sm space-y-4">
              {(aiLoading || selected.llm_generated) && (
                <p
                  className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
                    theme === "light"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-yellow-400/20 text-yellow-200"
                  }`}
                >
                  {aiLoading
                    ? "Getting AI info..."
                    : `AI inferred${selected.llm_source ? ` (${selected.llm_source})` : ""}`}
                </p>
              )}

              <p>
                <span className="font-bold">ID:</span> {showValue(selected.id)}
              </p>
              <p>
                <span className="font-bold">Symbol:</span>{" "}
                {showValue(selected.symbol_name)}
              </p>
              <p>
                <span className="font-bold">Company:</span>{" "}
                {showMeta(selected.company)}
              </p>
              <p>
                <span className="font-bold">Category:</span>{" "}
                {showMeta(selected.category)}
              </p>

              <p>
                <span className="font-bold">Device:</span>{" "}
                {showMeta(selected.device_type)}
              </p>
              <p>
                <span className="font-bold">Description: </span>{" "}
                {showMeta(selected.description)}
              </p>
              <p>
                <span className="font-bold">Package:</span>{" "}
                {showMeta(selected.package)}
              </p>
              <p>
                <span className="font-bold">Pins:</span>{" "}
                {showValue(selected.pin_count)}
              </p>
              <p>
                <span className="font-bold">Mount:</span>{" "}
                {showMeta(selected.mount_type)}
              </p>

              <p>
                <span className="font-bold">Voltage:</span>{" "}
                {showRating(selected.voltage_rating ?? selected.voltage, "V")}
              </p>

              <p>
                <span className="font-bold">Current:</span>{" "}
                {showRating(selected.current_rating ?? selected.current, "A")}
              </p>

              <p>
                <span className="font-bold">Power:</span>{" "}
                {showRating(selected.power_rating ?? selected.power, "W")}
              </p>

              <p>
                <span className="font-bold">Datasheet:</span>{" "}
                {selected.datasheet ? (
                  <a
                    href={selected.datasheet}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 underline"
                  >
                    Open Datasheet
                  </a>
                ) : (
                  "Not specified"
                )}
              </p>

              {selected.step_url && (
                <p>
                  <span className="font-bold">STEP:</span>{" "}
                  <a
                    href={selected.step_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 underline"
                  >
                    Open STEP
                  </a>
                </p>
              )}

              <p>
                <span className="font-bold">Tags:</span>{" "}
                {selected.tags?.length
                  ? selected.tags.join(", ")
                  : "Not specified"}
              </p>

              <p>
                <span className="font-bold">License:</span>{" "}
                {showValue(selected.license)}
              </p>

              {selected.llm_note && (
                <p className="text-xs opacity-70">{selected.llm_note}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Earth's Echoes app
const { useState: aS, useEffect: aE, useRef: aR, useMemo: aM, useCallback: aC } = React;

// TWEAK DEFAULTS — editable via host
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "cinematic",
  "globeStyle": "photoreal",
  "pinStyle": "portrait",
  "density": "all",
  "accent": "habitat",
  "lens": "habitat",
  "ambience": true
}/*EDITMODE-END*/;

function App() {
  const [config, setConfig] = aS(TWEAK_DEFAULTS);
  const [filter, setFilter] = aS("all");
  const [year, setYear] = aS(2026);
  const [selectedId, setSelectedId] = aS(null);
  const [hoverSpecies, setHoverSpecies] = aS(null);
  const [tourActive, setTourActive] = aS(false);
  const [statsOpen, setStatsOpen] = aS(false);
  const [tweaksOpen, setTweaksOpen] = aS(false);
  const [paletteOpen, setPaletteOpen] = aS(false);
  const [compareOpen, setCompareOpen] = aS(false);
  const [quizActive, setQuizActive] = aS(false);
  const [shareSpecies, setShareSpecies] = aS(null);
  const [bookmarks, setBookmarks] = aS(() => {
    try { return JSON.parse(localStorage.getItem("ee_marks") || "[]"); } catch (e) { return []; }
  });
  const [birthYear, setBirthYear] = aS(() => {
    return parseInt(localStorage.getItem("ee_birth") || "1995", 10);
  });
  const [soundOn, setSoundOn] = aS(() => window.eeSound?.isEnabled() ?? true);
  const [entered, setEntered] = aS(() => new URLSearchParams(location.search).has("from"));
  const [editMode, setEditMode] = aS(false);
  const globeRef = aR(null);

  // Persist
  aE(() => { localStorage.setItem("ee_marks", JSON.stringify(bookmarks)); }, [bookmarks]);
  aE(() => { localStorage.setItem("ee_birth", String(birthYear)); }, [birthYear]);

  // Edit mode wiring
  aE(() => {
    const onMsg = (e) => {
      const d = e.data; if (!d || !d.type) return;
      if (d.type === "__activate_edit_mode") { setEditMode(true); }
      if (d.type === "__deactivate_edit_mode") { setEditMode(false); setTweaksOpen(false); }
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Persist config changes via edit-mode protocol
  aE(() => {
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: config }, "*");
  }, [config]);

  // Species list
  const allSpecies = window.SPECIES;
  const filteredSpecies = aM(() => {
    if (filter === "all") return allSpecies;
    return allSpecies.filter((s) => s.habitat === filter);
  }, [filter]);

  const selected = selectedId ? allSpecies.find((s) => s.id === selectedId) : null;

  // Selected-driven habitat theme
  const [habitatTheme, setHabitatTheme] = aS("forest");
  aE(() => {
    if (selected) setHabitatTheme(selected.habitat);
    else if (hoverSpecies) setHabitatTheme(hoverSpecies.habitat);
  }, [selected, hoverSpecies]);

  // Accent resolution
  const habitat = window.HABITATS[habitatTheme];
  const accent = config.accent === "habitat" ? habitat.color : config.accent;
  const accentRgb = config.accent === "habitat" ? habitat.rgb : hexToRgbStr(config.accent);

  // Expose on CSS root for sliders/waveform
  aE(() => {
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent-rgb", accentRgb);
    document.body.className = `theme-${config.theme}`;
  }, [accent, accentRgb, config.theme]);

  // Atmosphere tied to selected/hover
  const atmos = habitat.atmos;

  // Filter by habitat when in the header tabs
  const visibleSpecies = aM(() => {
    return filteredSpecies;
  }, [filteredSpecies]);

  // Tour species list = currently visible (respects filter + time)
  const tourSpecies = aM(() => {
    return visibleSpecies.filter((s) => s.yearExtinct === null || year <= s.yearExtinct);
  }, [visibleSpecies, year]);

  // Navigation helpers
  const onSelect = aC((s) => {
    setSelectedId(s.id);
    // Fly camera to species
    const g = globeRef.current;
    if (g) {
      const c = g.controls(); c.autoRotate = false;
      g.pointOfView({ lat: s.lat, lng: s.lng, altitude: 1.8 }, 1500);
    }
  }, []);

  const onPrev = aC(() => {
    if (!selected) return;
    const idx = allSpecies.findIndex((x) => x.id === selected.id);
    onSelect(allSpecies[(idx - 1 + allSpecies.length) % allSpecies.length]);
  }, [selected]);
  const onNext = aC(() => {
    if (!selected) return;
    const idx = allSpecies.findIndex((x) => x.id === selected.id);
    onSelect(allSpecies[(idx + 1) % allSpecies.length]);
  }, [selected]);

  const onBookmark = aC((id) => {
    setBookmarks((b) => b.includes(id) ? b.filter((x) => x !== id) : [...b, id]);
  }, []);

  // Hash-based share on load
  aE(() => {
    const h = location.hash.replace("#", "");
    if (h && allSpecies.find((s) => s.id === h)) {
      setTimeout(() => setSelectedId(h), 600);
    }
  }, []);
  aE(() => {
    if (selectedId) location.hash = selectedId;
  }, [selectedId]);

  // Random spotlight
  const spotlight = aC(() => {
    const pool = allSpecies.filter((s) => s.yearExtinct === null || year <= s.yearExtinct);
    const s = pool[Math.floor(Math.random() * pool.length)];
    if (s) { window.eeSound?.panelOpen(); onSelect(s); }
  }, [year, onSelect]);

  // ⌘K command palette
  aE(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Ambient soundscape lifecycle
  aE(() => { if (entered) window.eeAmbience?.start(habitatTheme); }, [entered]);
  aE(() => { if (entered) window.eeAmbience?.setHabitat(habitatTheme); }, [habitatTheme, entered]);
  aE(() => { window.eeAmbience?.setEnabled(soundOn && config.ambience !== false); }, [soundOn, config.ambience]);

  const paletteActions = [
    { label: "Start Museum Tour", sub: "Cinematic fly-through of every species", run: () => { window.eeSound?.panelOpen(); setTourActive(true); } },
    { label: "Play: Guess the Year", sub: "5-round extinction quiz on the Time Machine", run: () => setQuizActive(true) },
    { label: "Compare two species", sub: "Side-by-side profiles", run: () => setCompareOpen(true) },
    { label: "Surprise me", sub: "Fly to a random species", run: spotlight },
    { label: "Open Extinction Ledger", sub: "The quiet accounting", run: () => setStatsOpen(true) },
    { label: "Toggle threat lens", sub: "Recolor pins by primary threat", run: () => setConfig({ ...config, lens: config.lens === "threat" ? "habitat" : "threat" }) },
  ];

  return (
    <div className="relative w-full h-full vignette" data-screen-label="globe view">
      <div className="starfield" />
      <div className="grain" />
      <GlobeView
        species={visibleSpecies}
        currentYear={year}
        selectedId={selectedId}
        onSelect={onSelect}
        onHover={setHoverSpecies}
        atmosColor={atmos}
        globeStyle={config.globeStyle}
        pinStyle={config.pinStyle}
        density={config.density}
        habitatFilter={filter === "all" ? null : filter}
        lens={config.lens || "habitat"}
        globeRef={globeRef}
        theme={config.theme}
      />

      {!tourActive && !selected && entered && (
        <>
          <Header
            filter={filter} setFilter={setFilter}
            onStartTour={() => { window.eeSound?.panelOpen(); setTourActive(true); }}
            soundOn={soundOn} setSoundOn={setSoundOn}
            theme={config.theme}
            onOpenStats={() => { window.eeSound?.panelOpen(); setStatsOpen(true); }}
            onOpenTweaks={() => { window.eeSound?.click(); setTweaksOpen(!tweaksOpen); }}
            onOpenPalette={() => setPaletteOpen(true)}
            onOpenCompare={() => { window.eeSound?.panelOpen(); setCompareOpen(true); }}
          />
          <TimeMachine
            year={year} setYear={setYear}
            accent={accent}
            species={allSpecies}
            onQuiz={() => setQuizActive(true)}
          />
          <GlobeControls globeRef={globeRef} onSpotlight={spotlight} />
          <HoverHint species={hoverSpecies} />
          <SpeciesRail species={allSpecies} year={year} bookmarks={bookmarks} onSelect={onSelect} filter={filter} />
          <ExtinctionClock />
          <LensLegend lens={config.lens || "habitat"} />
        </>
      )}

      {!entered && <Intro onEnter={() => setEntered(true)} />}

      <Takeover
        species={selected}
        onClose={() => setSelectedId(null)}
        onPrev={onPrev} onNext={onNext}
        onShare={(s) => setShareSpecies(s)}
        bookmarked={selected && bookmarks.includes(selected.id)}
        onBookmark={onBookmark}
        accent={accent} accentRgb={accentRgb}
      />

      <Tour
        active={tourActive}
        species={tourSpecies}
        globeRef={globeRef}
        onExit={() => { setTourActive(false); const g = globeRef.current; if (g) g.controls().autoRotate = true; }}
        setHabitatTheme={setHabitatTheme}
      />

      <StatsOverlay open={statsOpen} onClose={() => setStatsOpen(false)}
        species={allSpecies} birthYear={birthYear} setBirthYear={setBirthYear} />

      <TweaksPanel open={tweaksOpen} onClose={() => setTweaksOpen(false)}
        config={config} setConfig={setConfig} />

      <ShareModal species={shareSpecies} onClose={() => setShareSpecies(null)} />

      <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)}
        species={allSpecies} actions={paletteActions}
        onPick={(s) => { setPaletteOpen(false); onSelect(s); }} />

      <Compare open={compareOpen} onClose={() => setCompareOpen(false)} species={allSpecies} />

      {quizActive && (
        <Quiz species={allSpecies} year={year} setYear={setYear}
          hidden={!!selected || tourActive} accent={accent}
          onExit={() => setQuizActive(false)} />
      )}
    </div>
  );
}

function BookmarksRail({ bookmarks, allSpecies, onSelect, accent }) {
  if (!bookmarks.length) return null;
  const items = bookmarks.map((id) => allSpecies.find((s) => s.id === id)).filter(Boolean);
  return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 pointer-events-auto">
      <div className="mono text-[9px] uppercase tracking-[0.25em] text-white/40 px-1">Saved</div>
      {items.map((s) => (
        <button key={s.id} onClick={() => { window.eeSound?.click(); onSelect(s); }}
          onMouseEnter={() => window.eeSound?.hover()}
          className="glass rounded-xl p-1.5 pr-3 flex items-center gap-2 hover:bg-white/10 transition">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5">
            <img src={s.imageUrl} alt="" className="w-full h-full object-cover"
              onError={(e) => e.target.style.display = "none"} />
          </div>
          <div className="text-xs whitespace-nowrap">{s.name}</div>
        </button>
      ))}
    </div>
  );
}

function hexToRgbStr(hex) {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) return "52 211 153";
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c+c).join("") : h, 16);
  return `${(n>>16)&255} ${(n>>8)&255} ${n&255}`;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

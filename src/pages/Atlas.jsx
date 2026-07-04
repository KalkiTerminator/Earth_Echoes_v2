import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SPECIES, HABITATS } from "../data/species.js";
import { eeSound, eeAmbience } from "../lib/audio.js";
import { hexToRgbStr, MAX_YEAR } from "../lib/format.js";
import GlobeView from "../components/atlas/GlobeView.jsx";
import Header from "../components/atlas/Header.jsx";
import TimeMachine from "../components/atlas/TimeMachine.jsx";
import GlobeControls from "../components/atlas/GlobeControls.jsx";
import StatsOverlay from "../components/atlas/StatsOverlay.jsx";
import HoverHint from "../components/atlas/HoverHint.jsx";
import SpeciesRail from "../components/atlas/SpeciesRail.jsx";
import ExtinctionClock from "../components/atlas/ExtinctionClock.jsx";
import LensLegend from "../components/atlas/LensLegend.jsx";
import Intro from "../components/atlas/Intro.jsx";
import Takeover from "../components/atlas/Takeover.jsx";
import ShareModal from "../components/atlas/ShareModal.jsx";
import Tour from "../components/atlas/Tour.jsx";
import TweaksPanel from "../components/atlas/TweaksPanel.jsx";
import Palette from "../components/atlas/Palette.jsx";
import Compare from "../components/atlas/Compare.jsx";
import Quiz from "../components/atlas/Quiz.jsx";

const TWEAK_DEFAULTS = {
  theme: "cinematic",
  globeStyle: "photoreal",
  pinStyle: "portrait",
  density: "all",
  accent: "habitat",
  lens: "habitat",
  ambience: true,
};

function loadConfig() {
  try {
    return { ...TWEAK_DEFAULTS, ...JSON.parse(localStorage.getItem("ee_config") || "{}") };
  } catch (e) {
    return TWEAK_DEFAULTS;
  }
}

export default function Atlas() {
  const [searchParams] = useSearchParams();
  const [config, setConfig] = useState(loadConfig);
  const [filter, setFilter] = useState("all");
  const [year, setYear] = useState(MAX_YEAR);
  const [selectedId, setSelectedId] = useState(null);
  const [hoverSpecies, setHoverSpecies] = useState(null);
  const [tourActive, setTourActive] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [quizActive, setQuizActive] = useState(false);
  const [shareSpecies, setShareSpecies] = useState(null);
  const [bookmarks, setBookmarks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ee_marks") || "[]"); } catch (e) { return []; }
  });
  const [birthYear, setBirthYear] = useState(() => parseInt(localStorage.getItem("ee_birth") || "1995", 10));
  const [soundOn, setSoundOn] = useState(() => eeSound.isEnabled());
  // Coming from the landing page skips the intro overlay (no double landing)
  const [entered, setEntered] = useState(() => searchParams.has("from"));
  const globeRef = useRef(null);

  // Persist
  useEffect(() => { localStorage.setItem("ee_marks", JSON.stringify(bookmarks)); }, [bookmarks]);
  useEffect(() => { localStorage.setItem("ee_birth", String(birthYear)); }, [birthYear]);
  useEffect(() => { localStorage.setItem("ee_config", JSON.stringify(config)); }, [config]);

  const allSpecies = SPECIES;
  const visibleSpecies = useMemo(() => {
    if (filter === "all") return allSpecies;
    return allSpecies.filter((s) => s.habitat === filter);
  }, [filter]);

  const selected = selectedId ? allSpecies.find((s) => s.id === selectedId) : null;

  // Habitat theme follows selection / hover
  const [habitatTheme, setHabitatTheme] = useState("forest");
  useEffect(() => {
    if (selected) setHabitatTheme(selected.habitat);
    else if (hoverSpecies) setHabitatTheme(hoverSpecies.habitat);
  }, [selected, hoverSpecies]);

  const habitat = HABITATS[habitatTheme];
  const accent = config.accent === "habitat" ? habitat.color : config.accent;
  const accentRgb = config.accent === "habitat" ? habitat.rgb : hexToRgbStr(config.accent);

  // Expose accent on the CSS root for sliders/waveform, theme class on body
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent-rgb", accentRgb);
    document.body.className = `theme-${config.theme}`;
    return () => { document.body.className = ""; };
  }, [accent, accentRgb, config.theme]);

  // Tour species = currently visible, alive at the current year
  const tourSpecies = useMemo(() => {
    return visibleSpecies.filter((s) => s.yearExtinct === null || year <= s.yearExtinct);
  }, [visibleSpecies, year]);

  const onSelect = useCallback((s) => {
    setSelectedId(s.id);
    const g = globeRef.current;
    if (g) {
      g.controls().autoRotate = false;
      g.pointOfView({ lat: s.lat, lng: s.lng, altitude: 1.8 }, 1500);
    }
  }, []);

  const onPrev = useCallback(() => {
    if (!selectedId) return;
    const idx = allSpecies.findIndex((x) => x.id === selectedId);
    onSelect(allSpecies[(idx - 1 + allSpecies.length) % allSpecies.length]);
  }, [selectedId, onSelect]);
  const onNext = useCallback(() => {
    if (!selectedId) return;
    const idx = allSpecies.findIndex((x) => x.id === selectedId);
    onSelect(allSpecies[(idx + 1) % allSpecies.length]);
  }, [selectedId, onSelect]);

  const onBookmark = useCallback((id) => {
    setBookmarks((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id]));
  }, []);

  // Hash-based deep link (#species-id) on load
  useEffect(() => {
    const h = location.hash.replace("#", "");
    if (h && allSpecies.find((s) => s.id === h)) {
      const t = setTimeout(() => setSelectedId(h), 600);
      return () => clearTimeout(t);
    }
  }, []);
  useEffect(() => {
    if (selectedId) history.replaceState(null, "", `#${selectedId}`);
    else history.replaceState(null, "", location.pathname + location.search);
  }, [selectedId]);

  // Random spotlight
  const spotlight = useCallback(() => {
    const pool = allSpecies.filter((s) => s.yearExtinct === null || year <= s.yearExtinct);
    const s = pool[Math.floor(Math.random() * pool.length)];
    if (s) { eeSound.panelOpen(); onSelect(s); }
  }, [year, onSelect]);

  // ⌘K command palette
  useEffect(() => {
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
  useEffect(() => { if (entered) eeAmbience.start(habitatTheme); }, [entered]);
  useEffect(() => { if (entered) eeAmbience.setHabitat(habitatTheme); }, [habitatTheme, entered]);
  useEffect(() => { eeAmbience.setEnabled(soundOn && config.ambience !== false); }, [soundOn, config.ambience]);
  useEffect(() => () => eeAmbience.stop(), []);

  const paletteActions = [
    { label: "Start Museum Tour", sub: "Cinematic fly-through of every species", run: () => { eeSound.panelOpen(); setTourActive(true); } },
    { label: "Play: Guess the Year", sub: "5-round extinction quiz on the Time Machine", run: () => setQuizActive(true) },
    { label: "Compare two species", sub: "Side-by-side profiles", run: () => setCompareOpen(true) },
    { label: "Surprise me", sub: "Fly to a random species", run: spotlight },
    { label: "Open Extinction Ledger", sub: "The quiet accounting", run: () => setStatsOpen(true) },
    { label: "Toggle threat lens", sub: "Recolor pins by primary threat", run: () => setConfig({ ...config, lens: config.lens === "threat" ? "habitat" : "threat" }) },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden vignette">
      <div className="starfield" />
      <div className="grain" />
      <GlobeView
        species={visibleSpecies}
        currentYear={year}
        selectedId={selectedId}
        onSelect={onSelect}
        onHover={setHoverSpecies}
        atmosColor={habitat.atmos}
        globeStyle={config.globeStyle}
        pinStyle={config.pinStyle}
        density={config.density}
        habitatFilter={filter === "all" ? null : filter}
        lens={config.lens || "habitat"}
        globeRef={globeRef}
      />

      {!tourActive && !selected && entered && (
        <>
          <Header
            filter={filter} setFilter={setFilter}
            onStartTour={() => { eeSound.panelOpen(); setTourActive(true); }}
            soundOn={soundOn} setSoundOn={setSoundOn}
            onOpenStats={() => { eeSound.panelOpen(); setStatsOpen(true); }}
            onOpenTweaks={() => { eeSound.click(); setTweaksOpen(!tweaksOpen); }}
            onOpenPalette={() => setPaletteOpen(true)}
            onOpenCompare={() => { eeSound.panelOpen(); setCompareOpen(true); }}
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
        bookmarked={selected ? bookmarks.includes(selected.id) : false}
        onBookmark={onBookmark}
        accent={accent} accentRgb={accentRgb}
      />

      <Tour
        active={tourActive}
        species={tourSpecies}
        globeRef={globeRef}
        onExit={() => {
          setTourActive(false);
          const g = globeRef.current;
          if (g) g.controls().autoRotate = true;
        }}
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

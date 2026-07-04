// Globe component — wraps globe.gl (vanilla) inside React.
const { useEffect, useRef, useState, useMemo, useCallback } = React;

const EARTH_MODERN = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg";
const EARTH_ANCIENT = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg";
const EARTH_TOPO = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png";
const EARTH_BLUE = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg";

function GlobeView({
  species,
  currentYear,
  selectedId,
  onSelect,
  onHover,
  atmosColor,
  globeStyle,    // photoreal | stylized | wireframe
  pinStyle,      // portrait | dot | card
  density,       // all | filtered
  habitatFilter, // null | "ocean" | "forest" | ...
  lens,          // habitat | threat
  globeRef,
  theme,
}) {
  const mountRef = useRef(null);
  const gRef = useRef(null);

  // Determine which species should be visible
  const visibleSpecies = useMemo(() => {
    return species.filter((s) => {
      // Time machine: extinct animals only visible if currentYear <= yearExtinct
      if (s.yearExtinct !== null && currentYear > s.yearExtinct) return false;
      // Habitat filter (density "filtered" = only current habitat)
      if (density === "filtered" && habitatFilter && s.habitat !== habitatFilter) return false;
      return true;
    });
  }, [species, currentYear, density, habitatFilter]);

  // init
  useEffect(() => {
    if (!mountRef.current || gRef.current) return;
    const mount = mountRef.current;
    const g = Globe()(mount)
      .width(mount.clientWidth)
      .height(mount.clientHeight)
      .backgroundColor("rgba(6,6,10,1)")
      .showGlobe(true)
      .globeImageUrl("https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg")
      .bumpImageUrl("https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png")
      .showAtmosphere(true)
      .atmosphereAltitude(0.25)
      .atmosphereColor("#5fa3e8")
      .htmlElementsData([])
      .htmlAltitude(0.01);

    g.pointOfView({ lat: 20, lng: -30, altitude: 2.0 });

    gRef.current = g;
    if (globeRef) globeRef.current = g;
    window.__globe = g;

    // Auto-rotate
    const controls = g.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enablePan = false;
    controls.minDistance = 180;
    controls.maxDistance = 500;

    const onResize = () => {
      if (!mountRef.current) return;
      g.width(mountRef.current.clientWidth).height(mountRef.current.clientHeight);
    };
    onResize();
    window.addEventListener("resize", onResize);
    // Force a re-size after a moment to kick the render loop
    setTimeout(onResize, 100);
    setTimeout(onResize, 500);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Globe texture swap
  useEffect(() => {
    const g = gRef.current; if (!g) return;
    let url = EARTH_MODERN;
    if (globeStyle === "photoreal") {
      url = currentYear < -5000 ? EARTH_ANCIENT : EARTH_BLUE;
    } else if (globeStyle === "stylized") {
      url = EARTH_MODERN;
    } else {
      url = null; // wireframe handled below
    }
    if (globeStyle === "wireframe") {
      g.globeImageUrl(null).bumpImageUrl(null);
      // Use a solid color look — react-globe.gl exposes globeMaterial via .globeMaterial()
      try {
        const mat = g.globeMaterial();
        mat.wireframe = true;
        mat.color = new THREE.Color("#1a2e3d");
        mat.transparent = true;
        mat.opacity = 0.75;
      } catch (e) {}
    } else {
      g.globeImageUrl(url).bumpImageUrl(EARTH_TOPO);
      try {
        const mat = g.globeMaterial();
        mat.wireframe = false;
        mat.opacity = 1;
        mat.transparent = false;
      } catch (e) {}
    }
  }, [globeStyle, currentYear]);

  // Atmosphere color
  useEffect(() => {
    const g = gRef.current; if (!g) return;
    g.atmosphereColor(atmosColor || "#4f8fe8");
  }, [atmosColor]);

  // HTML pins
  useEffect(() => {
    const g = gRef.current; if (!g) return;

    g.htmlElementsData(visibleSpecies)
      .htmlLat((d) => d.lat)
      .htmlLng((d) => d.lng)
      .htmlAltitude(0.01)
      .htmlElement((d) => {
        const h = window.HABITATS[d.habitat];
        const pinColor = (lens === "threat" && window.THREAT_CLASSES && window.THREAT_CLASSES[d.threatClass])
          ? window.THREAT_CLASSES[d.threatClass].color : h.color;
        const el = document.createElement("div");
        el.style.setProperty("--pin-color", pinColor);
        el.style.pointerEvents = "auto";

        if (pinStyle === "dot") {
          el.className = "pin-dot";
          const tip = document.createElement("div");
          tip.className = "tooltip";
          tip.style.setProperty("--pin-color", pinColor);
          tip.textContent = `✦  ${d.iconicAction}`;
          el.parentElement && el.parentElement.appendChild(tip);
          // wrap dot in container for tooltip
          const wrap = document.createElement("div");
          wrap.style.position = "relative";
          wrap.appendChild(el);
          wrap.appendChild(tip);
          wrap.onmouseenter = () => { window.eeSound?.hover(); onHover?.(d); };
          wrap.onmouseleave = () => onHover?.(null);
          wrap.onclick = (e) => { e.stopPropagation(); window.eeSound?.click(); onSelect?.(d); };
          return wrap;
        }
        if (pinStyle === "card") {
          el.className = "pin-card";
          el.innerHTML = `<img src="${d.imageUrl}" onerror="this.style.background='#222';this.removeAttribute('src')"/><span class="lbl">${d.name}</span>`;
          const tip = document.createElement("div");
          tip.className = "tooltip";
          tip.style.setProperty("--pin-color", pinColor);
          tip.textContent = `✦  ${d.iconicAction}`;
          const wrap = document.createElement("div");
          wrap.style.position = "relative";
          wrap.appendChild(el);
          wrap.appendChild(tip);
          el.onmouseenter = () => { tip.style.opacity = 1; window.eeSound?.hover(); onHover?.(d); };
          el.onmouseleave = () => { tip.style.opacity = 0; onHover?.(null); };
          el.onclick = (e) => { e.stopPropagation(); window.eeSound?.click(); onSelect?.(d); };
          return wrap;
        }
        // portrait (default)
        el.className = "pin";
        const img = document.createElement("img");
        img.src = d.imageUrl;
        img.alt = d.name;
        img.onerror = () => {
          img.remove();
          const fallback = document.createElement("div");
          fallback.style.cssText = "font-family:'IBM Plex Mono',monospace;font-size:9px;color:#fff;text-align:center;line-height:1.1;padding:2px;letter-spacing:0.05em";
          fallback.textContent = d.name.split(" ")[0].slice(0, 6);
          el.appendChild(fallback);
        };
        el.appendChild(img);
        const tip = document.createElement("div");
        tip.className = "tooltip";
        tip.style.setProperty("--pin-color", pinColor);
        tip.textContent = `✦  ${d.iconicAction}`;
        el.appendChild(tip);
        el.onmouseenter = () => { window.eeSound?.hover(); onHover?.(d); };
        el.onmouseleave = () => onHover?.(null);
        el.onclick = (e) => { e.stopPropagation(); window.eeSound?.click(); onSelect?.(d); };
        if (d.id === selectedId) {
          el.style.transform = "scale(1.3)";
          el.style.boxShadow = `0 0 40px ${pinColor}`;
        }
        return el;
      });
  }, [visibleSpecies, pinStyle, selectedId, lens]);

  return <div ref={mountRef} className="absolute inset-0" />;
}

window.GlobeView = GlobeView;

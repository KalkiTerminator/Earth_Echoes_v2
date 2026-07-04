import { useEffect, useMemo, useRef } from "react";
import Globe from "globe.gl";
import * as THREE from "three";
import { HABITATS, THREAT_CLASSES } from "../../data/species.js";
import { eeSound } from "../../lib/audio.js";
import { prefersReducedMotion } from "../../lib/format.js";

// Served from public/textures (copied out of the three-globe package at
// install time) — no runtime CDN dependency.
const EARTH_BLUE = "/textures/earth-blue-marble.jpg";
const EARTH_MODERN = "/textures/earth-dark.jpg";
const EARTH_ANCIENT = "/textures/earth-night.jpg";
const EARTH_TOPO = "/textures/earth-topology.png";

export default function GlobeView({
  species,
  currentYear,
  selectedId,
  onSelect,
  onHover,
  atmosColor,
  globeStyle,    // photoreal | stylized | wireframe
  pinStyle,      // portrait | dot | card
  density,       // all | filtered
  habitatFilter, // null | habitat id
  lens,          // habitat | threat
  globeRef,
}) {
  const mountRef = useRef(null);
  const gRef = useRef(null);
  const callbacksRef = useRef({ onSelect, onHover });
  callbacksRef.current = { onSelect, onHover };

  const visibleSpecies = useMemo(() => {
    return species.filter((s) => {
      // Time machine: extinct animals only visible up to their extinction year
      if (s.yearExtinct !== null && currentYear > s.yearExtinct) return false;
      if (density === "filtered" && habitatFilter && s.habitat !== habitatFilter) return false;
      return true;
    });
  }, [species, currentYear, density, habitatFilter]);

  // Init
  useEffect(() => {
    if (!mountRef.current || gRef.current) return;
    const mount = mountRef.current;
    // waitForGlobeReady:false keeps the scene visible even if a texture
    // stalls — otherwise three-globe hides everything until textures load.
    const g = Globe({ waitForGlobeReady: false, animateIn: true })(mount)
      .width(mount.clientWidth)
      .height(mount.clientHeight)
      .backgroundColor("rgba(6,6,10,1)") // opaque — transparent alpha breaks WebGL compositing in some browsers
      .globeImageUrl(EARTH_BLUE)
      .bumpImageUrl(EARTH_TOPO)
      .showAtmosphere(true)
      .atmosphereAltitude(0.25)
      .atmosphereColor("#5fa3e8")
      .htmlElementsData([])
      .htmlAltitude(0.01);

    g.pointOfView({ lat: 20, lng: -30, altitude: 2.0 });

    gRef.current = g;
    if (globeRef) globeRef.current = g;
    if (import.meta.env.DEV) window.__globe = g;

    const controls = g.controls();
    controls.autoRotate = !prefersReducedMotion();
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
    const t = setTimeout(onResize, 100);

    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(t);
      try { g._destructor(); } catch (e) {}
      mount.innerHTML = "";
      gRef.current = null;
      if (globeRef) globeRef.current = null;
    };
  }, []);

  // Globe texture / style swap
  useEffect(() => {
    const g = gRef.current;
    if (!g) return;
    if (globeStyle === "wireframe") {
      g.globeImageUrl(null).bumpImageUrl(null);
      try {
        const mat = g.globeMaterial();
        mat.wireframe = true;
        mat.color = new THREE.Color("#1a2e3d");
        mat.transparent = true;
        mat.opacity = 0.75;
      } catch (e) {}
    } else {
      const url = globeStyle === "stylized"
        ? EARTH_MODERN
        : currentYear < -5000 ? EARTH_ANCIENT : EARTH_BLUE;
      g.globeImageUrl(url).bumpImageUrl(EARTH_TOPO);
      try {
        const mat = g.globeMaterial();
        mat.wireframe = false;
        mat.opacity = 1;
        mat.transparent = false;
      } catch (e) {}
    }
  }, [globeStyle, currentYear < -5000]);

  // Atmosphere color follows habitat theme
  useEffect(() => {
    const g = gRef.current;
    if (!g) return;
    g.atmosphereColor(atmosColor || "#4f8fe8");
  }, [atmosColor]);

  // HTML pins
  useEffect(() => {
    const g = gRef.current;
    if (!g) return;

    // Local image first; retry once against the remote source before
    // degrading to the name chip / blank background.
    const withRemoteRetry = (img, d, onFail) => {
      img.onerror = () => {
        if (!img.dataset.retried && d.imageRemote) {
          img.dataset.retried = "1";
          img.src = d.imageRemote;
        } else {
          onFail();
        }
      };
    };
    const wire = (el, d) => {
      el.onmouseenter = () => { eeSound.hover(); callbacksRef.current.onHover?.(d); };
      el.onmouseleave = () => callbacksRef.current.onHover?.(null);
      el.onclick = (e) => { e.stopPropagation(); eeSound.click(); callbacksRef.current.onSelect?.(d); };
    };
    const makeTooltip = (d, pinColor) => {
      const tip = document.createElement("div");
      tip.className = "pin-tooltip";
      tip.style.setProperty("--pin-color", pinColor);
      tip.textContent = `✦  ${d.iconicAction}`;
      return tip;
    };

    g.htmlElementsData(visibleSpecies)
      .htmlLat((d) => d.lat)
      .htmlLng((d) => d.lng)
      .htmlAltitude(0.01)
      .htmlElement((d) => {
        const h = HABITATS[d.habitat];
        const pinColor = lens === "threat" && THREAT_CLASSES[d.threatClass]
          ? THREAT_CLASSES[d.threatClass].color
          : h.color;
        const el = document.createElement("div");
        el.style.setProperty("--pin-color", pinColor);
        el.style.pointerEvents = "auto";

        if (pinStyle === "dot") {
          el.className = "pin-dot";
          const wrap = document.createElement("div");
          wrap.style.position = "relative";
          wrap.style.pointerEvents = "auto";
          wrap.appendChild(el);
          wrap.appendChild(makeTooltip(d, pinColor));
          wire(wrap, d);
          return wrap;
        }

        if (pinStyle === "card") {
          el.className = "pin-card";
          const img = document.createElement("img");
          img.src = d.imageUrl;
          img.alt = "";
          withRemoteRetry(img, d, () => { img.style.background = "#222"; img.removeAttribute("src"); });
          const lbl = document.createElement("span");
          lbl.className = "lbl";
          lbl.textContent = d.name;
          el.append(img, lbl);
          const wrap = document.createElement("div");
          wrap.style.position = "relative";
          wrap.style.pointerEvents = "auto";
          wrap.appendChild(el);
          wrap.appendChild(makeTooltip(d, pinColor));
          wire(el, d);
          return wrap;
        }

        // portrait (default)
        el.className = "pin";
        const img = document.createElement("img");
        img.src = d.imageUrl;
        img.alt = d.name;
        withRemoteRetry(img, d, () => {
          img.remove();
          const fallback = document.createElement("div");
          fallback.style.cssText = "font-family:'IBM Plex Mono',monospace;font-size:9px;color:#fff;text-align:center;line-height:1.1;padding:2px;letter-spacing:0.05em";
          fallback.textContent = d.name.split(" ")[0].slice(0, 6);
          el.appendChild(fallback);
        });
        el.appendChild(img);
        el.appendChild(makeTooltip(d, pinColor));
        wire(el, d);
        if (d.id === selectedId) {
          el.style.transform = "scale(1.3)";
          el.style.boxShadow = `0 0 40px ${pinColor}`;
        }
        return el;
      });
  }, [visibleSpecies, pinStyle, selectedId, lens]);

  // isolate contains the huge z-index values globe.gl assigns to CSS2D pin
  // elements, so pins can never paint above overlays like the takeover.
  return <div ref={mountRef} className="absolute inset-0 z-0" style={{ isolation: "isolate" }} aria-label="Interactive globe of species locations" />;
}

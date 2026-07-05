import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SPECIES } from "../data/species.js";
import { eeSound } from "../lib/audio.js";
import { prefersReducedMotion, withBase } from "../lib/format.js";
import HeroGlobe from "../components/landing/HeroGlobe.jsx";
import "../styles/landing.css";

// Art-directed spotlight images from the design mockups, self-hosted in
// public/images/cards (the design's original CDN URLs have expired).
const CARD_IMAGES = {
  axolotl: withBase("/images/cards/axolotl.jpg"),
  dodo: withBase("/images/cards/dodo.jpg"),
  thylacine: withBase("/images/cards/thylacine.jpg"),
};

// Prefer the design's art-directed image; fall back to the species' archive
// photo (local first, then remote) if it 404s.
function useCardImage(id) {
  const primary = CARD_IMAGES[id];
  const sp = SPECIES.find((s) => s.id === id);
  const [url, setUrl] = useState(primary);
  useEffect(() => {
    const candidates = [primary, sp?.imageUrl, sp?.imageRemote].filter(Boolean);
    let cancelled = false;
    const tryNext = (i) => {
      if (cancelled || i >= candidates.length) return;
      const img = new Image();
      img.onload = () => { if (!cancelled) setUrl(candidates[i]); };
      img.onerror = () => tryNext(i + 1);
      img.src = candidates[i];
    };
    tryNext(0);
    return () => { cancelled = true; };
  }, [id]);
  return url;
}

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });
    document.querySelectorAll(".landing .rv").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function useCounters() {
  useEffect(() => {
    const reduced = prefersReducedMotion();
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        const el = e.target;
        const target = parseInt(el.dataset.count, 10);
        const t0 = performance.now(), DUR = reduced ? 1 : 1800;
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / DUR);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll(".landing [data-count]").forEach((el) => cio.observe(el));
    return () => cio.disconnect();
  }, []);
}

function useTilt() {
  useEffect(() => {
    if (prefersReducedMotion() || !matchMedia("(pointer: fine)").matches) return;
    const cleanups = [];
    document.querySelectorAll(".landing [data-tilt]").forEach((card) => {
      let raf = null;
      const onMove = (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = null;
          const r = card.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = `perspective(1100px) rotateY(${x * 3.5}deg) rotateX(${y * -3.5}deg) translateY(-2px)`;
        });
      };
      const onLeave = () => { card.style.transform = ""; };
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        card.removeEventListener("mousemove", onMove);
        card.removeEventListener("mouseleave", onLeave);
      });
    });
    return () => cleanups.forEach((fn) => fn());
  }, []);
}

function ScrollProgress() {
  const ref = useRef(null);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      if (ref.current) ref.current.style.width = (p * 100).toFixed(2) + "%";
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);
  return <div className="progress" ref={ref} />;
}

function HeroTitle() {
  const words = ["Earth's", "Echoes"];
  let d = 0.55;
  return (
    <h1 aria-label="Earth's Echoes">
      {words.map((w, wi) => {
        const spans = w.split("").map((ch, i) => {
          const delay = d;
          d += 0.045;
          return (
            <span key={i} className="ch" style={{ animationDelay: delay.toFixed(2) + "s" }}>
              {ch}
            </span>
          );
        });
        d += 0.12;
        return (
          <span key={wi} style={{ whiteSpace: "nowrap", display: "inline-block" }}>
            {spans}
            {wi < words.length - 1 && " "}
          </span>
        );
      })}
    </h1>
  );
}

function Marquee() {
  const seq = (key) => (
    <div className="item" key={key}>
      {SPECIES.map((s) => (
        <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 28 }}>
          <span className={"nm" + (s.yearExtinct !== null ? " lost" : "")}>{s.name}</span>
          <span className="yr">
            {s.yearExtinct !== null
              ? (s.yearExtinct < 0 ? Math.abs(s.yearExtinct).toLocaleString() + " BCE" : s.yearExtinct)
              : s.status}
          </span>
          <span className="sep" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee-strip">
      <div className="marquee">{seq("a")}{seq("b")}</div>
    </div>
  );
}

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L17 7" /><path d="M8 7h9v9" />
  </svg>
);

export default function Landing() {
  const hudLatRef = useRef(null);
  const hudLngRef = useRef(null);
  const [soundOn, setSoundOn] = useState(() => eeSound.isEnabled());

  useReveal();
  useCounters();
  useTilt();

  useEffect(() => {
    document.title = "Earth's Echoes — A Living Atlas";
  }, []);

  const hoverTap = () => eeSound.hover();
  const clickTap = () => eeSound.click();

  const axolotlImg = useCardImage("axolotl");
  const dodoImg = useCardImage("dodo");
  const thylacineImg = useCardImage("thylacine");

  return (
    <div className="landing">
      <ScrollProgress />
      <div className="noise" />
      <div className="scanlines" />
      <div className="starfield-fixed" />

      <nav>
        <Link className="brand" to="/" onMouseEnter={hoverTap}>Earth's Echoes</Link>
        <div className="links">
          <Link to="/atlas?from=landing" onMouseEnter={hoverTap} onClick={clickTap}>The Ledger</Link>
          <Link to="/atlas?from=landing" onMouseEnter={hoverTap} onClick={clickTap}>Time Machine</Link>
          <a href="#spotlights" className="active" onMouseEnter={hoverTap} onClick={clickTap}>About</a>
        </div>
        <button
          className={`wave-btn ${soundOn ? "" : "muted"}`}
          title="Toggle ambience" aria-label="Toggle sound"
          onClick={() => {
            const v = !soundOn;
            setSoundOn(v);
            eeSound.setEnabled(v);
            if (v) eeSound.click();
          }}>
          <span /><span /><span /><span />
        </button>
      </nav>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="hud-line" style={{ top: "20%" }} />
          <div className="hud-line" style={{ bottom: "20%" }} />

          <div className="hero-copy">
            <h2 className="hero-kicker">SYSTEM_INIT_COMPLETE</h2>
            <HeroTitle />
            <p>The silent voices of the Holocene. Explore the living record of what we've lost, and what we must protect.</p>
            <Link className="ghost-btn" to="/atlas?from=landing" onMouseEnter={hoverTap} onClick={clickTap}>
              <span>Access Archive</span>
              <svg className="arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="globe-wrap">
            <div className="globe-glow" />
            <HeroGlobe hudLatRef={hudLatRef} hudLngRef={hudLngRef} />
          </div>

          <div className="hud">
            <div className="row" style={{ marginBottom: 6 }}><span className="dot" /><span>TM_STATUS: ONLINE</span></div>
            <span ref={hudLatRef}>LAT: 0.0000° N</span>
            <span ref={hudLngRef}>LNG: 0.0000° E</span>
            <span>EPOCH: HOLOCENE</span>
            <div className="bar"><i /></div>
          </div>
        </section>

        {/* MEMORIAL MARQUEE */}
        <Marquee />

        {/* SPOTLIGHTS */}
        <section className="gallery" id="spotlights">
          <div className="gallery-head">
            <div className="rv">
              <h3 className="kicker">DATA_SUBSET_01</h3>
              <h2 className="serif">Species Spotlights</h2>
            </div>
            <div className="note rv" data-d="1">Fragments of genetic memory retrieved from the global ledger.</div>
          </div>

          <div className="bento">
            {/* Axolotl */}
            <Link className="card rv" style={{ gridColumn: "span 8" }} to="/atlas?from=landing#axolotl" data-tilt
              onMouseEnter={hoverTap} onClick={clickTap}>
              <div className="bgimg" style={{ backgroundImage: `url('${axolotlImg}')` }} />
              <div className="shade" />
              <div className="inner">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span className="chip alive">Critically Endangered</span>
                  <span className="open-ic"><ArrowIcon /></span>
                </div>
                <div>
                  <div className="sci">Ambystoma mexicanum</div>
                  <h3 className="nm">The Axolotl</h3>
                  <p className="desc">The Peter Pan of the amphibian world, locked in a state of eternal youth within the shrinking canals of Xochimilco.</p>
                </div>
              </div>
            </Link>

            {/* Dodo */}
            <Link className="card rv" style={{ gridColumn: "span 4" }} to="/atlas?from=landing#dodo" data-d="1" data-tilt
              onMouseEnter={hoverTap} onClick={clickTap}>
              <div className="bgimg" style={{ filter: "grayscale(1)", backgroundImage: `url('${dodoImg}')` }} />
              <div className="shade" />
              <div className="inner">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span className="chip lost">Extinct</span>
                  <span className="open-ic"><ArrowIcon /></span>
                </div>
                <div>
                  <div className="sci" style={{ color: "#85948b" }}>Raphus cucullatus</div>
                  <h3 className="nm">The Dodo</h3>
                </div>
              </div>
            </Link>

            {/* Thylacine */}
            <Link className="card wide rv" style={{ gridColumn: "span 12", minHeight: 440 }} to="/atlas?from=landing#thylacine" data-d="2" data-tilt
              onMouseEnter={hoverTap} onClick={clickTap}>
              <div className="bgimg" style={{ opacity: 0.4, backgroundImage: `url('${thylacineImg}')` }} />
              <div className="shade" style={{ background: "linear-gradient(to right, var(--bg) 0%, rgba(6,6,8,0.8) 40%, transparent 100%)" }} />
              <div className="inner">
                <span className="chip lost">Extinct (1936)</span>
                <div className="sci" style={{ marginTop: 24 }}>Thylacinus cynocephalus</div>
                <h3 className="serif">The Thylacine</h3>
                <p className="desc">An apex predator erased by ignorance, surviving only in flickering black-and-white footage and the echoes of the Tasmanian scrub.</p>
                <div className="play-row">
                  <span className="play-ic">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
                  </span>
                  <span className="label-xs" style={{ color: "var(--on-surface)", letterSpacing: "0.25em" }}>Playback Archive</span>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* STATS */}
        <section className="stats">
          <div className="stat rv"><div className="n" data-count="16">0</div><div className="l">Species catalogued</div><div className="s">across four biomes</div></div>
          <div className="stat rv" data-d="1"><div className="n red" data-count="7">0</div><div className="l">Already silent</div><div className="s">extinct or functionally extinct</div></div>
          <div className="stat rv" data-d="2"><div className="n" data-count="12026">0</div><div className="l">Years of record</div><div className="s">10,000 BCE — present day</div></div>
        </section>
      </main>

      <footer>
        <div className="brand">Earth's Echoes</div>
        <div className="cols">
          <div className="col">
            <Link to="/atlas?from=landing" onMouseEnter={hoverTap} onClick={clickTap}>Archives</Link>
            <Link to="/atlas?from=landing" onMouseEnter={hoverTap} onClick={clickTap}>Protocol</Link>
            <a href="#" onMouseEnter={hoverTap}>Contact</a>
          </div>
          <div className="fine">© 2026 Earth's Echoes. Preserving the silent voices.</div>
        </div>
      </footer>

      <div className="wave-fixed"><i /><i /><i /><i /></div>
    </div>
  );
}

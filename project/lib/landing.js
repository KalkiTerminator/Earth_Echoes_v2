// Landing page behaviors: wireframe globe, marquee, scroll reveals, counters, tilt, HUD
(function () {
  "use strict";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Scroll progress ---------- */
  const prog = document.getElementById("progress");
  addEventListener("scroll", () => {
    const h = document.documentElement;
    const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
    prog.style.width = (p * 100).toFixed(2) + "%";
  }, { passive: true });

  /* ---------- Hero title per-letter ---------- */
  const title = document.getElementById("heroTitle");
  if (title) {
    const words = title.textContent.split(" ");
    title.textContent = "";
    let d = 0.55;
    words.forEach((w, wi) => {
      const span = document.createElement("span");
      span.style.whiteSpace = "nowrap";
      span.style.display = "inline-block";
      for (const ch of w) {
        const c = document.createElement("span");
        c.className = "ch";
        c.textContent = ch;
        c.style.animationDelay = d.toFixed(2) + "s";
        if (wi === 1) c.style.color = "#8fd4c9";
        d += 0.045;
        span.appendChild(c);
      }
      title.appendChild(span);
      if (wi < words.length - 1) title.appendChild(document.createTextNode(" "));
      d += 0.12;
    });
  }

  /* ---------- Memorial marquee ---------- */
  const marquee = document.getElementById("marquee");
  if (marquee && window.SPECIES) {
    const seq = document.createElement("div");
    seq.className = "item";
    window.SPECIES.forEach((s) => {
      const nm = document.createElement("span");
      nm.className = "nm" + (s.yearExtinct !== null ? " lost" : "");
      nm.textContent = s.name;
      const yr = document.createElement("span");
      yr.className = "yr";
      yr.textContent = s.yearExtinct !== null
        ? (s.yearExtinct < 0 ? Math.abs(s.yearExtinct).toLocaleString() + " BCE" : s.yearExtinct)
        : s.status;
      const sep = document.createElement("span");
      sep.className = "sep";
      seq.append(nm, yr, sep);
    });
    marquee.appendChild(seq);
    marquee.appendChild(seq.cloneNode(true));
  }

  /* ---------- Scroll reveals ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });
  document.querySelectorAll(".rv").forEach((el) => io.observe(el));

  /* ---------- Counters ---------- */
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
  document.querySelectorAll("[data-count]").forEach((el) => cio.observe(el));

  /* ---------- Card tilt ---------- */
  if (!reduced && matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      let raf = null;
      card.addEventListener("mousemove", (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = null;
          const r = card.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = `perspective(1100px) rotateY(${x * 3.5}deg) rotateX(${y * -3.5}deg) translateY(-2px)`;
        });
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* ---------- Sound toggle (UI sounds + hover taps) ---------- */
  const soundBtn = document.getElementById("soundToggle");
  let soundOn = true;
  try { soundOn = localStorage.getItem("ee_sound") !== "0"; } catch (e) {}
  if (!soundOn) soundBtn.classList.add("muted");
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.classList.toggle("muted", !soundOn);
    window.eeSound?.setEnabled(soundOn);
    if (soundOn) window.eeSound?.click();
  });
  document.querySelectorAll("a.ghost-btn, nav .links a, .card").forEach((el) => {
    el.addEventListener("mouseenter", () => window.eeSound?.hover());
    el.addEventListener("click", () => window.eeSound?.click());
  });

  /* ---------- Three.js wireframe globe ---------- */
  const container = document.getElementById("globe-container");
  if (container && window.THREE) {
    const speciesData = (window.SPECIES || []).map((s) => ({ lat: s.lat, lng: s.lng }));
    let W = container.clientWidth || innerWidth, H = container.clientHeight || 600;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, W / H, 0.1, 1000);
    camera.position.z = 235;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    const R = 100;

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x34d399, wireframe: true, transparent: true, opacity: 0.1 })
    );
    globeGroup.add(globe);

    const hexGlobe = new THREE.Mesh(
      new THREE.IcosahedronGeometry(R * 0.98, 4),
      new THREE.MeshBasicMaterial({ color: 0x34d399, wireframe: true, transparent: true, opacity: 0.05 })
    );
    globeGroup.add(hexGlobe);

    // particles
    const COUNT = 600;
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r = R * (1.1 + Math.random() * 0.15);
      const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI;
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
    }
    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const particles = new THREE.Points(pGeom, new THREE.PointsMaterial({
      color: 0x34d399, size: 1.0, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending,
    }));
    globeGroup.add(particles);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pl = new THREE.PointLight(0x34d399, 1.5, 400);
    pl.position.set(150, 150, 150);
    scene.add(pl);

    // species markers + pulse rings
    const pointsGroup = new THREE.Group();
    globe.add(pointsGroup);
    const toVec = (lat, lng, r) => {
      const phi = (90 - lat) * Math.PI / 180, theta = (lng + 180) * Math.PI / 180;
      return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
    };
    speciesData.forEach((sp) => {
      const p = toVec(sp.lat, sp.lng, R + 4);
      const g = new THREE.Group();
      const dot = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x5af0b3, transparent: true, opacity: 0.85 }));
      dot.position.copy(p);
      const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 5, 32),
        new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
      ring.position.copy(p.clone().multiplyScalar(1.02));
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      g.add(dot); g.add(ring);
      pointsGroup.add(g);
    });

    let mx = 0, my = 0;
    addEventListener("mousemove", (e) => {
      mx = (e.clientX - innerWidth / 2) * 0.0001;
      my = (e.clientY - innerHeight / 2) * 0.0001;
    }, { passive: true });

    const hudLat = document.getElementById("hud-lat");
    const hudLng = document.getElementById("hud-lng");
    let frame = 0;

    (function animate() {
      requestAnimationFrame(animate);
      const time = Date.now() * 0.001;
      globeGroup.rotation.y += reduced ? 0.0008 : 0.003;
      hexGlobe.rotation.y -= 0.0015;
      globeGroup.position.x += (mx * 40 - globeGroup.position.x) * 0.05;
      globeGroup.position.y += (-my * 40 - globeGroup.position.y) * 0.05;
      pointsGroup.children.forEach((p, i) => {
        const ring = p.children[1];
        ring.scale.setScalar(1 + Math.sin(time * 3 + i) * 0.2);
        ring.material.opacity = 0.2 + Math.sin(time * 3 + i) * 0.2;
      });
      particles.rotation.y += 0.001;

      // HUD telemetry from rotation
      if (hudLat && ++frame % 6 === 0) {
        const lngDeg = ((globeGroup.rotation.y * 180 / Math.PI) % 360 + 360) % 360 - 180;
        const latDeg = Math.sin(time * 0.11) * 23.4;
        hudLat.textContent = `LAT: ${Math.abs(latDeg).toFixed(4)}\u00B0 ${latDeg >= 0 ? "N" : "S"}`;
        hudLng.textContent = `LNG: ${Math.abs(lngDeg).toFixed(4)}\u00B0 ${lngDeg >= 0 ? "E" : "W"}`;
      }

      renderer.render(scene, camera);
    })();

    addEventListener("resize", () => {
      W = container.clientWidth || innerWidth;
      H = container.clientHeight || 600;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    });
  }
})();

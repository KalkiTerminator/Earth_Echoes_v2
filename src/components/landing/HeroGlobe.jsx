import { useEffect, useRef } from "react";
import * as THREE from "three";
import { SPECIES } from "../../data/species.js";
import { prefersReducedMotion, withBase } from "../../lib/format.js";

// Solid dark earth with a teal atmospheric rim (per the design mockups),
// particle atmosphere, pulsing species markers, mouse drift, HUD telemetry.
export default function HeroGlobe({ hudLatRef, hudLngRef }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reduced = prefersReducedMotion();

    let W = container.clientWidth || window.innerWidth;
    let H = container.clientHeight || 600;

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

    // Solid, near-black textured earth — the mockup's globe is a dark sphere
    // whose continents read as subtle relief, not a wireframe.
    const earthTex = new THREE.TextureLoader().load(withBase("/textures/earth-dark.jpg"));
    earthTex.colorSpace = THREE.SRGBColorSpace;
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      new THREE.MeshPhongMaterial({ map: earthTex, color: 0x4a545c, shininess: 6 })
    );
    globeGroup.add(globe);

    // Teal atmospheric rim hugging the sphere (classic back-side fresnel glow)
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.12, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
            gl_FragColor = vec4(0.20, 0.85, 0.68, 1.0) * intensity * 1.5;
          }`,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      })
    );
    globeGroup.add(atmosphere);

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

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const pl = new THREE.PointLight(0x7de8c4, 0.8, 500);
    pl.position.set(150, 150, 150);
    scene.add(pl);

    // species markers + pulse rings
    const pointsGroup = new THREE.Group();
    globe.add(pointsGroup);
    const toVec = (lat, lng, r) => {
      const phi = (90 - lat) * Math.PI / 180, theta = (lng + 180) * Math.PI / 180;
      return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
    };
    SPECIES.forEach((sp) => {
      const p = toVec(sp.lat, sp.lng, R + 4);
      const g = new THREE.Group();
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(1.6, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x5af0b3, transparent: true, opacity: 0.85 })
      );
      dot.position.copy(p);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(3.4, 5, 32),
        new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
      );
      ring.position.copy(p.clone().multiplyScalar(1.02));
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      g.add(dot);
      g.add(ring);
      pointsGroup.add(g);
    });

    let mx = 0, my = 0;
    const onMouse = (e) => {
      mx = (e.clientX - window.innerWidth / 2) * 0.0001;
      my = (e.clientY - window.innerHeight / 2) * 0.0001;
    };
    window.addEventListener("mousemove", onMouse, { passive: true });

    let frame = 0;
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;
      globeGroup.rotation.y += reduced ? 0.0008 : 0.003;
      globeGroup.position.x += (mx * 40 - globeGroup.position.x) * 0.05;
      globeGroup.position.y += (-my * 40 - globeGroup.position.y) * 0.05;
      pointsGroup.children.forEach((p, i) => {
        const ring = p.children[1];
        ring.scale.setScalar(1 + Math.sin(time * 3 + i) * 0.2);
        ring.material.opacity = 0.2 + Math.sin(time * 3 + i) * 0.2;
      });
      particles.rotation.y += 0.001;

      // HUD telemetry from rotation
      if (hudLatRef?.current && ++frame % 6 === 0) {
        const lngDeg = ((globeGroup.rotation.y * 180 / Math.PI) % 360 + 360) % 360 - 180;
        const latDeg = Math.sin(time * 0.11) * 23.4;
        hudLatRef.current.textContent = `LAT: ${Math.abs(latDeg).toFixed(4)}° ${latDeg >= 0 ? "N" : "S"}`;
        hudLngRef.current.textContent = `LNG: ${Math.abs(lngDeg).toFixed(4)}° ${lngDeg >= 0 ? "E" : "W"}`;
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      W = container.clientWidth || window.innerWidth;
      H = container.clientHeight || 600;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="globe-container" aria-hidden="true" />;
}

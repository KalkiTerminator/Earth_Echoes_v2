// Postcard export — renders a 1200×630 shareable PNG card on a canvas.
import { fmtYear } from "./format.js";

function wrapText(x, text, left, top, maxW, lh) {
  const words = String(text).split(" ");
  let line = "", y = top;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (x.measureText(test).width > maxW && line) {
      x.fillText(line, left, y);
      line = w;
      y += lh;
    } else line = test;
  }
  if (line) x.fillText(line, left, y);
  return y + lh;
}

export async function makePostcard(species, accent) {
  try { await document.fonts.ready; } catch (e) {}
  const W = 1200, H = 630;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const x = cv.getContext("2d");
  x.fillStyle = "#07070c";
  x.fillRect(0, 0, W, H);

  const loadImage = (src) => new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

  let imgOk = false;
  try {
    const img = await loadImage(species.imageUrl).catch(() => {
      if (!species.imageRemote) throw new Error("no image");
      return loadImage(species.imageRemote);
    });
    const tw = 560, th = H;
    const sc = Math.max(tw / img.width, th / img.height);
    const sw = tw / sc, sh = th / sc;
    x.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, tw, th);
    imgOk = true;
  } catch (e) {}
  if (!imgOk) {
    const g = x.createLinearGradient(0, 0, 560, H);
    g.addColorStop(0, accent + "44");
    g.addColorStop(1, "#07070c");
    x.fillStyle = g;
    x.fillRect(0, 0, 560, H);
  }
  const fade = x.createLinearGradient(340, 0, 560, 0);
  fade.addColorStop(0, "rgba(7,7,12,0)");
  fade.addColorStop(1, "rgba(7,7,12,1)");
  x.fillStyle = fade;
  x.fillRect(340, 0, 220, H);

  const L = 600;
  x.fillStyle = accent;
  x.font = '600 15px "IBM Plex Mono", monospace';
  try { x.letterSpacing = "5px"; } catch (e) {}
  x.fillText((species.status || "").toUpperCase(), L, 110);
  try { x.letterSpacing = "0px"; } catch (e) {}

  x.fillStyle = "#f5f5f4";
  x.font = '62px "Instrument Serif", serif';
  let yPos = wrapText(x, species.name, L, 185, 540, 64);
  x.font = 'italic 26px "Instrument Serif", serif';
  x.fillStyle = "rgba(245,245,244,0.55)";
  x.fillText(species.scientific, L, yPos + 4);
  yPos += 46;

  x.font = '15px "IBM Plex Mono", monospace';
  x.fillStyle = "rgba(245,245,244,0.5)";
  x.fillText(species.yearExtinct !== null ? `Lost ${fmtYear(species.yearExtinct)}` : String(species.population), L, yPos + 16);
  yPos += 56;

  x.font = '20px "IBM Plex Sans", sans-serif';
  x.fillStyle = "rgba(245,245,244,0.72)";
  const desc = species.description.length > 260 ? species.description.slice(0, 257) + "…" : species.description;
  wrapText(x, desc, L, yPos, 520, 31);

  x.strokeStyle = "rgba(255,255,255,0.14)";
  x.beginPath();
  x.moveTo(L, H - 84);
  x.lineTo(W - 60, H - 84);
  x.stroke();
  x.font = '600 12px "IBM Plex Mono", monospace';
  x.fillStyle = "rgba(245,245,244,0.38)";
  try { x.letterSpacing = "4px"; } catch (e) {}
  x.fillText("EARTH'S ECHOES — A LIVING ATLAS", L, H - 52);
  try { x.letterSpacing = "0px"; } catch (e) {}

  cv.toBlob((b) => {
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `${species.id}-postcard.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });
}

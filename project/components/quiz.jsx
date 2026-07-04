// Guess-the-year quiz — uses the main Time Machine slider
const { useState: qzS, useMemo: qzM } = React;

function shuffledExtinct(species) {
  return [...species.filter((s) => s.yearExtinct !== null)].sort(() => Math.random() - 0.5).slice(0, 5);
}

function quizRank(total) {
  if (total >= 420) return "Master Curator";
  if (total >= 300) return "Field Naturalist";
  if (total >= 180) return "Apprentice Archivist";
  return "Fresh Recruit";
}

function Quiz({ species, year, setYear, onExit, hidden, accent }) {
  const [pool, setPool] = qzS(() => shuffledExtinct(species));
  const [idx, setIdx] = qzS(0);
  const [phase, setPhase] = qzS("guess"); // guess | reveal | done
  const [scores, setScores] = qzS([]);
  const [lastDiff, setLastDiff] = qzS(0);

  if (hidden) return null;
  const s = pool[idx];
  if (!s) return null;

  const lockIn = () => {
    const diff = Math.abs(year - s.yearExtinct);
    const p = diff <= 10 ? 100 : diff <= 50 ? 80 : diff <= 150 ? 60 : diff <= 500 ? 35 : diff <= 1500 ? 15 : 0;
    setScores([...scores, p]); setLastDiff(diff); setPhase("reveal");
    setYear(s.yearExtinct);
    window.eeSound?.panelOpen();
  };
  const next = () => {
    window.eeSound?.click();
    if (idx + 1 < pool.length) { setIdx(idx + 1); setPhase("guess"); }
    else setPhase("done");
  };
  const playAgain = () => {
    window.eeSound?.panelOpen();
    setPool(shuffledExtinct(species)); setIdx(0); setScores([]); setPhase("guess");
  };
  const total = scores.reduce((a, b) => a + b, 0);
  const lastPts = scores[scores.length - 1] || 0;

  return (
    <div data-screen-label="quiz"
      className="absolute left-1/2 -translate-x-1/2 bottom-[195px] z-30 w-[540px] max-w-[92vw] glass-solid rounded-2xl p-5 pointer-events-auto caption-enter">
      <button onClick={() => { window.eeSound?.click(); onExit(); }}
        className="absolute top-3 right-3 w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center">
        <Icons.X size={13} />
      </button>

      {phase === "guess" && (
        <>
          <div className="mono text-[9px] uppercase tracking-[0.3em] text-white/40">
            Guess the year · round {idx + 1} / {pool.length}
            {scores.length > 0 && <span className="ml-3" style={{ color: accent }}>{total} pts</span>}
          </div>
          <div className="serif text-2xl mt-2 leading-tight">When did the {s.name} disappear?</div>
          <div className="text-[12px] text-white/45 mt-1.5">Drag the Time Machine below to your guess, then lock it in.</div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="serif text-3xl tabular-nums" style={{ color: accent }}>{fmtYear(year)}</div>
            <button onClick={lockIn}
              onMouseEnter={() => window.eeSound?.hover()}
              className="h-10 px-6 rounded-full mono text-[10px] uppercase tracking-[0.25em] font-medium text-black transition hover:scale-[1.03]"
              style={{ background: accent, boxShadow: `0 0 24px ${accent}55` }}>
              Lock in
            </button>
          </div>
        </>
      )}

      {phase === "reveal" && (
        <>
          <div className="mono text-[9px] uppercase tracking-[0.3em] text-white/40">Round {idx + 1} / {pool.length}</div>
          <div className="serif text-2xl mt-2 leading-tight">
            {s.name} — <span style={{ color: accent }}>{fmtYear(s.yearExtinct)}</span>
          </div>
          <div className="text-[13px] text-white/55 mt-2">
            {lastDiff === 0 ? "Perfect. To the exact year." : `You were ${lastDiff.toLocaleString()} year${lastDiff === 1 ? "" : "s"} off.`}
            <span className="ml-2 mono text-[11px]" style={{ color: accent }}>+{lastPts} pts</span>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={next}
              onMouseEnter={() => window.eeSound?.hover()}
              className="h-10 px-6 rounded-full mono text-[10px] uppercase tracking-[0.25em] border border-white/20 hover:bg-white/10 transition">
              {idx + 1 < pool.length ? "Next" : "Finish"}
            </button>
          </div>
        </>
      )}

      {phase === "done" && (
        <>
          <div className="mono text-[9px] uppercase tracking-[0.3em] text-white/40">Final score</div>
          <div className="serif text-5xl mt-2" style={{ color: accent }}>{total} <span className="text-white/30 text-3xl">/ 500</span></div>
          <div className="text-[13px] text-white/60 mt-1.5">Rank: <span className="text-white/90">{quizRank(total)}</span></div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={playAgain}
              className="h-10 px-5 rounded-full mono text-[10px] uppercase tracking-[0.25em] border border-white/20 hover:bg-white/10 transition">
              Play again
            </button>
            <button onClick={() => { window.eeSound?.click(); onExit(); }}
              className="h-10 px-5 rounded-full mono text-[10px] uppercase tracking-[0.25em] text-black transition"
              style={{ background: accent }}>
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}

window.Quiz = Quiz;

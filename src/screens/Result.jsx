import { TIERS } from "../lib/game";
import { SixScene, FourScene, GroundScene, OutScene } from "../components/Scenes";

const OUTCOMES = {
  6: { headline: "SIX!", sub: "Out of the ground." },
  4: { headline: "FOUR!", sub: "Racing to the rope." },
  2: { headline: "TWO", sub: "Pushed into the gap." },
  1: { headline: "SINGLE", sub: "Nudged for one." },
  0: { headline: "DOT", sub: "Everyone had that one." },
};

function Scene({ reveal }) {
  if (reveal.out) return <OutScene />;
  if (reveal.your_runs === 6) return <SixScene />;
  if (reveal.your_runs === 4) return <FourScene />;
  if (reveal.your_runs > 0) return <FourScene reached={false} />;
  return <GroundScene />;
}

export default function Result({ reveal }) {
  const typed = reveal.your_guess_text;
  const matched = reveal.your_guess_name;
  const outcome = reveal.out
    ? { headline: "OUT!", sub: "Timed out. The clock beat you to the crease." }
    : OUTCOMES[reveal.your_runs];
  const runClass = reveal.out ? "rout" : `r${reveal.your_runs}`;

  // Show what they typed if it was autocorrected
  const correctedFrom =
    typed && matched && typed.toLowerCase() !== matched.toLowerCase() ? typed : null;

  return (
    <main className="screen">
      <Scene reveal={reveal} />

      <div className="field">
        <h1 className={`headline ${runClass}`}>{outcome.headline}</h1>
        <p className="sub">{outcome.sub}</p>
      </div>

      <section className={`panel${reveal.out ? " panel--out" : ""}`}>
        <p className="label">Your shot</p>
        {matched ? (
          <>
            <p className="shot">{matched}</p>
            {correctedFrom && <p className="muted small">You typed “{correctedFrom}”</p>}
          </>
        ) : (
          <p className="shot rout">No shot played</p>
        )}
      </section>

      <section className="board" aria-labelledby="board-title">
        <p className="label" id="board-title">Every valid answer</p>
        {TIERS.map((tier) => {
          const rows = reveal.board.filter((b) => b.runs === tier.runs);
          if (!rows.length) return null;
          const hasYou = rows.some((b) => b.player === reveal.your_guess);
          return (
            <div key={tier.runs} className={`tier${hasYou ? " tier--you" : ""}`}>
              <div className="tier__runs">
                <b className={`r${tier.runs}`}>{tier.runs || "•"}</b>
                <span>{tier.label}</span>
              </div>
              <ul className="chips">
                {rows.map((b) => (
                  <li key={b.player} className={`chip${b.player === reveal.your_guess ? " chip--you" : ""}`}>
                    <span>
                      {b.name}
                      {b.player === reveal.your_guess && <span className="r6"> · you</span>}
                    </span>
                    {b.note && <small>{b.note}</small>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <p className="muted small center">Next ball at midnight, NZ time.</p>
    </main>
  );
}
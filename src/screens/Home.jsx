import { GroundScene } from "../components/Scenes";
import { GAME_NAME, nzDateLabel } from "../lib/game";

const LADDER = [
  { runs: 0, mark: "•", label: "Dot" },
  { runs: 1, mark: "1", label: "Single" },
  { runs: 2, mark: "2", label: "Two" },
  { runs: 4, mark: "4", label: "Four" },
  { runs: 6, mark: "6", label: "Six" },
];

export default function Home({ onFace }) {
  return (
    <main className="screen">
      <header className="header">
        <h1 className="brand">{GAME_NAME}</h1>
        <span className="muted">{nzDateLabel()}</span>
      </header>

      <GroundScene />

      <section className="panel">
        <p className="label">The less obvious your answer, the more runs it’s worth.</p>
        <p className="shot">One question. 20 seconds. One shot.</p>
        <p className="muted small">NOTE! Only includes Westlakers who graduated between 2022 and 2024.</p>
      </section>

      <section className="field">
        <p className="label">How you score</p>
        <div className="ladder">
          {LADDER.map((t) => (
            <div key={t.runs}>
              <b className={`r${t.runs}`}>{t.mark}</b>
              <span>{t.label}</span>
            </div>
          ))}
        </div>
        <div className="ends">
          <span>Obvious</span>
          <span>Deep cut</span>
        </div>
      </section>

      <div className="spacer" />
      <button type="button" className="btn" onClick={onFace}>Face the ball</button>
      <p className="muted small center">New ball every day at midnight, NZ time.</p>
    </main>
  );
}
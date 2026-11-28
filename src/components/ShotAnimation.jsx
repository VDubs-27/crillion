// The batter plays the shot once an answer is in.
// outcome: 0 | 1 | 2 | 4 | 6 | "out"
// Pixel art on a 70×28 grid; the motion lives in index.css (.shot-anim).

const CAPTIONS = { 6: "SIX!", 4: "FOUR!", 2: "TWO", 1: "SINGLE", 0: "DOT", out: "OUT!" };
const LABELS = {
  6: "The batter launches the ball over the boundary for six",
  4: "The batter drives the ball along the ground to the rope for four",
  2: "The batter pushes the ball into the gap for two",
  1: "The batter nudges the ball for a single",
  0: "The batter blocks the ball. Dot ball",
  out: "The batter doesn't move and the ball crashes into the stumps",
};

export default function ShotAnimation({ outcome }) {
  const key = outcome === "out" ? "out" : `r${outcome}`;
  return (
    <div className={`shot-anim shot-anim--${key}`}>
      <svg className="scene" viewBox="0 0 70 28" shapeRendering="crispEdges" role="img" aria-label={LABELS[outcome]}>
        {/* night sky, crowd, grass, pitch */}
        <rect x="0" y="0" width="70" height="28" fill="#13281C" />
        <rect x="0" y="9" width="70" height="3" fill="#24402C" />
        <rect x="6" y="10" width="1" height="1" fill="#EF6A52" />
        <rect x="19" y="10" width="1" height="1" fill="#7FC8F8" />
        <rect x="33" y="10" width="1" height="1" fill="#FFC94A" />
        <rect x="47" y="10" width="1" height="1" fill="#F2E8CF" />
        <rect x="61" y="10" width="1" height="1" fill="#EF6A52" />
        <rect x="0" y="24" width="70" height="4" fill="#2C5A2E" />
        <rect x="8" y="24" width="52" height="2" fill="#C9B27A" />
        <rect x="68" y="23" width="2" height="1" fill="#F2E8CF" />

        {/* stumps behind the batter */}
        <g className="sa-stump sa-stump--1"><rect x="13" y="15" width="1" height="9" fill="#F2E8CF" /></g>
        <g className="sa-stump sa-stump--2"><rect x="15" y="15" width="1" height="9" fill="#F2E8CF" /></g>
        <g className="sa-stump sa-stump--3"><rect x="17" y="15" width="1" height="9" fill="#F2E8CF" /></g>
        <g className="sa-bail sa-bail--1"><rect x="13" y="14" width="2" height="1" fill="#FFC94A" /></g>
        <g className="sa-bail sa-bail--2"><rect x="16" y="14" width="2" height="1" fill="#FFC94A" /></g>

        {/* batter, facing the bowler on the right */}
        <rect x="20" y="10" width="3" height="2" fill="#2B4A7A" />
        <rect x="23" y="11" width="1" height="1" fill="#A9BFA9" />
        <rect x="22" y="12" width="1" height="1" fill="#F2C9A0" />
        <rect x="20" y="12" width="2" height="5" fill="#F2E8CF" />
        <rect x="22" y="14" width="2" height="1" fill="#F2E8CF" />
        <rect x="20" y="17" width="1" height="7" fill="#F2E8CF" />
        <rect x="22" y="17" width="1" height="7" fill="#F2E8CF" />
        <rect x="19" y="23" width="2" height="1" fill="#4A5F50" />
        <rect x="22" y="23" width="2" height="1" fill="#4A5F50" />

        {/* bat, swung from the hands */}
        <g className="sa-bat">
          <rect x="23" y="14" width="1" height="2" fill="#8C6A3A" />
          <rect x="23" y="16" width="2" height="6" fill="#C9B27A" />
        </g>

        {/* ball */}
        <g className="sa-ball">
          <rect x="1" y="0" width="2" height="1" fill="#D2412F" />
          <rect x="0" y="1" width="4" height="2" fill="#D2412F" />
          <rect x="1" y="3" width="2" height="1" fill="#D2412F" />
          <rect x="2" y="1" width="1" height="2" fill="#F2E8CF" />
        </g>
      </svg>
      <p className={`shot-anim__caption ${outcome === "out" ? "rout" : `r${outcome}`}`} aria-hidden="true">
        {CAPTIONS[outcome]}
      </p>
    </div>
  );
}
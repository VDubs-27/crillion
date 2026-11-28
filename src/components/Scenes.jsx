// Pixel-art scenes drawn on a 70×34 grid. crispEdges keeps the pixels sharp.

function Night({ children, label, height = 34 }) {
  return (
    <svg className="scene" viewBox={`0 0 70 ${height}`} shapeRendering="crispEdges" role="img" aria-label={label}>
      <rect x="0" y="0" width="70" height={height} fill="#13281C" />
      {children}
    </svg>
  );
}

function Ball({ x, y }) {
  return (
    <g>
      <rect x={x + 1} y={y} width="2" height="1" fill="#D2412F" />
      <rect x={x} y={y + 1} width="4" height="2" fill="#D2412F" />
      <rect x={x + 1} y={y + 3} width="2" height="1" fill="#D2412F" />
      <rect x={x + 2} y={y + 1} width="1" height="2" fill="#F2E8CF" />
    </g>
  );
}

function Crowd({ y }) {
  const dots = ["#EF6A52", "#7FC8F8", "#F2E8CF", "#FFC94A"];
  return (
    <g>
      <rect x="0" y={y} width="70" height="4" fill="#24402C" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={3 + i * 7} y={y + 1 + (i % 2)} width="1" height="1" fill={dots[i % 4]} />
      ))}
    </g>
  );
}

function Grass({ y }) {
  return (
    <g>
      <rect x="0" y={y} width="70" height={34 - y} fill="#2C5A2E" />
      <rect x="0" y={y + 4} width="70" height="2" fill="#336535" />
      <rect x="0" y={y + 9} width="70" height="2" fill="#336535" />
    </g>
  );
}

function Stumps({ x, y }) {
  return (
    <g>
      <rect x={x} y={y + 1} width="1" height="10" fill="#F2E8CF" />
      <rect x={x + 2} y={y + 1} width="1" height="10" fill="#F2E8CF" />
      <rect x={x + 4} y={y + 1} width="1" height="10" fill="#F2E8CF" />
      <rect x={x} y={y} width="5" height="1" fill="#FFC94A" />
    </g>
  );
}

function Floodlights() {
  return (
    <g>
      <rect x="6" y="4" width="1" height="13" fill="#4A5F50" />
      <rect x="4" y="2" width="5" height="2" fill="#FFC94A" />
      <rect x="63" y="4" width="1" height="13" fill="#4A5F50" />
      <rect x="61" y="2" width="5" height="2" fill="#FFC94A" />
      <rect x="20" y="5" width="1" height="1" fill="#A9BFA9" />
      <rect x="38" y="3" width="1" height="1" fill="#A9BFA9" />
      <rect x="50" y="6" width="1" height="1" fill="#A9BFA9" />
    </g>
  );
}

const Trail = ({ points }) =>
  points.map(([x, y], i) => (
    <rect key={i} x={x} y={y} width="1" height="1" fill="#F2E8CF" opacity={0.25 + (i / points.length) * 0.6} />
  ));

// Home: ball on its way down the pitch
export function GroundScene() {
  return (
    <Night label="Night match: a ball heading down the pitch towards the stumps">
      <Floodlights />
      <Crowd y={16} />
      <Grass y={20} />
      <rect x="16" y="23" width="38" height="6" fill="#C9B27A" />
      <rect x="20" y="23" width="1" height="6" fill="#F2E8CF" />
      <rect x="49" y="23" width="1" height="6" fill="#F2E8CF" />
      <Stumps x={50} y={14} />
      <Trail points={[[22, 15], [23, 15], [26, 14], [27, 14]]} />
      <Ball x={30} y={12} />
    </Night>
  );
}

// SIX: over the rope into the stand
export function SixScene() {
  return (
    <Night label="The ball sails over the boundary rope into the crowd">
      <rect x="44" y="12" width="26" height="12" fill="#24402C" />
      <Crowd y={14} />
      <Crowd y={18} />
      <Grass y={24} />
      <rect x="0" y="24" width="42" height="1" fill="#F2E8CF" />
      <rect x="42" y="23" width="2" height="2" fill="#F2E8CF" />
      <Trail points={[[17, 12], [22, 8], [28, 5], [35, 3], [42, 2]]} />
      <Ball x={48} y={2} />
      <rect x="55" y="1" width="1" height="1" fill="#FFC94A" />
      <rect x="56" y="4" width="2" height="1" fill="#FFC94A" />
    </Night>
  );
}

// FOUR / runs: along the ground towards the rope
export function FourScene({ reached = true }) {
  return (
    <Night label={reached ? "The ball races along the ground into the boundary rope" : "The ball rolls into the outfield"}>
      <Floodlights />
      <Crowd y={16} />
      <Grass y={20} />
      <rect x="58" y="20" width="12" height="1" fill="#F2E8CF" />
      <rect x="58" y="19" width="2" height="2" fill="#F2E8CF" />
      <Trail points={[[10, 26], [16, 26], [22, 25], [28, 25], [34, 24]]} />
      <Ball x={reached ? 54 : 38} y={reached ? 19 : 22} />
    </Night>
  );
}

// OUT: stumps scattered
export function OutScene() {
  return (
    <Night label="The stumps are knocked over and the bails fly off" height={30}>
      <rect x="0" y="22" width="70" height="8" fill="#2C5A2E" />
      <rect x="0" y="26" width="70" height="2" fill="#336535" />
      <rect x="20" y="22" width="30" height="4" fill="#C9B27A" />
      <rect x="33" y="12" width="1" height="10" fill="#F2E8CF" />
      <rect x="35" y="13" width="1" height="2" fill="#F2E8CF" />
      <rect x="36" y="15" width="1" height="2" fill="#F2E8CF" />
      <rect x="37" y="17" width="1" height="2" fill="#F2E8CF" />
      <rect x="38" y="19" width="1" height="3" fill="#F2E8CF" />
      <rect x="41" y="20" width="8" height="1" fill="#F2E8CF" />
      <rect x="27" y="5" width="3" height="1" fill="#FFC94A" />
      <rect x="40" y="3" width="1" height="3" fill="#FFC94A" />
      <Ball x={16} y={18} />
    </Night>
  );
}
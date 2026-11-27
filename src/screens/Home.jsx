export default function Home({ onFace }) {
  return (
    <main>
      <h1>Daily Delivery</h1>
      <p>One question. 20 seconds. One shot. The rarer your answer, the bigger the hit.</p>
      <button type="button" onClick={onFace}>Face the ball</button>
    </main>
  );
}
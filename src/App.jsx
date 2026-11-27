import { useEffect, useState } from "react";
import { supabase, ensureSession } from "./lib/supabase";

export default function App() {
  const [out, setOut] = useState("Loading…");

  useEffect(() => {
    (async () => {
      await ensureSession();
      const { data, error } = await supabase.rpc("start_ball");
      setOut(JSON.stringify(error ?? data, null, 2));
    })();
  }, []);

  return <pre>{out}</pre>;
}
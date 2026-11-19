//A clock that re-renders on an interval, so "next run in 4m" stays true
//while the page is open. 30s keeps minute-level labels accurate enough
//without waking React every second.
import { useEffect, useState } from "react";

export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

import { useEffect, useState } from "react";
import { formatTime } from "../utils/format";

/** HH:MM:SS の現在時刻を 1 秒ごとに更新。 */
export function useClock(): string {
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setTime(formatTime(new Date()));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return time;
}

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  RESP_NOISE_AMPLITUDE,
  RESP_PERIOD_SECONDS,
  SYNTH_BUFFER_SIZE,
  SYNTH_SAMPLES_PER_SECOND,
} from "../constants";

/** 合成 RESP 波形 (呼吸)。RESP_PERIOD_SECONDS 周期の正弦波 + 微ノイズ。 */
export function useRespSynth(amplitude: () => number): { getSnapshot: () => Float32Array } {
  const buffer = useMemo(() => new Float32Array(SYNTH_BUFFER_SIZE), []);
  const ordered = useMemo(() => new Float32Array(SYNTH_BUFFER_SIZE), []);
  const headRef = useRef(0);
  const phaseRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const ampRef = useRef(amplitude);
  ampRef.current = amplitude;

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = now;
      const dtMs = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const samplesPerMs = SYNTH_SAMPLES_PER_SECOND / 1000;
      const samples = Math.max(1, Math.round(dtMs * samplesPerMs));
      const phaseInc = 1 / (RESP_PERIOD_SECONDS * 1000 * samplesPerMs);
      const amp = Math.max(0, Math.min(1, ampRef.current()));

      for (let i = 0; i < samples; i++) {
        phaseRef.current = (phaseRef.current + phaseInc) % 1;
        const sine = Math.sin(phaseRef.current * Math.PI * 2);
        const noise = (Math.random() - 0.5) * RESP_NOISE_AMPLITUDE;
        buffer[headRef.current] = (sine + noise) * amp;
        headRef.current = (headRef.current + 1) % SYNTH_BUFFER_SIZE;
      }

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [buffer]);

  const getSnapshot = useCallback((): Float32Array => {
    const head = headRef.current;
    for (let i = 0; i < SYNTH_BUFFER_SIZE; i++) {
      ordered[i] = buffer[(head + i) % SYNTH_BUFFER_SIZE] ?? 0;
    }
    return ordered;
  }, [buffer, ordered]);

  return { getSnapshot };
}

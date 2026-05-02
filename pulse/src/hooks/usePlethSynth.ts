import { useCallback, useEffect, useMemo, useRef } from "react";
import { PLETH_PHASE_OFFSET, SYNTH_BUFFER_SIZE, SYNTH_SAMPLES_PER_SECOND } from "../constants";

/** 合成 PLETH 波形 (脈波)。ECG の phaseRef を参照して位相をオフセット。 */
export function usePlethSynth(
  ecgPhaseRef: React.MutableRefObject<number>,
  amplitude: () => number,
): { getSnapshot: () => Float32Array } {
  const buffer = useMemo(() => new Float32Array(SYNTH_BUFFER_SIZE), []);
  const ordered = useMemo(() => new Float32Array(SYNTH_BUFFER_SIZE), []);
  const headRef = useRef(0);
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
      const amp = Math.max(0, Math.min(1, ampRef.current()));

      for (let i = 0; i < samples; i++) {
        const phase = (ecgPhaseRef.current + 1 - PLETH_PHASE_OFFSET) % 1;
        const v = plethWaveformAt(phase) * amp;
        buffer[headRef.current] = v;
        headRef.current = (headRef.current + 1) % SYNTH_BUFFER_SIZE;
      }

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [buffer, ecgPhaseRef]);

  const getSnapshot = useCallback((): Float32Array => {
    const head = headRef.current;
    for (let i = 0; i < SYNTH_BUFFER_SIZE; i++) {
      ordered[i] = buffer[(head + i) % SYNTH_BUFFER_SIZE] ?? 0;
    }
    return ordered;
  }, [buffer, ordered]);

  return { getSnapshot };
}

/** PLETH 1 周期の波形値 (0 〜 1)。主峰 + dichroic notch + 副峰。 */
function plethWaveformAt(phase: number): number {
  if (phase < 0.4) {
    const local = phase / 0.4;
    return Math.sin(local * Math.PI) ** 1.5;
  }
  if (phase < 0.5) {
    const local = (phase - 0.4) / 0.1;
    return 0.45 * Math.sin((1 - local) * Math.PI) + 0.15;
  }
  if (phase < 0.7) {
    const local = (phase - 0.5) / 0.2;
    return 0.3 * Math.sin(local * Math.PI);
  }
  return 0;
}

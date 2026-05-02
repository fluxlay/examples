import { useCallback, useEffect, useMemo, useRef } from "react";
import { SYNTH_BUFFER_SIZE, SYNTH_SAMPLES_PER_SECOND } from "../constants";

/** 合成 ECG 波形を生成し ring buffer に貯めるフック。
 *  P-QRS-T フェーズに沿った形状を生成し、QRS 高さは amplitude に比例。
 *  phaseRef は PLETH 同期用に外部公開する。 */
export function useEcgSynth(
  bpm: () => number,
  amplitude: () => number,
): {
  getSnapshot: () => Float32Array;
  phaseRef: React.MutableRefObject<number>;
} {
  const buffer = useMemo(() => new Float32Array(SYNTH_BUFFER_SIZE), []);
  const ordered = useMemo(() => new Float32Array(SYNTH_BUFFER_SIZE), []);
  const headRef = useRef(0);
  const phaseRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const bpmRef = useRef(bpm);
  const ampRef = useRef(amplitude);
  bpmRef.current = bpm;
  ampRef.current = amplitude;

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = now;
      const dtMs = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const samplesPerMs = SYNTH_SAMPLES_PER_SECOND / 1000;
      const samples = Math.max(1, Math.round(dtMs * samplesPerMs));
      const bpmNow = Math.max(20, Math.min(220, bpmRef.current()));
      const periodMs = 60000 / bpmNow;
      const phaseInc = 1 / (periodMs * samplesPerMs);
      const amp = Math.max(0, Math.min(1, ampRef.current()));

      for (let i = 0; i < samples; i++) {
        phaseRef.current = (phaseRef.current + phaseInc) % 1;
        const v = ecgWaveformAt(phaseRef.current) * amp;
        buffer[headRef.current] = v;
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

  return { getSnapshot, phaseRef };
}

/** ECG 1 周期の波形値 (-0.4 〜 1.0)。P-QRS-T を簡略フェーズで合成。 */
function ecgWaveformAt(phase: number): number {
  // P wave (0.05 - 0.13)
  if (phase >= 0.05 && phase < 0.13) {
    const local = (phase - 0.05) / 0.08;
    return 0.15 * Math.sin(local * Math.PI);
  }
  // Q wave (0.16 - 0.18)
  if (phase >= 0.16 && phase < 0.18) {
    const local = (phase - 0.16) / 0.02;
    return -0.18 * Math.sin(local * Math.PI);
  }
  // R wave (0.18 - 0.22) sharp upward spike
  if (phase >= 0.18 && phase < 0.22) {
    const local = (phase - 0.18) / 0.04;
    return Math.sin(local * Math.PI);
  }
  // S wave (0.22 - 0.24)
  if (phase >= 0.22 && phase < 0.24) {
    const local = (phase - 0.22) / 0.02;
    return -0.3 * Math.sin(local * Math.PI);
  }
  // T wave (0.32 - 0.45)
  if (phase >= 0.32 && phase < 0.45) {
    const local = (phase - 0.32) / 0.13;
    return 0.28 * Math.sin(local * Math.PI);
  }
  return 0;
}

import { useAudio, useMediaMetadata, useProperties, useSystemMonitor } from "@fluxlay/react";
import { useCallback, useMemo, useRef } from "react";
import { AlertOverlay } from "./components/AlertOverlay";
import { BatterySegments } from "./components/BatterySegments";
import { BpmDisplay } from "./components/BpmDisplay";
import { MonitorGrid } from "./components/MonitorGrid";
import { PatientFooter } from "./components/PatientFooter";
import { PatientHeader } from "./components/PatientHeader";
import { PhonoLane } from "./components/PhonoLane";
import { VitalLane } from "./components/VitalLane";
import {
  AUDIO_NUM_BANDS,
  COLOR_BAT,
  COLOR_PHONO,
  COLOR_PLETH,
  COLOR_RESP,
  DEFAULT_ACCENT,
  DEFAULT_THRESHOLD,
  EMA_ALPHA_BAT,
  EMA_ALPHA_CPU,
  EMA_ALPHA_MEM,
  EMA_ALPHA_NET,
  EMA_EPSILON_RATE,
  FOOTER_HEIGHT,
  HEADER_HEIGHT,
  type PulseProperties,
} from "./constants";
import { useClock } from "./hooks/useClock";
import { useEcgSynth } from "./hooks/useEcgSynth";
import { usePlethSynth } from "./hooks/usePlethSynth";
import { useRespSynth } from "./hooks/useRespSynth";
import { useSmoothed } from "./hooks/useSmoothed";
import { formatBytesPerSec, formatGiB } from "./utils/format";

/** Pulse 壁紙ルート: vital signs monitor として 4 レーンと大 BPM を表示。 */
export function Wallpaper() {
  const monitor = useSystemMonitor({
    cpuIntervalMs: 200,
    memoryIntervalMs: 500,
    networkIntervalMs: 1000,
    batteryIntervalMs: 10000,
  });
  const rawProps = useProperties<Partial<PulseProperties>>();

  const accent =
    typeof rawProps.accentColor === "string" && rawProps.accentColor
      ? rawProps.accentColor
      : DEFAULT_ACCENT;
  const criticalThreshold =
    typeof rawProps.criticalThreshold === "number" && rawProps.criticalThreshold > 0
      ? rawProps.criticalThreshold
      : DEFAULT_THRESHOLD;
  const showSecondaryVitals = rawProps.showSecondaryVitals !== false;
  const showGrid = rawProps.showGrid !== false;

  const cpuSmoothed = useSmoothed(monitor.cpuUsage, EMA_ALPHA_CPU);
  const memSmoothed = useSmoothed(monitor.memoryUsage, EMA_ALPHA_MEM);
  const batSmoothed = useSmoothed(monitor.batteryLevel ?? 0, EMA_ALPHA_BAT);
  const rxSmoothed = useSmoothed(monitor.networkRxBytesPerSec, EMA_ALPHA_NET, EMA_EPSILON_RATE);
  const txSmoothed = useSmoothed(monitor.networkTxBytesPerSec, EMA_ALPHA_NET, EMA_EPSILON_RATE);

  const isCritical = cpuSmoothed >= criticalThreshold;
  const ecgColor = isCritical ? "#ff3344" : accent;

  // ECG (CPU) — bpm + amplitude getters
  const cpuRef = useRef(cpuSmoothed);
  cpuRef.current = cpuSmoothed;
  const bpmGetter = useCallback(() => 60 + cpuRef.current * 1.5, []);
  const ecgAmpGetter = useCallback(() => 0.55 + cpuRef.current * 0.004, []);

  // PLETH (Memory)
  const memRef = useRef(memSmoothed);
  memRef.current = memSmoothed;
  const plethAmpGetter = useCallback(() => 0.35 + (memRef.current / 100) * 0.55, []);

  // RESP (Network) — auto-fit scale with slow decay
  const netRef = useRef(0);
  netRef.current = rxSmoothed + txSmoothed;
  const respScaleRef = useRef(1024 * 50);
  const respAmpGetter = useCallback(() => {
    const v = netRef.current;
    if (v > respScaleRef.current) respScaleRef.current = v;
    respScaleRef.current = respScaleRef.current * 0.999 + v * 0.001;
    const ratio = v / Math.max(respScaleRef.current, 1);
    return Math.max(0.18, Math.min(1, ratio + 0.18));
  }, []);

  const ecg = useEcgSynth(bpmGetter, ecgAmpGetter);
  const pleth = usePlethSynth(ecg.phaseRef, plethAmpGetter);
  const resp = useRespSynth(respAmpGetter);

  const audio = useAudio({ numBands: AUDIO_NUM_BANDS });
  const media = useMediaMetadata();
  const audioRmsRef = useRef(0);
  const audioPeakRef = useRef(0);
  const audioSpectrumRef = useRef<number[]>([]);
  audioRmsRef.current = audio.rms;
  audioPeakRef.current = audio.peak;
  audioSpectrumRef.current = audio.spectrum;

  const currentTime = useClock();

  const rootStyle = useMemo<React.CSSProperties>(
    () => ({
      ["--accent" as string]: accent,
    }),
    [accent],
  );

  const lanesAreaStyle = useMemo<React.CSSProperties>(
    () => ({ top: HEADER_HEIGHT, bottom: FOOTER_HEIGHT }),
    [],
  );

  const laneHeight = showSecondaryVitals ? "20%" : "100%";

  const audioPrimary = media.title || (audio.rms > 0.001 ? "♪ AUDIO IN" : "— SILENT —");
  const audioSecondary = media.artist ? media.artist : media.isPlaying ? "playing" : "no signal";

  return (
    <main className="relative w-full h-full overflow-hidden font-mono" style={rootStyle}>
      <MonitorGrid visible={showGrid} />
      <AlertOverlay isCritical={isCritical} />

      <PatientHeader
        hostname={monitor.hostname}
        osName={monitor.osName}
        cpuBrand={monitor.cpuBrand}
        uptimeSecs={monitor.uptimeSecs}
        currentTime={currentTime}
      />

      <div className="absolute left-0 right-0 flex flex-col" style={lanesAreaStyle}>
        <VitalLane
          medicalLabel="Lead II"
          meaningLabel="CPU"
          primaryValue={`${cpuSmoothed.toFixed(0)} %`}
          color={ecgColor}
          baselinePercent={0.6}
          amplitudeRange={0.42}
          getSnapshot={ecg.getSnapshot}
          height={laneHeight}
        />
        {showSecondaryVitals ? (
          <>
            <VitalLane
              medicalLabel="Pleth"
              meaningLabel="Memory"
              primaryValue={`${memSmoothed.toFixed(0)} %`}
              secondaryValue={
                monitor.memoryTotal > 0
                  ? `${formatGiB(monitor.memoryUsed)} / ${formatGiB(monitor.memoryTotal)} GB`
                  : "— / — GB"
              }
              color={COLOR_PLETH}
              baselinePercent={0.7}
              amplitudeRange={0.42}
              getSnapshot={pleth.getSnapshot}
              height={laneHeight}
            />
            <VitalLane
              medicalLabel="Resp"
              meaningLabel="Network"
              primaryValue={`↓ ${formatBytesPerSec(rxSmoothed)}`}
              secondaryValue={`↑ ${formatBytesPerSec(txSmoothed)}`}
              color={COLOR_RESP}
              baselinePercent={0.5}
              amplitudeRange={0.32}
              getSnapshot={resp.getSnapshot}
              height={laneHeight}
            />
            <VitalLane
              medicalLabel="Bat"
              meaningLabel="Battery"
              primaryValue={monitor.batteryLevel === null ? "N/A" : `${batSmoothed.toFixed(0)} %`}
              color={COLOR_BAT}
              baselinePercent={0.5}
              amplitudeRange={0}
              height={laneHeight}
            >
              <BatterySegments
                level={monitor.batteryLevel === null ? null : batSmoothed}
                charging={monitor.batteryCharging}
              />
            </VitalLane>
            <PhonoLane
              primaryValue={audioPrimary}
              secondaryValue={audioSecondary}
              color={COLOR_PHONO}
              rmsRef={audioRmsRef}
              peakRef={audioPeakRef}
              spectrumRef={audioSpectrumRef}
              height={laneHeight}
              bottom
            />
          </>
        ) : null}
      </div>

      <BpmDisplay cpuUsage={cpuSmoothed} isCritical={isCritical} color={accent} />

      <PatientFooter isCritical={isCritical} currentTime={currentTime} />
    </main>
  );
}

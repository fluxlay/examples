import { useBackendMouse } from "@fluxlay/react";
import { animated, useSprings } from "@react-spring/web";
import React, { useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const PARTICLE_COUNT = 80; // パーティクルを増量
const STAR_COLORS = ["#FFFFFF", "#FFF9E3", "#E3F2FF", "#B3E5FC", "#FFFDE7"];

const MouseFollower = () => {
  const backendMouse = useBackendMouse();

  // 星々の初期配置とプロパティ
  const stars = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      size: Math.random() * 3 + 1, // 大きさにばらつき
      opacity: Math.random() * 0.5 + 0.3, // 初期不透明度
    }));
  }, []);

  const [springs, api] = useSprings(PARTICLE_COUNT, i => ({
    x: stars[i].x,
    y: stars[i].y,
    scale: 1,
    opacity: stars[i].opacity,
    config: { tension: 120, friction: 14 },
  }));

  useEffect(() => {
    const mx = ((backendMouse.x + 1) / 2) * window.innerWidth;
    const my = (1 - (backendMouse.y + 1) / 2) * window.innerHeight;

    api.start(i => {
      const s = stars[i];
      const dx = mx - s.x;
      const dy = my - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 影響範囲を 400px -> 250px に縮小
      const influence = Math.max(0, 1 - dist / 250);
      // 引き寄せの強度を 0.7 -> 0.3 に抑制（あまり大きく動かないように）
      const targetX = s.x + dx * influence * 0.3;
      const targetY = s.y + dy * influence * 0.3;

      return {
        x: targetX,
        y: targetY,
        // スケールの変化も 1+2 -> 1+0.5 に抑制
        scale: 1 + influence * 0.5,
        opacity: Math.min(1, s.opacity + influence * 0.3),
        config: {
          // より重厚でゆっくりとした動きに（tension を下げ、friction を上げる）
          tension: influence > 0 ? 80 : 40,
          friction: influence > 0 ? 30 : 60,
        },
      };
    });
  }, [backendMouse.x, backendMouse.y, api, stars]);

  return (
    <div className="w-full h-full bg-[#050B18] overflow-hidden relative">
      {/* 星座の線 */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <title>Starry Sky</title>
        {stars.map((s1, i) =>
          stars.slice(i + 1, i + 3).map(
            (
              s2, // 接続をさらに絞って繊細に
            ) => (
              <animated.line
                key={`${s1.id}-${s2.id}`}
                x1={springs[s1.id].x}
                y1={springs[s1.id].y}
                x2={springs[s2.id].x}
                y2={springs[s2.id].y}
                stroke="white"
                strokeOpacity={springs[s1.id].x.to(() => {
                  const dx = springs[s1.id].x.get() - springs[s2.id].x.get();
                  const dy = springs[s1.id].y.get() - springs[s2.id].y.get();
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  return Math.max(0, 0.15 * (1 - dist / 180));
                })}
                strokeWidth={0.5}
              />
            ),
          ),
        )}
      </svg>

      {/* 星々 */}
      {springs.map((style, i) => (
        <animated.div
          key={i.toString()}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: stars[i].size,
            height: stars[i].size,
            backgroundColor: stars[i].color,
            left: 0,
            top: 0,
            x: style.x,
            y: style.y,
            scale: style.scale,
            opacity: style.opacity,
            boxShadow: `0 0 ${stars[i].size * 2}px ${stars[i].color}`,
          }}
        />
      ))}

      <div className="absolute bottom-10 right-10 text-white/30 pointer-events-none select-none text-right">
        <h1 className="text-2xl font-light tracking-[0.3em] uppercase">Starry Sky</h1>
        <p className="text-[10px] mt-1 opacity-50">Fluxlay Elastic Interaction</p>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <MouseFollower />
  </React.StrictMode>,
);

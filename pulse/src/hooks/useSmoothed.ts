import { useEffect, useRef, useState } from "react";

/** 入力値を rAF ループで指数移動平均し、平滑化された値を返す。
 *  alpha が大きいほど追従が速く、小さいほど慣性が強い。
 *  epsilon 未満の変化では setState を抑制し、無駄な再レンダリングを防ぐ。 */
export function useSmoothed(target: number, alpha: number, epsilon = 0.05): number {
  const [value, setValue] = useState(target);
  const targetRef = useRef(target);
  const valueRef = useRef(target);
  const alphaRef = useRef(alpha);
  const epsilonRef = useRef(epsilon);
  const dispatchedRef = useRef(target);

  targetRef.current = target;
  alphaRef.current = alpha;
  epsilonRef.current = epsilon;

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const next = valueRef.current + (targetRef.current - valueRef.current) * alphaRef.current;
      valueRef.current = next;
      if (Math.abs(next - dispatchedRef.current) >= epsilonRef.current) {
        dispatchedRef.current = next;
        setValue(next);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return value;
}

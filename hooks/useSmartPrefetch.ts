"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as ort from "onnxruntime-web";

// This version is kept in sync with the installed onnxruntime-web package and used
// to avoid stale CDN or wasm bootstrap issues during development.
const ORT_VERSION = "1.21.0";
ort.env.wasm.wasmPaths = "/";
ort.env.wasm.numThreads = 1;

void ORT_VERSION;

export interface PrefetchCandidate {
  id: string;
  route: string;
  label: string;
  priorProb: number;
}

export interface PredictionState {
  route: string;
  label: string;
  probability: number;
  cosTheta: number;
  distanceNorm: number;
  prefetched: boolean;
}

export interface TelemetryMetrics {
  vx: number;
  vy: number;
  speed: number;
  dwellSec: number;
  inferenceTimeMs: number;
}

export function useSmartPrefetch(candidates: PrefetchCandidate[]) {
  const [session, setSession] = useState<ort.InferenceSession | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [predictions, setPredictions] = useState<PredictionState[]>([]);
  const [metrics, setMetrics] = useState<TelemetryMetrics>({
    vx: 0,
    vy: 0,
    speed: 0,
    dwellSec: 0,
    inferenceTimeMs: 0,
  });

  const prefetchedRoutes = useRef<Set<string>>(new Set());
  const mousePhysics = useRef({
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    vx: 0,
    vy: 0,
  });
  const mountTime = useRef<number>(0);

  useEffect(() => {
    mountTime.current = performance.now();
  }, []);

  // 1. Load ONNX model into browser memory
  useEffect(() => {
    let isMounted = true;

    async function loadModel() {
      try {
        const sess = await ort.InferenceSession.create("/intent_model.onnx", {
          executionProviders: ["wasm"],
        });
        if (isMounted) {
          setSession(sess);
          setIsModelReady(true);
        }
      } catch (err) {
        console.error("[SmartPrefetch] Failed to load ONNX session:", err);
      }
    }

    loadModel();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Track real-time mouse physics
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      const dt = Math.max(now - mousePhysics.current.lastTime, 1);

      mousePhysics.current.vx = (e.clientX - mousePhysics.current.lastX) / dt;
      mousePhysics.current.vy = (e.clientY - mousePhysics.current.lastY) / dt;
      mousePhysics.current.x = e.clientX;
      mousePhysics.current.y = e.clientY;
      mousePhysics.current.lastX = e.clientX;
      mousePhysics.current.lastY = e.clientY;
      mousePhysics.current.lastTime = now;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // 3. Inject prefetch tag
  const injectPrefetch = useCallback((route: string) => {
    if (prefetchedRoutes.current.has(route)) return;
    prefetchedRoutes.current.add(route);

    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = route;
    link.as = "document";
    document.head.appendChild(link);
    console.log(`[SmartPrefetch] Prefetched route: ${route}`);
  }, []);

  // 4. Run inference loop
  useEffect(() => {
    if (!session || !isModelReady) return;

    let animFrameId: number;
    const screenDiagonal = Math.hypot(window.innerWidth, window.innerHeight);

    const runInference = async () => {
      const { vx, vy, x, y } = mousePhysics.current;
      const speed = Math.hypot(vx, vy);
      const dwellSec = (performance.now() - mountTime.current) / 1000;

      const batchFeatures: number[][] = [];
      const routeMetadata: Array<{ route: string; label: string; cosTheta: number; distNorm: number }> = [];

      for (const candidate of candidates) {
        const el = document.getElementById(candidate.id);
        if (!el) continue;

        const rect = el.getBoundingClientRect();
        const targetCenterX = rect.left + rect.width / 2;
        const targetCenterY = rect.top + rect.height / 2;

        const dx = targetCenterX - x;
        const dy = targetCenterY - y;
        const dist = Math.hypot(dx, dy);
        const distNorm = dist / screenDiagonal;

        let cosTheta = 0;
        if (speed > 0.02 && dist > 0) {
          cosTheta = (vx * dx + vy * dy) / (speed * dist);
        }

        batchFeatures.push([
          Number(vx.toFixed(4)),
          Number(vy.toFixed(4)),
          Number(cosTheta.toFixed(4)),
          Number(distNorm.toFixed(4)),
          Number(dwellSec.toFixed(2)),
          candidate.priorProb,
        ]);

        routeMetadata.push({
          route: candidate.route,
          label: candidate.label,
          cosTheta,
          distNorm,
        });
      }

      if (batchFeatures.length > 0) {
        const startInfer = performance.now();
        const flat = new Float32Array(batchFeatures.flat());
        const inputTensor = new ort.Tensor("float32", flat, [batchFeatures.length, 6]);

        try {
          const results = await session.run({ features: inputTensor });
          const inferMs = performance.now() - startInfer;

          // skl2onnx outputs 'output_probability' as a [batch_size, 2] tensor (Col 0 = P(0), Col 1 = P(1))
          const probTensor = results.output_probability || results.probabilities || results.probability;
          const probs = probTensor.data as Float32Array;

          const updatedPredictions: PredictionState[] = routeMetadata.map((meta, idx) => {
            // Extract probability of positive class (index idx * 2 + 1)
            const prob = Number(probs[idx * 2 + 1] ?? probs[idx] ?? 0);
            const shouldPrefetch = prob >= 0.70;

            if (shouldPrefetch) {
              injectPrefetch(meta.route);
            }

            return {
              route: meta.route,
              label: meta.label,
              probability: prob,
              cosTheta: meta.cosTheta,
              distanceNorm: meta.distNorm,
              prefetched: prefetchedRoutes.current.has(meta.route),
            };
          });

          setPredictions(updatedPredictions);
          setMetrics({
            vx,
            vy,
            speed,
            dwellSec,
            inferenceTimeMs: inferMs,
          });
        } catch (err) {
          console.error("[SmartPrefetch] Inference error:", err);
        }
      }

      animFrameId = requestAnimationFrame(runInference);
    };

    animFrameId = requestAnimationFrame(runInference);
    return () => cancelAnimationFrame(animFrameId);
  }, [session, isModelReady, candidates, injectPrefetch]);

  return { isModelReady, predictions, metrics };
}
import { useEffect } from "react";

const ROOT_VARS = {
  "--pointer-x": "50%",
  "--pointer-y": "18%",
  "--scene-rx": "0deg",
  "--scene-ry": "0deg",
  "--scene-ry-soft": "0deg",
  "--scroll-depth": "0px",
  "--scroll-ambient": "0px",
  "--scroll-background": "0px",
  "--scroll-banner": "0px",
};

export default function DepthExperience({ children }) {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;

    const setVars = (values) => {
      Object.entries(values).forEach(([name, value]) => {
        root.style.setProperty(name, value);
      });
    };

    setVars(ROOT_VARS);
    root.dataset.motion = reducedMotion.matches ? "reduced" : "full";

    const updateScroll = () => {
      frame = 0;
      if (reducedMotion.matches) return;
      const depth = Math.min(window.scrollY * 0.035, 42);
      setVars({
        "--scroll-depth": `${depth.toFixed(2)}px`,
        "--scroll-ambient": `${(-depth * 0.22).toFixed(2)}px`,
        "--scroll-background": `${(-depth * 0.14).toFixed(2)}px`,
        "--scroll-banner": `${(-depth * 0.12).toFixed(2)}px`,
      });
    };

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScroll);
    };

    const handlePointer = (event) => {
      if (reducedMotion.matches || !finePointer.matches) return;
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;

      setVars({
        "--pointer-x": `${(x * 100).toFixed(2)}%`,
        "--pointer-y": `${(y * 100).toFixed(2)}%`,
        "--scene-rx": `${((0.5 - y) * 1.4).toFixed(2)}deg`,
        "--scene-ry": `${((x - 0.5) * 1.8).toFixed(2)}deg`,
        "--scene-ry-soft": `${((x - 0.5) * 0.81).toFixed(2)}deg`,
      });
    };

    const handleMotionPreference = () => {
      root.dataset.motion = reducedMotion.matches ? "reduced" : "full";
      if (reducedMotion.matches) setVars(ROOT_VARS);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointermove", handlePointer, { passive: true });
    reducedMotion.addEventListener("change", handleMotionPreference);
    updateScroll();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointermove", handlePointer);
      reducedMotion.removeEventListener("change", handleMotionPreference);
      delete root.dataset.motion;
      Object.keys(ROOT_VARS).forEach((name) => root.style.removeProperty(name));
    };
  }, []);

  return (
    <div className="experience-root">
      <div className="ambient-scene" aria-hidden="true">
        <span className="ambient-glow" />
        <span className="ambient-grid" />
        <span className="ambient-vignette" />
      </div>
      <div className="experience-content">{children}</div>
    </div>
  );
}

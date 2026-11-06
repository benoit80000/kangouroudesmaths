import { useCallback, useEffect, useRef } from 'react';

// Calque de brouillon posé sur la figure. Les traits sont enregistrés en coordonnées
// relatives (0 à 1), ce qui les garde bien placés quand la figure change de taille.
export default function Scratch({ strokes, onChange, active }) {
  const canvasRef = useRef(null);
  const current = useRef(null);

  const draw = useCallback(
    (extra) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2.5, width / 320);
      ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--scratch').trim() || '#d9631a';
      for (const stroke of extra ? [...strokes, extra] : strokes) {
        ctx.beginPath();
        stroke.forEach(([x, y], i) => (i ? ctx.lineTo(x * width, y * height) : ctx.moveTo(x * width, y * height)));
        if (stroke.length === 1) ctx.lineTo(stroke[0][0] * width + 0.1, stroke[0][1] * height);
        ctx.stroke();
      }
    },
    [strokes]
  );

  useEffect(() => {
    draw();
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => draw(current.current));
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  const point = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };

  const onPointerDown = (e) => {
    if (!active || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    current.current = [point(e)];
    draw(current.current);
  };
  const onPointerMove = (e) => {
    if (!current.current) return;
    e.preventDefault();
    current.current.push(point(e));
    draw(current.current);
  };
  const end = () => {
    if (!current.current) return;
    const stroke = current.current.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);
    current.current = null;
    onChange([...strokes, stroke]);
  };

  return (
    <canvas
      ref={canvasRef}
      className={`scratch ${active ? 'on' : ''}`}
      aria-hidden="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
    />
  );
}

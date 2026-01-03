import { useEffect, useRef } from 'react';

const TIME_INCREMENT = 0.003;
const FLOW_LAYERS = 5;
const LAYER_OFFSET = 50;
const WAVE_HEIGHT_BASE = 60;
const WAVE_HEIGHT_MULTIPLIER = 20;
const FREQUENCY_BASE = 0.008;
const FREQUENCY_MULTIPLIER = 0.002;
const SPEED_BASE = 1;
const SPEED_MULTIPLIER = 0.3;
const OPACITY_1_BASE = 0.3;
const OPACITY_1_MULTIPLIER = 0.06;
const OPACITY_2_BASE = 0.2;
const OPACITY_2_MULTIPLIER = 0.04;

export const useWaveAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let requestID: number;
    let time = 0;

    const resizeCanvas = () => {
      if (containerRef.current && canvas) {
        // Set actual canvas size to match container
        canvas.width = containerRef.current.offsetWidth;
        canvas.height = containerRef.current.offsetHeight;
      }
    };

    const animate = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += TIME_INCREMENT;

      for (let layer = 0; layer < FLOW_LAYERS; layer++) {
        ctx.beginPath();

        const layerOffset = layer * LAYER_OFFSET;
        const waveHeight = WAVE_HEIGHT_BASE + layer * WAVE_HEIGHT_MULTIPLIER;
        const frequency = FREQUENCY_BASE - layer * FREQUENCY_MULTIPLIER;
        const speed = SPEED_BASE + layer * SPEED_MULTIPLIER;

        ctx.moveTo(0, canvas.height / 2);

        for (let x = 0; x <= canvas.width; x += 5) {
          const y1 = Math.sin(x * frequency + time * speed) * waveHeight;
          const y2 = Math.cos(x * frequency * 1.5 - time * speed * 0.7) * (waveHeight * 0.5);
          // Adjust y so waves are at the bottom
          const y = canvas.height * 0.7 + y1 + y2 + layerOffset - 50;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();

        const opacity1 = OPACITY_1_BASE + layer * OPACITY_1_MULTIPLIER;
        const opacity2 = OPACITY_2_BASE + layer * OPACITY_2_MULTIPLIER;

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

        // Purple colors
        gradient.addColorStop(0, `rgba(126, 34, 206,  ${opacity1})`); // purple-700
        gradient.addColorStop(0.5, `rgba(168, 85, 247, ${(opacity1 + opacity2) / 2})`); // purple-400
        gradient.addColorStop(1, `rgba(126, 34, 206, ${opacity2})`);

        ctx.fillStyle = gradient;
        ctx.fill();
      }

      requestID = requestAnimationFrame(animate);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(requestID);
      } else {
        animate();
      }
    };

    // Initialize
    resizeCanvas();
    animate();

    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(requestID);
    };
  }, []);

  return { canvasRef, containerRef };
};

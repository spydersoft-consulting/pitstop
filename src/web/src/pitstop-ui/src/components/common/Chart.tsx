import { useEffect, useRef } from "react";
import ChartJS from "chart.js/auto";
import type { ChartData, ChartOptions, ChartType } from "chart.js";

interface ChartProps {
  type: ChartType;
  data: ChartData;
  options?: ChartOptions;
  className?: string;
}

export const Chart: React.FC<ChartProps> = ({ type, data, options, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current = new ChartJS(canvasRef.current, { type, data, options });
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [type, data, options]);

  return (
    <div className={`relative ${className ?? ""}`.trim()}>
      <canvas ref={canvasRef} />
    </div>
  );
};

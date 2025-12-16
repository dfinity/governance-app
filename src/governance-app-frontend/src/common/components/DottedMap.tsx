import * as React from 'react';
import { createMap } from 'svg-dotted-map';

import { cn } from '@common/utils/shadcn';

interface Marker {
  lat: number;
  lng: number;
  size?: number;
}

export interface DottedMapProps extends React.SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  mapSamples?: number;
  markers?: Marker[];
  dotColor?: string;
  markerColor?: string;
  dotRadius?: number;
  stagger?: boolean;
  markerClassName?: string;
}

interface MapBackgroundProps {
  points: { x: number; y: number }[];
  yToRowIndex: Map<number, number>;
  xStep: number;
  dotRadius: number;
  stagger: boolean;
}

// Optimization: Separate the static background dots into a memoized component
// This prevents re-rendering thousands of SVG circles when only the markers change.
const MapBackground = React.memo(
  ({ points, yToRowIndex, xStep, dotRadius, stagger }: MapBackgroundProps) => {
    return (
      <g className="text-gray-500 dark:text-gray-500">
        {points.map((point, index) => {
          const rowIndex = yToRowIndex.get(point.y) ?? 0;
          const offsetX = stagger && rowIndex % 2 === 1 ? xStep / 2 : 0;
          return (
            <circle
              cx={point.x + offsetX}
              cy={point.y}
              r={dotRadius}
              fill="currentColor"
              key={`${point.x}-${point.y}-${index}`}
            />
          );
        })}
      </g>
    );
  },
);

export function DottedMap({
  width = 150,
  height = 75,
  mapSamples = 5000,
  markers = [],
  markerColor = '#FF6900',
  dotRadius = 0.2,
  stagger = true,
  className,
  markerClassName,
  style,
}: DottedMapProps) {
  // Memoize map creation to avoid recalculation on every render
  const { points, addMarkers } = React.useMemo(() => {
    return createMap({
      width,
      height,
      mapSamples,
    });
  }, [width, height, mapSamples]);

  // Compute stagger helpers in a single, simple pass
  const { xStep, yToRowIndex } = React.useMemo(() => {
    const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x);
    const rowMap = new Map<number, number>();
    let step = 0;
    let prevY = Number.NaN;
    let prevXInRow = Number.NaN;

    for (const p of sorted) {
      if (p.y !== prevY) {
        // new row
        prevY = p.y;
        prevXInRow = Number.NaN;
        if (!rowMap.has(p.y)) rowMap.set(p.y, rowMap.size);
      }
      if (!Number.isNaN(prevXInRow)) {
        const delta = p.x - prevXInRow;
        if (delta > 0) step = step === 0 ? delta : Math.min(step, delta);
      }
      prevXInRow = p.x;
    }

    return { xStep: step || 1, yToRowIndex: rowMap };
  }, [points]);

  // Markers depend on `markers` prop, so we calculate them here.
  // Because createMap returns a new `addMarkers` function each time (if strict),
  // but we memoized the result above. Ideally `addMarkers` is stable or we use the one from memo.
  const processedMarkers = React.useMemo(() => addMarkers(markers), [addMarkers, markers]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn(className)}
      style={{ width: '100%', height: '100%', ...style }}
    >
      <MapBackground
        points={points}
        yToRowIndex={yToRowIndex}
        xStep={xStep}
        dotRadius={dotRadius}
        stagger={stagger}
      />

      {processedMarkers.map((marker, index) => {
        const rowIndex = yToRowIndex.get(marker.y) ?? 0;
        const offsetX = stagger && rowIndex % 2 === 1 ? xStep / 2 : 0;
        return (
          <circle
            cx={marker.x + offsetX}
            cy={marker.y}
            r={marker.size ?? dotRadius}
            fill={markerColor}
            className={markerClassName}
            key={`${marker.x}-${marker.y}-${index}`}
          />
        );
      })}
    </svg>
  );
}

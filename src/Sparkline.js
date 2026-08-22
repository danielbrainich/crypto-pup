import { useRef, useState, useCallback } from "react";

const VIEW_W = 300;
const VIEW_H = 100;
const PAD_X = 6;
const PAD_Y = 10;

const COLOR_UP = "#22c55e"; // matches text-green-500 used for positive change
const COLOR_DOWN = "#ef4444"; // matches text-red-500 used for negative change

const formatPrice = (value) =>
    `$${value.toLocaleString(undefined, {
        minimumFractionDigits: value < 1 ? 4 : 2,
        maximumFractionDigits: value < 1 ? 4 : 2,
    })}`;

const formatTime = (timestamp, period) => {
    const date = new Date(timestamp);
    return period === "24h"
        ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const Sparkline = ({ prices, period, positive, darkMode, className = "" }) => {
    const containerRef = useRef(null);
    const [hoverIndex, setHoverIndex] = useState(null);

    const lineColor = positive ? COLOR_UP : COLOR_DOWN;
    const ringColor = darkMode ? "#1f2937" : "#ffffff";

    const values = prices.map(([, price]) => price);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const xAt = (i) =>
        PAD_X + (i / (prices.length - 1)) * (VIEW_W - PAD_X * 2);
    const yAt = (v) =>
        VIEW_H - PAD_Y - ((v - min) / range) * (VIEW_H - PAD_Y * 2);

    const linePoints = prices.map(([, v], i) => `${xAt(i)},${yAt(v)}`);
    const linePath = `M${linePoints.join(" L")}`;

    const baselineY = VIEW_H - PAD_Y;
    const areaPath = `${linePath} L${xAt(prices.length - 1)},${baselineY} L${xAt(0)},${baselineY} Z`;
    const startY = yAt(values[0]);

    const lastIndex = prices.length - 1;
    const activeIndex = hoverIndex ?? lastIndex;
    const activePoint = prices[activeIndex];

    const updateHoverFromClientX = useCallback(
        (clientX) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect || rect.width === 0) return;
            const fraction = Math.min(
                1,
                Math.max(0, (clientX - rect.left) / rect.width)
            );
            setHoverIndex(Math.round(fraction * lastIndex));
        },
        [lastIndex]
    );

    const tooltipLeftPct = (xAt(activeIndex) / VIEW_W) * 100;
    const tooltipAlign =
        tooltipLeftPct < 20 ? "left" : tooltipLeftPct > 80 ? "right" : "center";

    return (
        <div
            ref={containerRef}
            className={`relative w-full select-none ${className}`}
            role="img"
            aria-label={`Price trend, ${formatPrice(values[0])} to ${formatPrice(
                values[values.length - 1]
            )}`}
            onPointerMove={(e) => updateHoverFromClientX(e.clientX)}
            onPointerLeave={() => setHoverIndex(null)}
            style={{ touchAction: "pan-y" }}
        >
            <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                className="w-full h-full"
                preserveAspectRatio="none"
                aria-hidden="true"
            >
                {/* start-price baseline */}
                <line
                    x1={PAD_X}
                    y1={startY}
                    x2={VIEW_W - PAD_X}
                    y2={startY}
                    stroke={darkMode ? "#4b5563" : "#d1d5db"}
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                />

                <path d={areaPath} fill={lineColor} opacity="0.12" />

                <path
                    d={linePath}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                />

                {hoverIndex !== null && (
                    <line
                        x1={xAt(hoverIndex)}
                        y1={PAD_Y}
                        x2={xAt(hoverIndex)}
                        y2={baselineY}
                        stroke={darkMode ? "#6b7280" : "#9ca3af"}
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                    />
                )}
            </svg>

            {/* Rendered as an HTML circle, not SVG, so it stays round even
                though the chart above it is stretched non-uniformly
                (preserveAspectRatio="none") to fill its box. */}
            {hoverIndex !== null && (
                <div
                    className="absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                        left: `${(xAt(activeIndex) / VIEW_W) * 100}%`,
                        top: `${(yAt(activePoint[1]) / VIEW_H) * 100}%`,
                        backgroundColor: lineColor,
                        boxShadow: `0 0 0 2px ${ringColor}`,
                    }}
                />
            )}

            {hoverIndex !== null && (
                <div
                    className={`absolute -top-9 px-2 py-1 rounded bg-gray-800 dark:bg-gray-700 text-white text-[11px] font-jet whitespace-nowrap pointer-events-none shadow ${
                        tooltipAlign === "left"
                            ? "left-0"
                            : tooltipAlign === "right"
                            ? "right-0"
                            : "left-1/2 -translate-x-1/2"
                    }`}
                    style={
                        tooltipAlign === "center"
                            ? { left: `${tooltipLeftPct}%` }
                            : undefined
                    }
                >
                    {formatPrice(activePoint[1])} · {formatTime(activePoint[0], period)}
                </div>
            )}
        </div>
    );
};

export default Sparkline;

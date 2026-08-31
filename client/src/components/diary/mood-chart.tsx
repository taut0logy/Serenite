"use client";

import {
    Area,
    AreaChart,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { format } from "date-fns";

import { moodMeta } from "@/lib/diary/mood";

interface MoodPoint {
    date: Date;
    mood: string;
    confidence: number;
}

interface MoodChartProps {
    data?: MoodPoint[];
    fullSize?: boolean;
}

/**
 * The mood trend.
 *
 * This used to fall back to five hardcoded points from January 2024 whenever
 * it had no real data, so a member who had never written anything was shown a
 * mood history that looked like theirs and was invented. In an app about
 * somebody's mental state that is the worst possible default; an empty chart
 * says the true thing.
 */
export function MoodChart({ data = [], fullSize = false }: MoodChartProps) {
    const points = data
        .filter((d) => d.date instanceof Date && !Number.isNaN(d.date.getTime()))
        .map((d) => ({
            time: d.date.getTime(),
            label: format(d.date, "d MMM"),
            mood: moodMeta(d.mood).label,
            value: moodMeta(d.mood).value,
            confidence: d.confidence,
        }))
        .sort((a, b) => a.time - b.time);

    if (points.length === 0) {
        return (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center">
                <p className="text-sm font-medium">No trend yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Once a few entries have been scored, the shape of the last weeks shows here.
                </p>
            </div>
        );
    }

    // A single point has no shape to read; a line between one dot and nothing
    // implies a trend that has not been observed.
    if (points.length === 1) {
        const only = points[0];
        return (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center">
                <p className="text-sm font-medium capitalize">{only.mood}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    One scored entry so far, on {only.label}. A trend needs at least two.
                </p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={fullSize ? 320 : "100%"}>
            <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -28 }}>
                <defs>
                    <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    minTickGap={16}
                />
                <YAxis
                    domain={[-1, 1]}
                    ticks={[-1, 0, 1]}
                    tickFormatter={(v: number) => (v > 0 ? "good" : v < 0 ? "hard" : "even")}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                    className="fill-muted-foreground"
                    width={56}
                />
                <ReferenceLine y={0} className="stroke-border" strokeDasharray="2 2" />
                <Tooltip content={<MoodTooltip />} />
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#moodFill)"
                    dot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

function MoodTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: Array<{ payload: { label: string; mood: string; confidence: number } }>;
}) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;

    return (
        <div className="rounded-lg border bg-background p-2.5 shadow-md">
            <p className="text-xs text-muted-foreground">{point.label}</p>
            <p className="text-sm font-medium capitalize">{point.mood}</p>
            {/* Confidence is a 0-1 probability. It used to be rounded as if it
                were already a percentage, so 0.9 rendered as "1%". */}
            <p className="text-xs text-muted-foreground">
                {Math.round(point.confidence * 100)}% confident
            </p>
        </div>
    );
}

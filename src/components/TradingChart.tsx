"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaSeries,
  CrosshairMode,
  HistogramSeries,
  createChart,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { money } from "@/lib/fmt";

interface PricePoint {
  t: string;
  p: number;
}

interface TradePrint {
  at: string;
  total: number;
}

interface Props {
  symbol: string;
  series: PricePoint[];
  recentTrades?: TradePrint[];
}

interface HoverState {
  price: number;
  time: string;
}

function toChartTime(iso: string): UTCTimestamp {
  return Math.floor(new Date(iso).getTime() / 1000) as UTCTimestamp;
}

function formatTime(time: UTCTimestamp): string {
  return new Date(Number(time) * 1000).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TradingChart({ symbol, series, recentTrades = [] }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [range, setRange] = useState("ALL");

  const chartData = useMemo(() => {
    const bySecond = new Map<number, number>();
    for (const point of series ?? []) {
      const time = Number(toChartTime(point.t));
      if (Number.isFinite(time) && Number.isFinite(point.p)) bySecond.set(time, point.p);
    }
    return Array.from(bySecond.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([time, value]) => ({ time: time as UTCTimestamp, value }));
  }, [series]);

  const volumeData = useMemo(() => {
    const bySecond = new Map<number, number>();
    for (const trade of recentTrades ?? []) {
      const time = Number(toChartTime(trade.at));
      if (!Number.isFinite(time) || !Number.isFinite(trade.total)) continue;
      bySecond.set(time, (bySecond.get(time) ?? 0) + trade.total);
    }
    return Array.from(bySecond.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([time, value]) => ({
        time: time as UTCTimestamp,
        value,
        color: "rgba(255, 179, 0, 0.22)",
      }));
  }, [recentTrades]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || chartData.length < 2) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 360,
      autoSize: true,
      layout: {
        background: { color: "#10141C" },
        textColor: "#8B93A3",
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(30, 37, 50, 0.72)" },
        horzLines: { color: "rgba(30, 37, 50, 0.72)" },
      },
      rightPriceScale: {
        borderColor: "#1E2532",
        scaleMargins: { top: 0.08, bottom: volumeData.length > 0 ? 0.28 : 0.1 },
      },
      timeScale: {
        borderColor: "#1E2532",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255, 179, 0, 0.32)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#FFB300",
        },
        horzLine: {
          color: "rgba(255, 179, 0, 0.32)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#FFB300",
        },
      },
      localization: {
        priceFormatter: (price: number) => `${money(price)} $H`,
      },
    });

    const area = chart.addSeries(AreaSeries, {
      lineColor: "#FFB300",
      topColor: "rgba(255, 179, 0, 0.34)",
      bottomColor: "rgba(255, 179, 0, 0.02)",
      lineWidth: 2,
      priceLineVisible: true,
      priceLineColor: "#FFB300",
      priceLineWidth: 1,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });
    area.setData(chartData);

    if (volumeData.length > 0) {
      const volume = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      volume.priceScale().applyOptions({
        scaleMargins: { top: 0.78, bottom: 0 },
        borderVisible: false,
      });
      volume.setData(volumeData);
    }

    const last = chartData[chartData.length - 1];
    area.createPriceLine({
      price: last.value,
      color: "#FFB300",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "spot",
    });

    chart.timeScale().fitContent();
    setHover({ price: last.value, time: formatTime(last.time) });

    chart.subscribeCrosshairMove((param) => {
      const point = param.seriesData.get(area) as { value?: number; time?: UTCTimestamp } | undefined;
      if (!param.time || !point?.value) {
        setHover({ price: last.value, time: formatTime(last.time) });
        return;
      }
      setHover({ price: point.value, time: formatTime(param.time as UTCTimestamp) });
    });

    chartRef.current = chart;
    return () => {
      chartRef.current = null;
      chart.remove();
    };
  }, [chartData, volumeData]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || chartData.length < 2) return;
    const scale = chart.timeScale();
    if (range === "ALL") {
      scale.fitContent();
      return;
    }
    const count = range === "1H" ? 24 : range === "24H" ? 80 : 180;
    scale.setVisibleLogicalRange({
      from: Math.max(0, chartData.length - count),
      to: chartData.length + 4,
    });
  }, [range, chartData]);

  if (!series || chartData.length < 2) {
    return (
      <div className="panel h-[360px] flex items-center justify-center">
        <span className="font-mono text-xs text-mut">No trades yet - be the first print.</span>
      </div>
    );
  }

  const first = chartData[0].value;
  const last = chartData[chartData.length - 1].value;
  const change = first > 0 ? ((last - first) / first) * 100 : 0;

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="eyebrow">Live curve chart</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-3 font-mono">
            <span className="text-xl text-amber tnum">{symbol}</span>
            <span className="text-paper tnum">{hover ? money(hover.price) : money(last)} $H</span>
            <span className={change >= 0 ? "text-up tnum text-sm" : "text-down tnum text-sm"}>
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)}%
            </span>
            <span className="text-xs text-mut">{hover?.time}</span>
          </div>
        </div>
        <div className="flex rounded border border-line bg-ink p-1 font-mono text-[11px]">
          {["1H", "24H", "7D", "ALL"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded transition ${
                range === r ? "bg-amber text-ink" : "text-mut hover:text-amber"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="h-[360px] w-full min-w-0" />
    </div>
  );
}

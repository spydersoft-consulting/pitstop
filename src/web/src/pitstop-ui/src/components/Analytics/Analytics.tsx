import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faGasPump,
  faGaugeHigh,
  faDollarSign,
  faCar,
} from "@fortawesome/free-solid-svg-icons";
import { Card } from "primereact/card";
import { Chart } from "primereact/chart";
import { ProgressSpinner } from "primereact/progressspinner";
import { useAppSelector } from "../../store/hooks";
import { analyticsApi } from "../../api/analyticsApi";
import type {
  MpgOverTimeResponse,
  SpendResponse,
  SummaryResponse,
} from "../../api/generated/types.gen";
import { PageHeader } from "../layout/PageHeader";
import { KpiTile } from "../layout/KpiTile";

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const monthLabel = (year: number | string | undefined, month: number | string | undefined) => {
  const m = num(month);
  const y = num(year);
  if (m === null || y === null) return "";
  const idx = Math.min(Math.max(Math.trunc(m) - 1, 0), 11);
  return `${MONTH_LABELS[idx]} ${String(y).slice(-2)}`;
};

interface ChartCardProps {
  title: string;
  currentValue?: string;
  hasData: boolean;
  children: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  currentValue,
  hasData,
  children,
}) => (
  <Card>
    <div className="flex items-baseline justify-between gap-2 mb-3">
      <h2 className="font-display text-base uppercase tracking-wide text-content">
        {title}
      </h2>
      {currentValue && (
        <span className="font-numeric text-lg text-brand">{currentValue}</span>
      )}
    </div>
    {hasData ? (
      <div className="h-56">{children}</div>
    ) : (
      <div className="h-56 flex items-center justify-center text-content-muted">
        <p className="text-sm">Not enough data yet.</p>
      </div>
    )}
  </Card>
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: "#5b6470" } },
    y: { grid: { color: "#eef0f3" }, ticks: { color: "#5b6470" } },
  },
};

const chartOptionsWithLegend = {
  ...chartOptions,
  plugins: { legend: { display: true, position: "top" as const } },
};

export const Analytics: React.FC = () => {
  const selectedVehicleId = useAppSelector((s) => s.vehicles.selectedVehicleId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [mpg, setMpg] = useState<MpgOverTimeResponse | null>(null);
  const [spend, setSpend] = useState<SpendResponse | null>(null);

  useEffect(() => {
    if (selectedVehicleId == null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      analyticsApi.summary(selectedVehicleId),
      analyticsApi.mpg(selectedVehicleId),
      analyticsApi.spend(selectedVehicleId),
    ])
      .then(([s, m, sp]) => {
        if (cancelled) return;
        setSummary(s);
        setMpg(m);
        setSpend(sp);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load analytics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedVehicleId]);

  /* ---------- chart datasets ---------- */

  const mpgChart = useMemo(() => {
    const points = mpg?.points ?? [];
    return {
      labels: points.map((p) =>
        p.date
          ? new Date(p.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })
          : "",
      ),
      datasets: [
        {
          label: "MPG",
          data: points.map((p) => num(p.mpg) ?? 0),
          borderColor: "#e10600",
          backgroundColor: "rgba(225, 6, 0, 0.08)",
          tension: 0.3,
          fill: true,
          pointRadius: 2,
        },
        {
          label: "Rolling avg",
          data: points.map((p) => num(p.rollingAvg) ?? 0),
          borderColor: "#0f1115",
          backgroundColor: "transparent",
          borderDash: [4, 4],
          tension: 0.3,
          fill: false,
          pointRadius: 0,
        },
      ],
    };
  }, [mpg]);

  const spendChart = useMemo(() => {
    const points = spend?.points ?? [];
    return {
      labels: points.map((p) => monthLabel(p.year, p.month)),
      datasets: [
        {
          label: "Spend ($)",
          data: points.map((p) => num(p.totalSpend) ?? 0),
          backgroundColor: "#0f1115",
          borderRadius: 4,
        },
      ],
    };
  }, [spend]);

  const pricePerGallonChart = useMemo(() => {
    const points = spend?.points ?? [];
    return {
      labels: points.map((p) => monthLabel(p.year, p.month)),
      datasets: [
        {
          label: "$/gal",
          data: points.map((p) => {
            const s = num(p.totalSpend) ?? 0;
            const g = num(p.totalGallons) ?? 0;
            return g > 0 ? Number((s / g).toFixed(3)) : 0;
          }),
          borderColor: "#e10600",
          backgroundColor: "rgba(225, 6, 0, 0.08)",
          tension: 0.3,
          fill: true,
          pointRadius: 2,
        },
      ],
    };
  }, [spend]);

  const gallonsPerFillChart = useMemo(() => {
    const points = spend?.points ?? [];
    return {
      labels: points.map((p) => monthLabel(p.year, p.month)),
      datasets: [
        {
          label: "Gallons / fill",
          data: points.map((p) => {
            const g = num(p.totalGallons) ?? 0;
            const c = num(p.fillUpCount) ?? 0;
            return c > 0 ? Number((g / c).toFixed(2)) : 0;
          }),
          backgroundColor: "#e10600",
          borderRadius: 4,
        },
      ],
    };
  }, [spend]);

  /* ---------- current-value summaries on each chart card ---------- */

  const lastSpendPoint = (() => {
    const pts = spend?.points ?? [];
    return pts.length > 0 ? pts[pts.length - 1] : undefined;
  })();
  const lastSpendValue = num(lastSpendPoint?.totalSpend);
  const lastPpg =
    lastSpendPoint &&
    (num(lastSpendPoint.totalGallons) ?? 0) > 0
      ? (num(lastSpendPoint.totalSpend) ?? 0) /
        (num(lastSpendPoint.totalGallons) ?? 1)
      : null;
  const lastGpf =
    lastSpendPoint &&
    (num(lastSpendPoint.fillUpCount) ?? 0) > 0
      ? (num(lastSpendPoint.totalGallons) ?? 0) /
        (num(lastSpendPoint.fillUpCount) ?? 1)
      : null;
  const rollingMpg = num(summary?.rollingAvgMpg10) ?? num(summary?.overallMpg);

  /* ---------- render guards ---------- */

  if (selectedVehicleId == null) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" />
        <Card>
          <div className="text-center py-12 text-content-muted">
            <FontAwesomeIcon icon={faCar} className="text-3xl mb-3" />
            <p>Select a vehicle to view analytics.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" />
        <div className="flex justify-center py-16">
          <ProgressSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" />
        <Card>
          <div className="text-center py-12 text-content-muted">
            <p className="text-danger mb-2">Couldn't load analytics.</p>
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  const totalFillUps = num(summary?.totalFillUps) ?? 0;
  const totalSpend = num(summary?.totalSpend) ?? 0;
  const overallMpg = num(summary?.overallMpg);

  if (totalFillUps < 2) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" />
        <Card>
          <div className="text-center py-12 text-content-muted">
            <FontAwesomeIcon icon={faChartLine} className="text-4xl mb-3" />
            <p className="text-lg">
              Log at least two fill-ups to see analytics.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" />

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiTile
          icon={faGasPump}
          label="Total fill-ups"
          value={totalFillUps.toString()}
        />
        <KpiTile
          icon={faDollarSign}
          label="Total spend"
          value={`$${totalSpend.toFixed(2)}`}
        />
        <KpiTile
          icon={faGaugeHigh}
          label="Overall MPG"
          value={overallMpg === null ? "—" : overallMpg.toFixed(1)}
        />
      </div>

      {/* Bento chart grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ChartCard
          title="MPG Trend"
          currentValue={
            rollingMpg === null ? undefined : `${rollingMpg.toFixed(1)} mpg`
          }
          hasData={(mpg?.points?.length ?? 0) > 1}
        >
          <Chart
            type="line"
            data={mpgChart}
            options={chartOptionsWithLegend}
            className="h-full w-full"
          />
        </ChartCard>

        <ChartCard
          title="Monthly Spend"
          currentValue={
            lastSpendValue === null ? undefined : `$${lastSpendValue.toFixed(0)}`
          }
          hasData={(spend?.points?.length ?? 0) > 0}
        >
          <Chart
            type="bar"
            data={spendChart}
            options={chartOptions}
            className="h-full w-full"
          />
        </ChartCard>

        <ChartCard
          title="Avg $/gal"
          currentValue={lastPpg === null ? undefined : `$${lastPpg.toFixed(3)}`}
          hasData={(spend?.points?.length ?? 0) > 1}
        >
          <Chart
            type="line"
            data={pricePerGallonChart}
            options={chartOptions}
            className="h-full w-full"
          />
        </ChartCard>

        <ChartCard
          title="Gallons / fill"
          currentValue={lastGpf === null ? undefined : lastGpf.toFixed(2)}
          hasData={(spend?.points?.length ?? 0) > 0}
        >
          <Chart
            type="bar"
            data={gallonsPerFillChart}
            options={chartOptions}
            className="h-full w-full"
          />
        </ChartCard>
      </div>
    </div>
  );
};

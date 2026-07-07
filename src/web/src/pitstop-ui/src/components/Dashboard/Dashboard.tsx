import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGasPump,
  faCar,
  faPlus,
  faGaugeHigh,
  faDollarSign,
  faRoad,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Chart } from "primereact/chart";
import { Dropdown } from "primereact/dropdown";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectVehicle, type Vehicle } from "../../store/slices/vehicleSlice";
import type { FillUp } from "../../store/slices/fillUpSlice";
import { PageHeader } from "../layout/PageHeader";
import { KpiTile } from "../layout/KpiTile";

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { vehicles, selectedVehicleId } = useAppSelector((s) => s.vehicles);
  const { recentFillUps } = useAppSelector((s) => s.fillUps);

  const selectedVehicle = vehicles.find(
    (v: Vehicle | null | undefined) => v?.id === selectedVehicleId,
  );

  const sortedFillUps = useMemo(
    () =>
      [...recentFillUps].sort(
        (a, b) =>
          new Date(a.filledAt ?? 0).getTime() -
          new Date(b.filledAt ?? 0).getTime(),
      ),
    [recentFillUps],
  );

  const lastFillUp = sortedFillUps[sortedFillUps.length - 1];

  const avgMpg = useMemo(() => {
    const vals = sortedFillUps
      .map((f) => num(f.mpgThisFillUp))
      .filter((v): v is number => v !== null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [sortedFillUps]);

  const costPerMile = lastFillUp ? num(lastFillUp.costPerMile) : null;
  const lastCost = lastFillUp ? num(lastFillUp.totalCost) : null;
  const tank = selectedVehicle ? num(selectedVehicle.tankCapacityGallons) : null;
  const estRange = tank !== null && avgMpg !== null ? tank * avgMpg : null;

  /* ---------- charts ---------- */

  const mpgChartData = useMemo(() => {
    const withMpg = sortedFillUps.filter((f) => num(f.mpgThisFillUp) !== null);
    return {
      labels: withMpg.map((f) =>
        new Date(f.filledAt ?? 0).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      ),
      datasets: [
        {
          label: "MPG",
          data: withMpg.map((f) => num(f.mpgThisFillUp) ?? 0),
          borderColor: "#e10600",
          backgroundColor: "rgba(225, 6, 0, 0.08)",
          tension: 0.3,
          fill: true,
          pointRadius: 2,
        },
      ],
    };
  }, [sortedFillUps]);

  const spendChartData = useMemo(() => {
    const recent = sortedFillUps.slice(-12);
    return {
      labels: recent.map((f) =>
        new Date(f.filledAt ?? 0).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      ),
      datasets: [
        {
          label: "Total cost ($)",
          data: recent.map((f) => num(f.totalCost) ?? 0),
          backgroundColor: "#0f1115",
          borderRadius: 4,
        },
      ],
    };
  }, [sortedFillUps]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#5b6470" } },
      y: { grid: { color: "#eef0f3" }, ticks: { color: "#5b6470" } },
    },
  };

  const recentList = sortedFillUps.slice(-5).reverse();

  /* ---------- empty state: no vehicle ---------- */

  if (!selectedVehicle) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="text-center py-12">
            <FontAwesomeIcon
              icon={faCar}
              className="text-4xl mb-3 text-content-muted"
            />
            <p className="text-lg mb-3">No vehicle selected.</p>
            <Button
              label="Add a vehicle"
              icon={<FontAwesomeIcon icon={faPlus} className="mr-2" />}
              onClick={() => navigate("/vehicles/new")}
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button
            label="Log Fill-Up"
            icon={<FontAwesomeIcon icon={faPlus} className="mr-2" />}
            onClick={() => navigate("/fill-ups/new")}
          />
        }
      />

      {/* Row 1 — Hero vehicle + KPIs */}
      <Card>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6 items-center">
          {/* Hero side */}
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-inverse text-brand shrink-0">
              <FontAwesomeIcon icon={faCar} className="text-3xl" />
            </div>
            <div className="min-w-0 flex-1">
              {vehicles.length > 1 ? (
                <Dropdown
                  value={selectedVehicleId}
                  options={vehicles.map((v) => ({
                    label: `${v.year} ${v.make} ${v.model}`,
                    value: v.id,
                  }))}
                  onChange={(e) => dispatch(selectVehicle(e.value))}
                  className="w-full"
                />
              ) : (
                <p className="font-display text-2xl uppercase tracking-wide truncate">
                  {selectedVehicle.year} {selectedVehicle.make}{" "}
                  {selectedVehicle.model}
                </p>
              )}
              <p className="text-sm text-content-muted truncate">
                {selectedVehicle.name}
                {selectedVehicle.trim ? ` · ${selectedVehicle.trim}` : ""}
              </p>
            </div>
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiTile
              icon={faGaugeHigh}
              label="Avg MPG"
              value={avgMpg === null ? "—" : avgMpg.toFixed(1)}
            />
            <KpiTile
              icon={faDollarSign}
              label="$ / mile"
              value={costPerMile === null ? "—" : costPerMile.toFixed(3)}
            />
            <KpiTile
              icon={faGasPump}
              label="Last fill"
              value={lastCost === null ? "—" : `$${lastCost.toFixed(2)}`}
            />
            <KpiTile
              icon={faRoad}
              label="Est. range"
              value={estRange === null ? "—" : estRange.toFixed(0)}
              unit={estRange === null ? undefined : "mi"}
            />
          </div>
        </div>
      </Card>

      {/* Row 2 — MPG trend + recent list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="MPG Trend" className="lg:col-span-2">
          {mpgChartData.labels.length > 1 ? (
            <div className="h-64">
              <Chart
                type="line"
                data={mpgChartData}
                options={chartOptions}
                className="h-full w-full"
              />
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-content-muted">
              <FontAwesomeIcon icon={faChartLine} className="text-3xl mb-2" />
              <p>Log a few more fill-ups to see your MPG trend.</p>
            </div>
          )}
        </Card>

        <Card title="Recent Fill-Ups">
          {recentList.length === 0 ? (
            <div className="text-center py-8 text-content-muted">
              <FontAwesomeIcon icon={faGasPump} className="text-3xl mb-3" />
              <p>No fill-ups recorded yet.</p>
              <Button
                label="Add your first fill-up"
                className="p-button-text mt-2"
                onClick={() => navigate("/fill-ups/new")}
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentList.map((f: FillUp) => (
                <li
                  key={f.id}
                  className="py-3 flex justify-between items-center gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {new Date(f.filledAt ?? 0).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-content-muted truncate">
                      {(num(f.gallonsAdded) ?? 0).toFixed(2)} gal ·{" "}
                      {(num(f.odometerReading) ?? 0).toLocaleString()} mi
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-numeric font-semibold text-brand">
                      ${(num(f.totalCost) ?? 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-content-muted">
                      ${(num(f.pricePerGallon) ?? 0).toFixed(3)}/gal
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Row 3 — Spend chart */}
      <Card title="Recent Spend">
        {spendChartData.labels.length > 0 ? (
          <div className="h-64">
            <Chart
              type="bar"
              data={spendChartData}
              options={chartOptions}
              className="h-full w-full"
            />
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-content-muted">
            <p>No spending data yet.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

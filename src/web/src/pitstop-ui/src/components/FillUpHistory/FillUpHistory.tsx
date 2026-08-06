import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGasPump,
  faPlus,
  faPencil,
  faTrash,
  faChevronDown,
  faChevronUp,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Calendar } from "primereact/calendar";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ConfirmPopup, confirmPopup } from "primereact/confirmpopup";
import { useAppDispatch, useAppSelector, useSelectedVehicle } from "../../store/hooks";
import { deleteFillUp } from "../../store/slices/fillUpSlice";
import type { FillUp } from "../../store/slices/fillUpSlice";
import { PageHeader } from "../layout/PageHeader";
import { formatVehicleLabel } from "../../utils/vehicle";

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString() : "—");

interface FiltersProps {
  range: Date[] | null;
  onChange: (r: Date[] | null) => void;
  onClear: () => void;
  totals: { count: number; spend: number; gallons: number; avgMpg: number | null };
}

const FiltersPanel: React.FC<FiltersProps> = ({ range, onChange, onClear, totals }) => (
  <div className="space-y-4">
    <div>
      <p className="text-meta uppercase tracking-wide text-content-muted mb-2">Date range</p>
      <Calendar
        value={range ?? undefined}
        onChange={(e) => {
          const v: unknown = e.value;
          if (Array.isArray(v)) onChange(v as Date[]);
          else if (v instanceof Date) onChange([v]);
          else onChange(null);
        }}
        selectionMode="range"
        readOnlyInput
        showIcon
        placeholder="All time"
        className="w-full"
      />
      {range?.[0] && <Button label="Clear" className="p-button-text p-button-sm mt-1 px-0" onClick={onClear} />}
    </div>

    <hr className="border-border" />

    <div>
      <p className="text-meta uppercase tracking-wide text-content-muted mb-2">For this view</p>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-content-muted">Fill-ups</dt>
          <dd className="font-numeric">{totals.count}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-content-muted">Total spend</dt>
          <dd className="font-numeric">${totals.spend.toFixed(2)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-content-muted">Gallons</dt>
          <dd className="font-numeric">{totals.gallons.toFixed(2)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-content-muted">Avg MPG</dt>
          <dd className="font-numeric">{totals.avgMpg === null ? "—" : totals.avgMpg.toFixed(1)}</dd>
        </div>
      </dl>
    </div>
  </div>
);

interface MobileCardProps {
  row: FillUp;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const MobileFillUpCard: React.FC<MobileCardProps> = ({ row, expanded, onToggle, onEdit, onDelete }) => {
  const cost = num(row.totalCost) ?? 0;
  const gallons = num(row.gallonsAdded) ?? 0;
  const mpg = num(row.mpgThisFillUp);
  const odo = num(row.odometerReading) ?? 0;
  const ppg = num(row.pricePerGallon) ?? 0;

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-transparent border-0 text-left cursor-pointer"
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium">{fmtDate(row.filledAt)}</p>
          <p className="text-sm text-content-muted truncate">
            {gallons.toFixed(2)} gal · {mpg === null ? "—" : `${mpg.toFixed(1)} mpg`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-numeric font-semibold text-brand">${cost.toFixed(2)}</p>
          <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} className="text-xs text-content-muted mt-1" />
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-content-muted">Odometer</span>
            <span className="font-numeric">{odo.toLocaleString()} mi</span>
          </div>
          <div className="flex justify-between">
            <span className="text-content-muted">Price/gal</span>
            <span className="font-numeric">${ppg.toFixed(3)}</span>
          </div>
          {row.location?.name && (
            <div className="flex justify-between gap-2">
              <span className="text-content-muted">Location</span>
              <span className="truncate text-right">{row.location.name}</span>
            </div>
          )}
          {row.fuelGrade && (
            <div className="flex justify-between">
              <span className="text-content-muted">Grade</span>
              <span>{row.fuelGrade}</span>
            </div>
          )}
          {row.notes && (
            <div>
              <span className="text-content-muted block mb-1">Notes</span>
              <span className="block">{row.notes}</span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              icon={<FontAwesomeIcon icon={faPencil} className="mr-1" />}
              label="Edit"
              className="p-button-text p-button-sm"
              onClick={onEdit}
            />
            <Button
              icon={<FontAwesomeIcon icon={faTrash} className="mr-1" />}
              label="Delete"
              className="p-button-text p-button-sm p-button-danger"
              onClick={onDelete}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const FillUpHistory: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { recentFillUps } = useAppSelector((s) => s.fillUps);
  const selectedVehicleId = useAppSelector((s) => s.vehicles.selectedVehicleId);
  const selectedVehicle = useSelectedVehicle();
  const vehicleLabel = selectedVehicle ? formatVehicleLabel(selectedVehicle) : undefined;
  const toastRef = useRef<HTMLDivElement>(null);

  const [range, setRange] = useState<Date[] | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | string | null>(null);

  const filtered = useMemo(() => {
    const from = range?.[0] ?? null;
    const to = range?.[1] ?? null;
    return recentFillUps.filter((f) => {
      if (!f.filledAt) return true;
      const t = new Date(f.filledAt).getTime();
      if (from && t < from.getTime()) return false;
      if (to && t > to.getTime() + 24 * 60 * 60 * 1000 - 1) return false;
      return true;
    });
  }, [recentFillUps, range]);

  const totals = useMemo(() => {
    let spend = 0;
    let gallons = 0;
    const mpgs: number[] = [];
    for (const f of filtered) {
      spend += num(f.totalCost) ?? 0;
      gallons += num(f.gallonsAdded) ?? 0;
      const m = num(f.mpgThisFillUp);
      if (m !== null) mpgs.push(m);
    }
    return {
      count: filtered.length,
      spend,
      gallons,
      avgMpg: mpgs.length ? mpgs.reduce((a, b) => a + b, 0) / mpgs.length : null,
    };
  }, [filtered]);

  const handleDelete = (event: React.MouseEvent, row: FillUp) => {
    confirmPopup({
      target: event.currentTarget as HTMLElement,
      message: "Delete this fill-up?",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger p-button-sm",
      accept: () => {
        if (selectedVehicleId != null) {
          void dispatch(deleteFillUp({ vehicleId: selectedVehicleId, id: Number(row.id) }));
        }
      },
    });
  };

  const dateTemplate = (row: FillUp) => fmtDate(row.filledAt);
  const costTemplate = (row: FillUp) => `$${(num(row.totalCost) ?? 0).toFixed(2)}`;
  const priceTemplate = (row: FillUp) => `$${(num(row.pricePerGallon) ?? 0).toFixed(3)}`;
  const odometerTemplate = (row: FillUp) => `${(num(row.odometerReading) ?? 0).toLocaleString()} mi`;
  const gallonsTemplate = (row: FillUp) => (num(row.gallonsAdded) ?? 0).toFixed(3);
  const mpgTemplate = (row: FillUp) => {
    const m = num(row.mpgThisFillUp);
    return m === null ? "—" : m.toFixed(1);
  };

  const actionsTemplate = (row: FillUp) => (
    <div className="flex gap-2">
      <Button
        icon={<FontAwesomeIcon icon={faPencil} />}
        className="p-button-text p-button-sm p-button-secondary"
        onClick={() => navigate(`/fill-ups/${String(row.id)}/edit`)}
        aria-label="Edit fill-up"
      />
      <Button
        icon={<FontAwesomeIcon icon={faTrash} />}
        className="p-button-text p-button-sm p-button-danger"
        onClick={(e) => handleDelete(e, row)}
        aria-label="Delete fill-up"
      />
    </div>
  );

  /* ---------- empty state ---------- */

  if (recentFillUps.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Fill-Up History"
          subtitle={vehicleLabel}
          actions={
            <Button
              label="Add Fill-Up"
              icon={<FontAwesomeIcon icon={faPlus} className="mr-2" />}
              onClick={() => navigate("/fill-ups/new")}
            />
          }
        />
        <Card>
          <div className="text-center py-12 text-content-muted">
            <FontAwesomeIcon icon={faGasPump} className="text-4xl mb-3" />
            <p className="text-lg mb-4">No fill-ups recorded yet.</p>
            <Button
              label="Log Your First Fill-Up"
              icon={<FontAwesomeIcon icon={faPlus} className="mr-2" />}
              className="p-button-sm"
              onClick={() => navigate("/fill-ups/new")}
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={toastRef}>
      <ConfirmPopup />
      <PageHeader
        title="Fill-Up History"
        subtitle={vehicleLabel}
        actions={
          <Button
            label="Add"
            icon={<FontAwesomeIcon icon={faPlus} className="mr-2" />}
            className="p-button-sm"
            onClick={() => navigate("/fill-ups/new")}
          />
        }
      />

      {/* Mobile filters toggle */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-surface cursor-pointer"
        >
          <span className="flex items-center gap-2 font-medium">
            <FontAwesomeIcon icon={faFilter} />
            Filters & summary
          </span>
          <FontAwesomeIcon icon={filtersOpen ? faChevronUp : faChevronDown} />
        </button>
        {filtersOpen && (
          <div className="mt-3 p-4 rounded-xl border border-border bg-surface">
            <FiltersPanel range={range} onChange={setRange} onClear={() => setRange(null)} totals={totals} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
        {/* Desktop filter rail */}
        <aside className="hidden lg:block">
          <Card className="lg:sticky lg:top-6">
            <FiltersPanel range={range} onChange={setRange} onClear={() => setRange(null)} totals={totals} />
          </Card>
        </aside>

        {/* Table (desktop) / Card list (mobile) */}
        <div className="min-w-0">
          {/* Desktop table */}
          <Card className="hidden lg:block">
            <DataTable
              value={filtered}
              paginator
              rows={20}
              rowsPerPageOptions={[10, 20, 50]}
              sortField="filledAt"
              sortOrder={-1}
              className="p-datatable-sm"
              emptyMessage="No fill-ups match the current filter."
            >
              <Column field="filledAt" header="Date" body={dateTemplate} sortable />
              <Column field="odometerReading" header="Odometer" body={odometerTemplate} sortable />
              <Column field="gallonsAdded" header="Gallons" body={gallonsTemplate} sortable />
              <Column field="pricePerGallon" header="$/gal" body={priceTemplate} sortable />
              <Column field="totalCost" header="Total" body={costTemplate} sortable />
              <Column field="mpgThisFillUp" header="MPG" body={mpgTemplate} sortable />
              <Column field="location.name" header="Location" body={(row: FillUp) => row.location?.name ?? ""} />
              <Column body={actionsTemplate} style={{ width: "6rem" }} />
            </DataTable>
          </Card>

          {/* Mobile card list */}
          <div className="lg:hidden space-y-2">
            {filtered.length === 0 ? (
              <Card>
                <p className="text-center text-content-muted py-4">No fill-ups match the current filter.</p>
              </Card>
            ) : (
              filtered.map((row) => (
                <MobileFillUpCard
                  key={String(row.id)}
                  row={row}
                  expanded={expandedId === row.id}
                  onToggle={() => setExpandedId((id) => (id === row.id ? null : (row.id ?? null)))}
                  onEdit={() => navigate(`/fill-ups/${String(row.id)}/edit`)}
                  onDelete={(e) => handleDelete(e, row)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

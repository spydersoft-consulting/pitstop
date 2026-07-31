import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWrench,
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
import { Dropdown } from "primereact/dropdown";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ConfirmPopup, confirmPopup } from "primereact/confirmpopup";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { deleteMaintenanceLog } from "../../store/slices/maintenanceLogSlice";
import type { MaintenanceLog } from "../../store/slices/maintenanceLogSlice";
import { PageHeader } from "../layout/PageHeader";
import { SERVICE_TYPE_OPTIONS, PERFORMED_BY_OPTIONS } from "./maintenanceLogOptions";

const SERVICE_TYPE_LABELS = Object.fromEntries(SERVICE_TYPE_OPTIONS.map((o) => [o.value, o.label]));

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

const fmtDate = (s: string | null | undefined) => (s ? new Date(`${s}T00:00:00`).toLocaleDateString() : "—");

const serviceTypeLabel = (v: string | null | undefined) => (v && SERVICE_TYPE_LABELS[v]) || v || "—";

const WarrantyBadge: React.FC = () => (
  <span className="inline-block rounded-full bg-brand/10 text-brand text-xs font-medium px-2 py-0.5 ml-2 align-middle">
    Warranty
  </span>
);

interface FiltersProps {
  range: Date[] | null;
  onChange: (r: Date[] | null) => void;
  onClear: () => void;
  serviceType: string | null;
  onServiceTypeChange: (v: string | null) => void;
  performedBy: string | null;
  onPerformedByChange: (v: string | null) => void;
  totals: { count: number; spend: number };
}

const FiltersPanel: React.FC<FiltersProps> = ({
  range,
  onChange,
  onClear,
  serviceType,
  onServiceTypeChange,
  performedBy,
  onPerformedByChange,
  totals,
}) => (
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

    <div>
      <p className="text-meta uppercase tracking-wide text-content-muted mb-2">Service type</p>
      <Dropdown
        value={serviceType}
        options={SERVICE_TYPE_OPTIONS}
        onChange={(e) => onServiceTypeChange(e.value)}
        showClear
        placeholder="All types"
        className="w-full"
      />
    </div>

    <div>
      <p className="text-meta uppercase tracking-wide text-content-muted mb-2">Performed by</p>
      <Dropdown
        value={performedBy}
        options={PERFORMED_BY_OPTIONS}
        onChange={(e) => onPerformedByChange(e.value)}
        showClear
        placeholder="Anyone"
        className="w-full"
      />
    </div>

    <hr className="border-border" />

    <div>
      <p className="text-meta uppercase tracking-wide text-content-muted mb-2">For this view</p>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-content-muted">Logs</dt>
          <dd className="font-numeric">{totals.count}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-content-muted">Total spend</dt>
          <dd className="font-numeric">${totals.spend.toFixed(2)}</dd>
        </div>
      </dl>
    </div>
  </div>
);

interface MobileCardProps {
  row: MaintenanceLog;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const MobileMaintenanceLogCard: React.FC<MobileCardProps> = ({ row, expanded, onToggle, onEdit, onDelete }) => {
  const cost = num(row.computedTotalCost) ?? 0;
  const odo = num(row.odometerReading) ?? 0;

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-transparent border-0 text-left cursor-pointer"
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium">{fmtDate(row.serviceDate)}</p>
          <p className="text-sm text-content-muted truncate">
            {serviceTypeLabel(row.serviceType)} · {row.performedBy ?? "—"}
            {row.isWarrantyWork && <WarrantyBadge />}
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
          {row.location?.name && (
            <div className="flex justify-between gap-2">
              <span className="text-content-muted">Location</span>
              <span className="truncate text-right">{row.location.name}</span>
            </div>
          )}
          {row.description && (
            <div>
              <span className="text-content-muted block mb-1">Description</span>
              <span className="block">{row.description}</span>
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

export const MaintenanceLogHistory: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { recentMaintenanceLogs } = useAppSelector((s) => s.maintenanceLogs);
  const selectedVehicleId = useAppSelector((s) => s.vehicles.selectedVehicleId);
  const toastRef = useRef<HTMLDivElement>(null);

  const [range, setRange] = useState<Date[] | null>(null);
  const [serviceType, setServiceType] = useState<string | null>(null);
  const [performedBy, setPerformedBy] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | string | null>(null);

  const filtered = useMemo(() => {
    const from = range?.[0] ?? null;
    const to = range?.[1] ?? null;
    return recentMaintenanceLogs.filter((f) => {
      if (serviceType && f.serviceType !== serviceType) return false;
      if (performedBy && f.performedBy !== performedBy) return false;
      if (!f.serviceDate) return true;
      const t = new Date(`${f.serviceDate}T00:00:00`).getTime();
      if (from && t < from.getTime()) return false;
      if (to && t > to.getTime() + 24 * 60 * 60 * 1000 - 1) return false;
      return true;
    });
  }, [recentMaintenanceLogs, range, serviceType, performedBy]);

  const totals = useMemo(() => {
    let spend = 0;
    for (const f of filtered) {
      spend += num(f.computedTotalCost) ?? 0;
    }
    return { count: filtered.length, spend };
  }, [filtered]);

  const handleDelete = (event: React.MouseEvent, row: MaintenanceLog) => {
    confirmPopup({
      target: event.currentTarget as HTMLElement,
      message: "Delete this maintenance log?",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger p-button-sm",
      accept: () => {
        if (selectedVehicleId != null) {
          void dispatch(deleteMaintenanceLog({ vehicleId: selectedVehicleId, id: Number(row.id) }));
        }
      },
    });
  };

  const dateTemplate = (row: MaintenanceLog) => fmtDate(row.serviceDate);
  const serviceTypeTemplate = (row: MaintenanceLog) => (
    <>
      {serviceTypeLabel(row.serviceType)}
      {row.isWarrantyWork && <WarrantyBadge />}
    </>
  );
  const costTemplate = (row: MaintenanceLog) => `$${(num(row.computedTotalCost) ?? 0).toFixed(2)}`;
  const odometerTemplate = (row: MaintenanceLog) => `${(num(row.odometerReading) ?? 0).toLocaleString()} mi`;

  const actionsTemplate = (row: MaintenanceLog) => (
    <div className="flex gap-2">
      <Button
        icon={<FontAwesomeIcon icon={faPencil} />}
        className="p-button-text p-button-sm p-button-secondary"
        onClick={() => navigate(`/maintenance/${String(row.id)}/edit`)}
        aria-label="Edit maintenance log"
      />
      <Button
        icon={<FontAwesomeIcon icon={faTrash} />}
        className="p-button-text p-button-sm p-button-danger"
        onClick={(e) => handleDelete(e, row)}
        aria-label="Delete maintenance log"
      />
    </div>
  );

  /* ---------- empty state ---------- */

  if (recentMaintenanceLogs.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Maintenance History"
          actions={
            <Button
              label="Add Maintenance Log"
              icon={<FontAwesomeIcon icon={faPlus} className="mr-2" />}
              onClick={() => navigate("/maintenance/new")}
            />
          }
        />
        <Card>
          <div className="text-center py-12 text-content-muted">
            <FontAwesomeIcon icon={faWrench} className="text-4xl mb-3" />
            <p className="text-lg mb-4">No maintenance logs recorded yet.</p>
            <Button
              label="Log Your First Maintenance"
              icon={<FontAwesomeIcon icon={faPlus} className="mr-2" />}
              className="p-button-sm"
              onClick={() => navigate("/maintenance/new")}
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
        title="Maintenance History"
        actions={
          <Button
            label="Add"
            icon={<FontAwesomeIcon icon={faPlus} className="mr-2" />}
            className="p-button-sm"
            onClick={() => navigate("/maintenance/new")}
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
            <FiltersPanel
              range={range}
              onChange={setRange}
              onClear={() => setRange(null)}
              serviceType={serviceType}
              onServiceTypeChange={setServiceType}
              performedBy={performedBy}
              onPerformedByChange={setPerformedBy}
              totals={totals}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
        {/* Desktop filter rail */}
        <aside className="hidden lg:block">
          <Card className="lg:sticky lg:top-6">
            <FiltersPanel
              range={range}
              onChange={setRange}
              onClear={() => setRange(null)}
              serviceType={serviceType}
              onServiceTypeChange={setServiceType}
              performedBy={performedBy}
              onPerformedByChange={setPerformedBy}
              totals={totals}
            />
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
              sortField="serviceDate"
              sortOrder={-1}
              className="p-datatable-sm"
              emptyMessage="No maintenance logs match the current filter."
            >
              <Column field="serviceDate" header="Date" body={dateTemplate} sortable />
              <Column field="serviceType" header="Service" body={serviceTypeTemplate} sortable />
              <Column field="odometerReading" header="Odometer" body={odometerTemplate} sortable />
              <Column field="performedBy" header="Performed By" sortable />
              <Column field="computedTotalCost" header="Cost" body={costTemplate} sortable />
              <Column
                field="location.name"
                header="Location"
                body={(row: MaintenanceLog) => row.location?.name ?? ""}
              />
              <Column body={actionsTemplate} style={{ width: "6rem" }} />
            </DataTable>
          </Card>

          {/* Mobile card list */}
          <div className="lg:hidden space-y-2">
            {filtered.length === 0 ? (
              <Card>
                <p className="text-center text-content-muted py-4">No maintenance logs match the current filter.</p>
              </Card>
            ) : (
              filtered.map((row) => (
                <MobileMaintenanceLogCard
                  key={String(row.id)}
                  row={row}
                  expanded={expandedId === row.id}
                  onToggle={() => setExpandedId((id) => (id === row.id ? null : (row.id ?? null)))}
                  onEdit={() => navigate(`/maintenance/${String(row.id)}/edit`)}
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

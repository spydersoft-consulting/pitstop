import React, { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faList, faMap, faPlus, faPencil, faTrash } from "@fortawesome/free-solid-svg-icons";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { ConfirmPopup, confirmPopup } from "primereact/confirmpopup";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { createLocation, deleteLocation, updateLocation } from "../../store/slices/locationSlice";
import type { Location } from "../../store/slices/locationSlice";
import { PageHeader } from "../layout/PageHeader";

// Leaflet's default icon images break when bundled with Vite — point them at the CDN copy.
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString() : "—");

type ViewMode = "list" | "map";

interface LocationFormState {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

const emptyForm = (): LocationFormState => ({
  name: "",
  address: "",
  latitude: null,
  longitude: null,
});

const formFromLocation = (loc: Location): LocationFormState => ({
  name: loc.name ?? "",
  address: loc.address ?? "",
  latitude: num(loc.latitude),
  longitude: num(loc.longitude),
});

export const Locations: React.FC = () => {
  const dispatch = useAppDispatch();
  const { locations, loading } = useAppSelector((s) => s.locations);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<LocationFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const deleteButtonRef = useRef<Map<number, HTMLButtonElement>>(new Map());

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditingId(Number(loc.id));
    setForm(formFromLocation(loc));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        latitude: form.latitude,
        longitude: form.longitude,
        googlePlaceId: null,
      };
      if (editingId !== null) {
        await dispatch(updateLocation({ id: editingId, body })).unwrap();
      } else {
        await dispatch(createLocation(body)).unwrap();
      }
      closeDialog();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, id: number) => {
    confirmPopup({
      target: event.currentTarget,
      message: "Delete this location?",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: () => void dispatch(deleteLocation(id)),
    });
  };

  const actionTemplate = (loc: Location) => (
    <div className="flex gap-2 justify-end">
      <Button
        type="button"
        icon={<FontAwesomeIcon icon={faPencil} />}
        severity="secondary"
        outlined
        size="small"
        aria-label="Edit"
        onClick={() => openEdit(loc)}
      />
      <Button
        type="button"
        icon={<FontAwesomeIcon icon={faTrash} />}
        severity="danger"
        outlined
        size="small"
        aria-label="Delete"
        ref={(el) => {
          if (el) deleteButtonRef.current.set(Number(loc.id), el as unknown as HTMLButtonElement);
        }}
        onClick={(e) => confirmDelete(e, Number(loc.id))}
      />
    </div>
  );

  const mappableLocations = locations.filter((l) => num(l.latitude) !== null && num(l.longitude) !== null);

  const mapCenter: [number, number] =
    mappableLocations.length > 0
      ? [
          mappableLocations.reduce((s, l) => s + num(l.latitude)!, 0) / mappableLocations.length,
          mappableLocations.reduce((s, l) => s + num(l.longitude)!, 0) / mappableLocations.length,
        ]
      : [40.4, -79.9];

  return (
    <div className="flex flex-col gap-4 h-full">
      <ConfirmPopup />

      <PageHeader
        title="Locations"
        subtitle={`${locations.length} station${locations.length !== 1 ? "s" : ""}`}
        actions={
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={[
                  "px-3 py-2 text-sm flex items-center gap-2 border-0 cursor-pointer transition-colors",
                  viewMode === "list" ? "bg-brand text-brand-fg" : "bg-surface text-content hover:bg-surface-muted",
                ].join(" ")}
                aria-label="List view"
              >
                <FontAwesomeIcon icon={faList} />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={[
                  "px-3 py-2 text-sm flex items-center gap-2 border-0 cursor-pointer transition-colors",
                  viewMode === "map" ? "bg-brand text-brand-fg" : "bg-surface text-content hover:bg-surface-muted",
                ].join(" ")}
                aria-label="Map view"
              >
                <FontAwesomeIcon icon={faMap} />
                <span className="hidden sm:inline">Map</span>
              </button>
            </div>
            <Button type="button" icon={<FontAwesomeIcon icon={faPlus} />} label="Add" size="small" onClick={openAdd} />
          </div>
        }
      />

      {viewMode === "list" && (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block">
            <DataTable
              value={locations}
              loading={loading}
              emptyMessage="No locations yet — add your first station."
              stripedRows
              size="small"
            >
              <Column field="name" header="Name" sortable />
              <Column field="address" header="Address" sortable body={(row: Location) => row.address ?? "—"} />
              <Column
                header="Coordinates"
                body={(row: Location) => {
                  const lat = num(row.latitude);
                  const lng = num(row.longitude);
                  return lat !== null && lng !== null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : "—";
                }}
              />
              <Column
                field="useCount"
                header="Fill-Ups"
                sortable
                body={(row: Location) => num(row.useCount) ?? 0}
                style={{ width: "8rem" }}
              />
              <Column
                field="lastUsedAt"
                header="Last Used"
                sortable
                body={(row: Location) => fmtDate(row.lastUsedAt)}
                style={{ width: "10rem" }}
              />
              <Column body={actionTemplate} style={{ width: "8rem" }} bodyStyle={{ textAlign: "right" }} />
            </DataTable>
          </div>

          {/* Mobile card list */}
          <div className="lg:hidden flex flex-col gap-3">
            {loading && <div className="text-center py-8 text-content-muted">Loading…</div>}
            {!loading && locations.length === 0 && (
              <div className="text-center py-8 text-content-muted">No locations yet — add your first station.</div>
            )}
            {locations.map((loc) => (
              <div key={String(loc.id)} className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{loc.name}</p>
                    {loc.address && <p className="text-sm text-content-muted truncate">{loc.address}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      icon={<FontAwesomeIcon icon={faPencil} />}
                      severity="secondary"
                      outlined
                      size="small"
                      aria-label="Edit"
                      onClick={() => openEdit(loc)}
                    />
                    <Button
                      type="button"
                      icon={<FontAwesomeIcon icon={faTrash} />}
                      severity="danger"
                      outlined
                      size="small"
                      aria-label="Delete"
                      onClick={(e) => confirmDelete(e, Number(loc.id))}
                    />
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-content-muted mt-1">
                  <span>
                    {num(loc.useCount) ?? 0} fill-up{(num(loc.useCount) ?? 0) !== 1 ? "s" : ""}
                  </span>
                  <span>Last: {fmtDate(loc.lastUsedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {viewMode === "map" && (
        <div className="flex-1 min-h-[400px] rounded-lg overflow-hidden border border-border">
          {mappableLocations.length === 0 ? (
            <div className="flex items-center justify-center h-full text-content-muted py-16">
              No locations with coordinates to display.
            </div>
          ) : (
            <MapContainer center={mapCenter} zoom={11} style={{ height: "100%", minHeight: "400px", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mappableLocations.map((loc) => (
                <Marker key={String(loc.id)} position={[num(loc.latitude)!, num(loc.longitude)!]}>
                  <Popup>
                    <div className="flex flex-col gap-1 min-w-[180px]">
                      <p className="font-semibold m-0">{loc.name}</p>
                      {loc.address && <p className="text-xs text-gray-500 m-0">{loc.address}</p>}
                      <p className="text-xs m-0">
                        {num(loc.useCount) ?? 0} fill-up{(num(loc.useCount) ?? 0) !== 1 ? "s" : ""}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:underline bg-transparent border-0 cursor-pointer p-0"
                          onClick={() => openEdit(loc)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      )}

      <Dialog
        header={editingId !== null ? "Edit Location" : "Add Location"}
        visible={dialogOpen}
        onHide={closeDialog}
        style={{ width: "min(480px, 95vw)" }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              label="Cancel"
              severity="secondary"
              outlined
              onClick={closeDialog}
              disabled={saving}
            />
            <Button
              type="button"
              label={saving ? "Saving…" : "Save"}
              onClick={() => void handleSave()}
              loading={saving}
              disabled={!form.name.trim()}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="location-name" className="text-sm font-medium">
              Name *
            </label>
            <InputText
              id="location-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Sheetz Monroeville"
              className="w-full"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="location-address" className="text-sm font-medium">
              Address
            </label>
            <InputText
              id="location-address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Street address (optional)"
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="location-latitude" className="text-sm font-medium">
                Latitude
              </label>
              <InputNumber
                inputId="location-latitude"
                value={form.latitude}
                onValueChange={(e) => setForm((f) => ({ ...f, latitude: e.value ?? null }))}
                placeholder="e.g. 40.3164"
                minFractionDigits={4}
                maxFractionDigits={6}
                className="w-full"
                inputClassName="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="location-longitude" className="text-sm font-medium">
                Longitude
              </label>
              <InputNumber
                inputId="location-longitude"
                value={form.longitude}
                onValueChange={(e) => setForm((f) => ({ ...f, longitude: e.value ?? null }))}
                placeholder="e.g. -79.6837"
                minFractionDigits={4}
                maxFractionDigits={6}
                className="w-full"
                inputClassName="w-full"
              />
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

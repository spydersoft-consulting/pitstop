import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBellConcierge, faCheck, faPlus, faTrash, faClock, faPencil } from "@fortawesome/free-solid-svg-icons";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { ConfirmPopup, confirmPopup } from "primereact/confirmpopup";
import { useAppDispatch, useAppSelector, useSelectedVehicle } from "../../store/hooks";
import {
  completeReminder,
  createRemindersFromTemplates,
  deleteReminder,
  snoozeReminder,
  type Reminder,
} from "../../store/slices/reminderSlice";
import { PageHeader } from "../layout/PageHeader";
import { formatVehicleLabel } from "../../utils/vehicle";
import { CompleteReminderDialog } from "./CompleteReminderDialog";
import { SnoozeReminderDialog } from "./SnoozeReminderDialog";
import { TemplatePickerDialog } from "./TemplatePickerDialog";
import { STATUS_CLASSES, STATUS_LABELS, fmtDate, fmtMiles, num, serviceTypeLabel } from "./reminderFormat";

const dueText = (r: Reminder): string => {
  const parts = [
    num(r.nextDueOdometer) !== null ? fmtMiles(r.nextDueOdometer) : null,
    r.nextDueDate ? fmtDate(r.nextDueDate) : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" or ") : "—";
};

const intervalText = (r: Reminder): string => {
  const parts = [
    num(r.intervalMiles) !== null ? `${(num(r.intervalMiles) ?? 0).toLocaleString()} mi` : null,
    num(r.intervalMonths) !== null ? `${String(num(r.intervalMonths))} mo` : null,
  ].filter(Boolean);
  return `Every ${parts.join(" or ")}`;
};

const StatusChip: React.FC<{ status?: string }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status ?? ""] ?? STATUS_CLASSES.Ok}`}
  >
    {STATUS_LABELS[status ?? ""] ?? status ?? "—"}
  </span>
);

interface CardProps {
  reminder: Reminder;
  onComplete: () => void;
  onSnooze: () => void;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const ReminderCard: React.FC<CardProps> = ({ reminder, onComplete, onSnooze, onEdit, onDelete }) => (
  <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-medium truncate">{reminder.name}</p>
        <p className="text-sm text-content-muted">
          {serviceTypeLabel(reminder.serviceType)} · {intervalText(reminder)}
        </p>
      </div>
      <StatusChip status={reminder.status} />
    </div>

    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
      <div>
        <dt className="text-content-muted">Last done</dt>
        <dd className="font-numeric">
          {fmtDate(reminder.lastServiceDate)} · {fmtMiles(reminder.lastServiceOdometer)}
        </dd>
      </div>
      <div>
        <dt className="text-content-muted">Next due</dt>
        <dd className="font-numeric">{dueText(reminder)}</dd>
        {reminder.projectedDueDate && (
          <dd className="text-xs text-content-muted">≈ {fmtDate(reminder.projectedDueDate)} at current pace</dd>
        )}
      </div>
      <div>
        <dt className="text-content-muted">Odometer now</dt>
        <dd className="font-numeric">
          {fmtMiles(reminder.estimatedOdometer)}
          {reminder.isOdometerEstimated && <span className="text-xs text-content-muted"> (est.)</span>}
        </dd>
      </div>
    </dl>

    {reminder.snoozedUntil && (
      <p className="text-xs text-content-muted">Notifications snoozed until {fmtDate(reminder.snoozedUntil)}</p>
    )}

    <div className="flex flex-wrap justify-end gap-2">
      <Button
        icon={<FontAwesomeIcon icon={faCheck} className="mr-1" />}
        label="Mark done"
        className="p-button-sm"
        onClick={onComplete}
      />
      <Button
        icon={<FontAwesomeIcon icon={faClock} className="mr-1" />}
        label="Snooze"
        className="p-button-text p-button-sm"
        onClick={onSnooze}
      />
      <Button
        icon={<FontAwesomeIcon icon={faPencil} />}
        className="p-button-text p-button-sm p-button-secondary"
        onClick={onEdit}
        aria-label={`Edit ${reminder.name ?? "reminder"}`}
      />
      <Button
        icon={<FontAwesomeIcon icon={faTrash} />}
        className="p-button-text p-button-sm p-button-danger"
        onClick={onDelete}
        aria-label={`Delete ${reminder.name ?? "reminder"}`}
      />
    </div>
  </div>
);

export const RemindersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { reminders, templates } = useAppSelector((s) => s.reminders);
  const selectedVehicleId = useAppSelector((s) => s.vehicles.selectedVehicleId);
  const selectedVehicle = useSelectedVehicle();
  const vehicleLabel = selectedVehicle ? formatVehicleLabel(selectedVehicle) : undefined;

  const [completing, setCompleting] = useState<Reminder | null>(null);
  const [snoozing, setSnoozing] = useState<Reminder | null>(null);
  const [pickingTemplates, setPickingTemplates] = useState(false);

  const availableTemplates = useMemo(() => {
    const used = new Set(reminders.map((r) => r.serviceType));
    return templates.filter((t) => !used.has(t.serviceType));
  }, [reminders, templates]);

  const handleDelete = (event: React.MouseEvent, reminder: Reminder) => {
    confirmPopup({
      target: event.currentTarget as HTMLElement,
      message: "Delete this reminder?",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger p-button-sm",
      accept: () => {
        if (selectedVehicleId != null) {
          void dispatch(deleteReminder({ vehicleId: selectedVehicleId, id: Number(reminder.id) }));
        }
      },
    });
  };

  const addTemplatesButton = (
    <Button
      label="Add common services"
      icon={<FontAwesomeIcon icon={faPlus} className="mr-2" />}
      className="p-button-sm"
      onClick={() => setPickingTemplates(true)}
    />
  );
  const addReminderButton = (
    <Button
      label="Add reminder"
      icon={<FontAwesomeIcon icon={faPlus} className="mr-2" />}
      className="p-button-sm p-button-outlined"
      onClick={() => navigate("/reminders/new")}
    />
  );

  return (
    <div className="space-y-6">
      <ConfirmPopup />
      <PageHeader
        title="Maintenance Reminders"
        subtitle={vehicleLabel}
        actions={
          <>
            {addReminderButton}
            {addTemplatesButton}
          </>
        }
      />

      {reminders.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-content-muted">
            <FontAwesomeIcon icon={faBellConcierge} className="text-4xl mb-3" />
            <p className="text-lg mb-4">No maintenance reminders yet.</p>
            <div className="flex justify-center gap-2">
              {addReminderButton}
              {addTemplatesButton}
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onComplete={() => setCompleting(reminder)}
              onSnooze={() => setSnoozing(reminder)}
              onEdit={() => navigate(`/reminders/${String(reminder.id)}/edit`)}
              onDelete={(e) => handleDelete(e, reminder)}
            />
          ))}
        </div>
      )}

      {completing && (
        <CompleteReminderDialog
          reminder={completing}
          onClose={() => setCompleting(null)}
          onSubmit={(body) => {
            if (selectedVehicleId != null) {
              void dispatch(completeReminder({ vehicleId: selectedVehicleId, id: Number(completing.id), body }));
            }
            setCompleting(null);
          }}
        />
      )}

      {snoozing && (
        <SnoozeReminderDialog
          reminder={snoozing}
          onClose={() => setSnoozing(null)}
          onSubmit={(until) => {
            if (selectedVehicleId != null) {
              void dispatch(snoozeReminder({ vehicleId: selectedVehicleId, id: Number(snoozing.id), body: { until } }));
            }
            setSnoozing(null);
          }}
        />
      )}

      {pickingTemplates && (
        <TemplatePickerDialog
          templates={availableTemplates}
          onClose={() => setPickingTemplates(false)}
          onSubmit={(serviceTypes) => {
            if (selectedVehicleId != null) {
              void dispatch(createRemindersFromTemplates({ vehicleId: selectedVehicleId, serviceTypes }));
            }
            setPickingTemplates(false);
          }}
        />
      )}
    </div>
  );
};

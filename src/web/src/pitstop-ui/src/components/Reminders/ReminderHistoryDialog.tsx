import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Spinner } from "../ui/Spinner";
import { remindersApi } from "../../api/remindersApi";
import type { ReminderHistoryEntryDto } from "../../api/generated/types.gen";
import type { Reminder } from "../../store/slices/reminderSlice";
import { fmtDate, fmtMiles, num } from "./reminderFormat";

interface Props {
  vehicleId: number;
  reminder: Reminder;
  onClose: () => void;
}

const lateness = (entry: ReminderHistoryEntryDto): string[] => {
  const parts: string[] = [];
  const days = num(entry.daysLate);
  const miles = num(entry.milesOver);
  if (days !== null && days > 0) parts.push(`${String(days)} ${days === 1 ? "day" : "days"} late`);
  if (miles !== null && miles > 0) parts.push(`${Math.round(miles).toLocaleString()} mi over`);
  return parts;
};

const Outcome: React.FC<{ entry: ReminderHistoryEntryDto }> = ({ entry }) => {
  if (entry.dueDate == null && entry.dueOdometer == null) {
    return <span className="text-xs text-content-muted">First recorded service</span>;
  }
  const late = lateness(entry);
  return late.length > 0 ? (
    <span className="rounded-full bg-danger/10 text-danger text-xs font-medium px-2 py-0.5">{late.join(" · ")}</span>
  ) : (
    <span className="rounded-full bg-success/10 text-success text-xs font-medium px-2 py-0.5">On time</span>
  );
};

export const ReminderHistoryDialog: React.FC<Props> = ({ vehicleId, reminder, onClose }) => {
  const [entries, setEntries] = useState<ReminderHistoryEntryDto[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    remindersApi
      .history(vehicleId, Number(reminder.id))
      .then((result) => {
        if (!cancelled) setEntries(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [vehicleId, reminder.id]);

  return (
    <Modal onClose={onClose} header={`History: ${reminder.name ?? "reminder"}`} className="w-full max-w-lg">
      {failed ? (
        <p className="text-danger">Couldn't load the history. Please try again.</p>
      ) : entries === null ? (
        <div className="flex justify-center py-6">
          <Spinner size={32} />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-content-muted">No matching services have been logged yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-border list-none p-0 m-0">
            {entries.map((entry) => (
              <li key={entry.maintenanceLogId} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{fmtDate(entry.serviceDate)}</p>
                  <p className="text-sm text-content-muted font-numeric">{fmtMiles(entry.odometer)}</p>
                </div>
                <Outcome entry={entry} />
              </li>
            ))}
          </ul>
          <p className="text-xs text-content-muted mt-3">
            Measured against this reminder's current interval, from the service before each one.
          </p>
        </>
      )}
    </Modal>
  );
};

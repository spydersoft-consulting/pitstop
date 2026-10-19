import { useState } from "react";
import { Button } from "../ui/Button";
import { Calendar } from "primereact/calendar";
import { Modal } from "../ui/Modal";
import type { Reminder } from "../../store/slices/reminderSlice";
import { toDateOnlyString } from "./reminderFormat";

interface Props {
  reminder: Reminder;
  onClose: () => void;
  onSubmit: (until: string | null) => void;
}

const defaultSnoozeEnd = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d;
};

export const SnoozeReminderDialog: React.FC<Props> = ({ reminder, onClose, onSubmit }) => {
  const [until, setUntil] = useState<Date | null>(defaultSnoozeEnd());

  return (
    <Modal
      onClose={onClose}
      header={`Snooze: ${reminder.name ?? "reminder"}`}
      className="w-full max-w-md"
      footer={
        <div className="flex justify-end gap-2">
          {reminder.snoozedUntil && (
            <Button label="Clear snooze" variant="text" size="sm" onClick={() => onSubmit(null)} />
          )}
          <Button label="Cancel" variant="text" size="sm" onClick={onClose} />
          <Button
            label="Snooze"
            size="sm"
            disabled={until === null}
            onClick={() => onSubmit(toDateOnlyString(until!))}
          />
        </div>
      }
    >
      <label htmlFor="snooze-until" className="block text-sm mb-1">
        No notifications until
      </label>
      <Calendar
        inputId="snooze-until"
        value={until}
        minDate={new Date()}
        onChange={(e) => setUntil(e.value ?? null)}
        showIcon
        className="w-full"
        inputClassName="w-full"
      />
    </Modal>
  );
};

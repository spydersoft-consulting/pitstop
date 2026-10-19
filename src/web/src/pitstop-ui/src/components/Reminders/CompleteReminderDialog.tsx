import { useState } from "react";
import { Button } from "../ui/Button";
import { DateField } from "../ui/DateField";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { NumberField } from "../ui/NumberField";
import type { Reminder } from "../../store/slices/reminderSlice";
import { PERFORMED_BY_OPTIONS } from "../MaintenanceLog/maintenanceLogOptions";
import { num, toDateOnlyString } from "./reminderFormat";

interface Props {
  reminder: Reminder;
  onClose: () => void;
  onSubmit: (body: { date: string; odometer: number; performedBy: string }) => void;
}

export const CompleteReminderDialog: React.FC<Props> = ({ reminder, onClose, onSubmit }) => {
  const [date, setDate] = useState<Date | null>(new Date());
  const [odometer, setOdometer] = useState<number | null>(Math.round(num(reminder.estimatedOdometer) ?? 0));
  const [performedBy, setPerformedBy] = useState("Self");

  const valid = date !== null && odometer !== null && odometer >= 0;

  return (
    <Modal
      onClose={onClose}
      header={`Mark done: ${reminder.name ?? "reminder"}`}
      className="w-full max-w-md"
      footer={
        <div className="flex justify-end gap-2">
          <Button label="Cancel" variant="text" size="sm" onClick={onClose} />
          <Button
            label="Mark done"
            size="sm"
            disabled={!valid}
            onClick={() => onSubmit({ date: toDateOnlyString(date!), odometer: odometer!, performedBy })}
          />
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label id="complete-date-label" htmlFor="complete-date" className="block text-sm mb-1">
            Date done
          </label>
          <DateField inputId="complete-date" value={date} onChange={(e) => setDate(e.value)} />
        </div>
        <div>
          <label id="complete-odometer-label" htmlFor="complete-odometer" className="block text-sm mb-1">
            Odometer (mi)
          </label>
          <NumberField
            inputId="complete-odometer"
            value={odometer}
            onValueChange={(e) => setOdometer(e.value ?? null)}
            useGrouping
          />
        </div>
        <div>
          <label id="complete-performed-by-label" htmlFor="complete-performed-by" className="block text-sm mb-1">
            Performed by
          </label>
          <Select
            inputId="complete-performed-by"
            value={performedBy}
            options={PERFORMED_BY_OPTIONS}
            onChange={(e) => setPerformedBy(e.value)}
          />
        </div>
        <p className="text-xs text-content-muted">This also adds an entry to Maintenance History.</p>
      </div>
    </Modal>
  );
};

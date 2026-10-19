import { useState } from "react";
import { Button } from "../ui/Button";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import type { ReminderTemplate } from "../../store/slices/reminderSlice";

interface Props {
  templates: ReminderTemplate[];
  onClose: () => void;
  onSubmit: (serviceTypes: string[]) => void;
}

const intervalText = (t: ReminderTemplate) =>
  [
    t.intervalMiles ? `${Number(t.intervalMiles).toLocaleString()} mi` : null,
    t.intervalMonths ? `${String(t.intervalMonths)} mo` : null,
  ]
    .filter(Boolean)
    .join(" or ");

export const TemplatePickerDialog: React.FC<Props> = ({ templates, onClose, onSubmit }) => {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (serviceType: string) =>
    setSelected((s) => (s.includes(serviceType) ? s.filter((x) => x !== serviceType) : [...s, serviceType]));

  return (
    <Dialog
      visible
      onHide={onClose}
      header="Add common services"
      className="w-full max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button label="Cancel" variant="text" size="sm" onClick={onClose} />
          <Button
            label={selected.length > 0 ? `Add ${String(selected.length)}` : "Add"}
            size="sm"
            disabled={selected.length === 0}
            onClick={() => onSubmit(selected)}
          />
        </div>
      }
    >
      {templates.length === 0 ? (
        <p className="text-content-muted">Every common service already has a reminder.</p>
      ) : (
        <ul className="space-y-2 list-none p-0 m-0">
          {templates.map((t) => {
            const id = `template-${String(t.serviceType)}`;
            return (
              <li key={t.serviceType} className="flex items-center gap-3">
                <Checkbox
                  inputId={id}
                  checked={selected.includes(String(t.serviceType))}
                  onChange={() => toggle(String(t.serviceType))}
                />
                <label htmlFor={id} className="flex-1 cursor-pointer">
                  {t.name}
                  <span className="block text-xs text-content-muted">Every {intervalText(t)}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
};

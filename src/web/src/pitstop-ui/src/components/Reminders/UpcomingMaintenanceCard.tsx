import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { Button } from "../ui/Button";
import { Card } from "primereact/card";
import type { Reminder } from "../../store/slices/reminderSlice";
import { STATUS_CLASSES, STATUS_LABELS, fmtDate, fmtMiles, num } from "./reminderFormat";

const MAX_SHOWN = 4;
const ATTENTION = new Set(["Overdue", "DueSoon"]);

interface Props {
  reminders: Reminder[];
  onViewAll: () => void;
}

const dueText = (r: Reminder): string =>
  [num(r.nextDueOdometer) !== null ? fmtMiles(r.nextDueOdometer) : null, r.nextDueDate ? fmtDate(r.nextDueDate) : null]
    .filter(Boolean)
    .join(" or ") || "—";

export const UpcomingMaintenanceCard: React.FC<Props> = ({ reminders, onViewAll }) => {
  const attention = reminders.filter((r) => ATTENTION.has(r.status ?? ""));

  return (
    <Card title="Upcoming Maintenance">
      {attention.length === 0 ? (
        <div className="text-center py-6 text-content-muted">
          <FontAwesomeIcon icon={faCircleCheck} className="text-3xl mb-3 text-success" />
          <p>Nothing due soon.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {attention.slice(0, MAX_SHOWN).map((r) => (
            <li key={r.id} className="py-3 flex justify-between items-center gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{r.name}</p>
                <p className="text-sm text-content-muted truncate">Due at {dueText(r)}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[r.status ?? ""]}`}
              >
                {STATUS_LABELS[r.status ?? ""]}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end pt-2">
        <Button label="View all reminders" variant="text" size="sm" onClick={onViewAll} />
      </div>
    </Card>
  );
};

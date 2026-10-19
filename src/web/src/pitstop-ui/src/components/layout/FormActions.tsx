import { Button } from "../ui/Button";

interface FormActionsProps {
  submitLabel: string;
  submitting: boolean;
  onCancel: () => void;
}

export const FormActions: React.FC<FormActionsProps> = ({ submitLabel, submitting, onCancel }) => (
  <div className="flex gap-3 pt-2">
    <Button type="submit" label={submitLabel} loading={submitting} size="sm" />
    <Button type="button" label="Cancel" size="sm" variant="outlined" onClick={onCancel} />
  </div>
);

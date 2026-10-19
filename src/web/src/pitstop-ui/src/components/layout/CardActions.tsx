import { faPencil, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "../ui/Button";

interface CardActionsProps {
  onEdit: () => void;
  onDelete: (event: React.MouseEvent) => void;
}

export const CardActions: React.FC<CardActionsProps> = ({ onEdit, onDelete }) => (
  <div className="flex justify-end gap-2 pt-2">
    <Button
      icon={<FontAwesomeIcon icon={faPencil} className="mr-1" />}
      label="Edit"
      variant="text"
      size="sm"
      onClick={onEdit}
    />
    <Button
      icon={<FontAwesomeIcon icon={faTrash} className="mr-1" />}
      label="Delete"
      variant="text"
      size="sm"
      severity="danger"
      onClick={onDelete}
    />
  </div>
);

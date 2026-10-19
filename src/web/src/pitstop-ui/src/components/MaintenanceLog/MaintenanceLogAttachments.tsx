import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import { Button } from "../ui/Button";
import { FileButton } from "../ui/FileButton";
import { ConfirmPopup } from "../ui/ConfirmPopup";
import { confirmPopup } from "../ui/confirmPopupStore";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { deleteMaintenanceAttachment, uploadMaintenanceAttachment } from "../../store/slices/maintenanceLogSlice";
import { maintenanceAttachmentsApi } from "../../api/maintenanceAttachmentsApi";

const ACCEPTED_CONTENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];

interface Props {
  vehicleId: number;
  maintenanceLogId: number;
}

export const MaintenanceLogAttachments: React.FC<Props> = ({ vehicleId, maintenanceLogId }) => {
  const dispatch = useAppDispatch();
  const attachments = useAppSelector(
    (s) => s.maintenanceLogs.recentMaintenanceLogs.find((f) => f.id === maintenanceLogId)?.attachments ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);

  const handleUpload = async (files: File[]) => {
    setError(null);
    try {
      for (const file of files) {
        await dispatch(uploadMaintenanceAttachment({ vehicleId, id: maintenanceLogId, file })).unwrap();
      }
    } catch {
      setError("Failed to upload attachment. Please try again.");
    }
  };

  const handleView = async (attachmentId: number) => {
    setViewingId(attachmentId);
    setError(null);
    try {
      const { url } = await maintenanceAttachmentsApi.getUrl(vehicleId, maintenanceLogId, attachmentId);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Failed to open attachment. Please try again.");
    } finally {
      setViewingId(null);
    }
  };

  const handleDelete = (event: React.MouseEvent, attachmentId: number) => {
    confirmPopup({
      target: event.currentTarget as HTMLElement,
      message: "Delete this attachment?",
      accept: async () => {
        setError(null);
        try {
          await dispatch(deleteMaintenanceAttachment({ vehicleId, id: maintenanceLogId, attachmentId })).unwrap();
        } catch {
          setError("Failed to delete attachment. Please try again.");
        }
      },
    });
  };

  return (
    <div className="flex flex-col gap-2" data-testid="attachments">
      <span className="text-sm font-medium text-secondary">Attachments</span>

      {attachments.length > 0 && (
        <ul className="flex flex-col gap-1">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{a.fileName}</span>
              <div className="flex gap-1 shrink-0">
                <Button
                  type="button"
                  icon={<FontAwesomeIcon icon={faEye} />}
                  size="sm"
                  variant="text"
                  loading={viewingId === Number(a.id)}
                  onClick={() => handleView(Number(a.id))}
                  aria-label={`View ${a.fileName}`}
                />
                <Button
                  type="button"
                  icon={<FontAwesomeIcon icon={faTrash} />}
                  size="sm"
                  variant="text"
                  severity="danger"
                  onClick={(e) => handleDelete(e, Number(a.id))}
                  aria-label={`Delete ${a.fileName}`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <FileButton
        label="Add Attachment"
        accept={ACCEPTED_CONTENT_TYPES}
        multiple
        onFiles={(files) => void handleUpload(files)}
      />

      {error && <span className="text-xs text-red-500">{error}</span>}

      <ConfirmPopup />
    </div>
  );
};

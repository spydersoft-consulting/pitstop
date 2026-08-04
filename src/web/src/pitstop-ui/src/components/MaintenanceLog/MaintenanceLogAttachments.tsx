import { useState } from "react";
import { FileUpload, type FileUploadHandlerEvent } from "primereact/fileupload";
import { Button } from "primereact/button";
import { ConfirmPopup, confirmPopup } from "primereact/confirmpopup";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { deleteMaintenanceAttachment, uploadMaintenanceAttachment } from "../../store/slices/maintenanceLogSlice";
import { maintenanceAttachmentsApi } from "../../api/maintenanceAttachmentsApi";

const ACCEPTED_CONTENT_TYPES = "application/pdf,image/jpeg,image/png,image/webp,image/heic";

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

  const handleUpload = async (event: FileUploadHandlerEvent) => {
    setError(null);
    try {
      for (const file of event.files) {
        await dispatch(uploadMaintenanceAttachment({ vehicleId, id: maintenanceLogId, file })).unwrap();
      }
    } catch {
      setError("Failed to upload attachment. Please try again.");
    } finally {
      event.options.clear();
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
                  icon="pi pi-eye"
                  className="p-button-sm p-button-text"
                  loading={viewingId === Number(a.id)}
                  onClick={() => handleView(Number(a.id))}
                  aria-label={`View ${a.fileName}`}
                />
                <Button
                  type="button"
                  icon="pi pi-trash"
                  className="p-button-sm p-button-text p-button-danger"
                  onClick={(e) => handleDelete(e, Number(a.id))}
                  aria-label={`Delete ${a.fileName}`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <FileUpload
        mode="basic"
        customUpload
        uploadHandler={handleUpload}
        multiple
        accept={ACCEPTED_CONTENT_TYPES}
        chooseLabel="Add Attachment"
        auto
        className="w-fit"
      />

      {error && <span className="text-xs text-red-500">{error}</span>}

      <ConfirmPopup />
    </div>
  );
};

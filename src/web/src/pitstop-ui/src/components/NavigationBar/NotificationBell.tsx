import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { OverlayPanel } from "primereact/overlaypanel";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../store/slices/notificationSlice";
import type { Notification } from "../../store/slices/notificationSlice";

interface NotificationBellProps {
  buttonClassName?: string;
}

const relativeTime = (iso: string): string => {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

// Deep-links back into PitStop from a notification's opaque EntityType/EntityId, per
// consumer-integration.md -- v1 only ever produces Vehicle-entity recall alerts.
const entityLink = (notification: Notification): string | undefined => {
  if (notification.entityType === "Vehicle" && notification.entityId) {
    return notification.type === "recall-alert"
      ? `/vehicles/${notification.entityId}/recalls`
      : `/vehicles/${notification.entityId}/edit`;
  }
  return undefined;
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ buttonClassName }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const overlayRef = useRef<OverlayPanel>(null);
  const { items, unreadCount } = useAppSelector((s) => s.notifications);

  const handleOpen = (e: React.SyntheticEvent) => {
    void dispatch(fetchNotifications());
    overlayRef.current?.toggle(e);
  };

  const handleSelect = (notification: Notification) => {
    if (!notification.isRead) {
      void dispatch(markNotificationRead(notification.id));
    }
    const link = entityLink(notification);
    if (link) {
      overlayRef.current?.hide();
      navigate(link);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={
          buttonClassName ??
          "relative h-10 w-10 flex items-center justify-center rounded-md hover:bg-white/10 bg-transparent border-0 cursor-pointer text-content-inverse"
        }
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
      >
        <FontAwesomeIcon icon={faBell} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] leading-4 text-center font-semibold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      <OverlayPanel ref={overlayRef} className="w-80">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-sm uppercase tracking-wide text-content-muted">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => dispatch(markAllNotificationsRead())}
              className="text-xs text-brand bg-transparent border-0 cursor-pointer hover:underline p-0"
            >
              Mark all read
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="text-sm text-content-muted py-4 text-center">No notifications yet</div>
        ) : (
          <ul className="max-h-80 overflow-y-auto space-y-1">
            {items.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(notification)}
                  className={[
                    "w-full text-left px-2 py-2 rounded-md border-0 cursor-pointer",
                    notification.isRead ? "bg-transparent" : "bg-brand/10",
                    "hover:bg-surface-muted",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-2">
                    {!notification.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-brand shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{notification.subject}</div>
                      <div className="text-xs text-content-muted">{relativeTime(notification.createdAt)}</div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </OverlayPanel>
    </>
  );
};

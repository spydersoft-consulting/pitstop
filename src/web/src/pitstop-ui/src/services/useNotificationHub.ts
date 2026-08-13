import { useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { createNotificationHubConnection } from "./notificationHub";
import { notificationApi } from "../api/notificationApi";
import { useAppDispatch } from "../store/hooks";
import { notificationReceived } from "../store/slices/notificationSlice";

// Registers a Device row once per app session on first successful connect -- kept decoupled
// from SignalR's own reconnect churn (network blips, laptop sleep) so it doesn't spam rows,
// per realtime-spec.md.
export function useNotificationHub(enabled: boolean): void {
  const dispatch = useAppDispatch();
  const deviceRegistered = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const connection = createNotificationHubConnection((push) => {
      dispatch(notificationReceived(push));
    });

    connection
      .start()
      .then(() => {
        if (deviceRegistered.current) return;
        deviceRegistered.current = true;
        return notificationApi.registerDevice({ deviceType: "Web", label: navigator.userAgent });
      })
      .catch(() => {
        // Best-effort real-time channel (see realtime-spec.md) -- a failed connection just
        // means the bell falls back to polling via fetchUnreadCount/fetchNotifications.
      });

    return () => {
      if (connection.state !== signalR.HubConnectionState.Disconnected) {
        void connection.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}

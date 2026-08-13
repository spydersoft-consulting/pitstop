import * as signalR from "@microsoft/signalr";
import type { NotificationPushDto } from "../api/types";

// Relative path through the BFF's "/notification-hub" proxy route (see
// Spydersoft.PitStop.Frontend/appsettings.json), which forwards to the notification service's
// hub at "/hubs/notifications". No accessTokenFactory is needed here: unlike a browser talking
// directly to the hub (which can't set headers on the WS upgrade, hence the hub's documented
// ?access_token= fallback), OidcProxy.Net is a real HTTP client server-side and attaches the
// session's Authorization header to every forwarded request, upgrade included.
const HUB_URL = "/notification-hub/hubs/notifications";

export function createNotificationHubConnection(
  onReceive: (notification: NotificationPushDto) => void,
): signalR.HubConnection {
  const connection = new signalR.HubConnectionBuilder().withUrl(HUB_URL).withAutomaticReconnect().build();

  connection.on("ReceiveNotification", onReceive);

  return connection;
}

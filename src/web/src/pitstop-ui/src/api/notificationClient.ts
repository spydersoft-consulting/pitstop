import axios from "axios";
import { notifyUnauthorized } from "../context/authSession";

// Separate instance from pitstopClient: the notification service is proxied through the BFF
// at a different route prefix ("/notification") than PitStop's own API ("/pitstop"), and isn't
// part of this repo's generated OpenAPI client (it's a different service's spec).
export const notificationClient = axios.create({ baseURL: "/notification" });

notificationClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      notifyUnauthorized();
    }
    return Promise.reject(error);
  },
);

import { client } from "./generated/client.gen";
import { notifyUnauthorized } from "../context/authSession";

// Use relative URLs so requests go through the Vite dev proxy (dev) or
// the Frontend BFF (production). The generated default points to the raw API
// host, which is only reachable during spec generation.
client.setConfig({ baseURL: "/pitstop" });

client.instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      notifyUnauthorized();
    }
    return Promise.reject(error);
  },
);

export { client };

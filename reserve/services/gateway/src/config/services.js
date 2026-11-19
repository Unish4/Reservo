import { ENV } from "./env.js";

export const SERVICES = Object.freeze({
  identity: {
    url: ENV.IDENTITY_SERVICE_URL,
    prefix: "/api/identity",
  },
  booking: {
    url: ENV.BOOKING_SERVICE_URL,
    prefix: "/api/booking",
  },
});

import { consume } from "../config/mq.js";
import { sendBookingNotification } from "../services/notificationService.js";

export const QUEUE = "notification.booking.cancelled";
export const ROUTING_KEY = "booking.cancelled";

export function startBookingCancelledConsumer() {
  return consume({
    queue: QUEUE,
    routingKey: ROUTING_KEY,
    handler: (payload) => sendBookingNotification("cancelled", payload),
  });
}

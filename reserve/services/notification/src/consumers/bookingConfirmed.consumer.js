import { consume } from "../config/mq.js";
import { sendBookingNotification } from "../services/notificationService.js";

export const QUEUE = "notification.booking.confirmed";
export const ROUTING_KEY = "booking.confirmed";

// Thin on purpose: all logic lives in notificationService. The consumer only
// wires queue -> handler, so the service stays testable without RabbitMQ.
export function startBookingConfirmedConsumer() {
  return consume({
    queue: QUEUE,
    routingKey: ROUTING_KEY,
    handler: (payload) => sendBookingNotification("confirmed", payload),
  });
}

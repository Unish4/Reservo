import amqp from "amqplib";
import { ENV } from "./env.js";
import logger from "./logger.js";
import { AppError } from "../utils/AppError.js";

// Topology (all durable so it survives a broker restart):
//
//   booking service --publishes--> [reserve.events (topic)]
//                                        | routingKey e.g. "booking.confirmed"
//                                        v
//                         [notification.booking.confirmed]  <- our queue
//                                        | on reject (nack requeue=false)
//                                        v
//                      [reserve.events.dlx (direct)] -> [<queue>.dlq]
//
// WHY one queue per consumer: each consumer gets its own copy of the event, and
// one slow or failing consumer can't block another. Future services (analytics,
// reminders) bind their own queues to the same exchange without touching ours.
const DLX = `${ENV.RABBITMQ_EXCHANGE}.dlx`;

let connection = null;
let channel = null;
let closing = false;
let reconnecting = false;
let inFlight = 0;

// Kept so we can re-attach every consumer after a reconnect.
const registrations = [];
const activeConsumers = []; // { channel, tag }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open() {
  const conn = await amqp.connect(ENV.RABBITMQ_URL);

  // WHY handle "error": amqplib emits it on socket failure; with no listener
  // Node treats it as an unhandled 'error' event and kills the process.
  conn.on("error", (err) => {
    logger.error({ message: err.message }, "mq.connection.error");
  });
  conn.on("close", () => {
    channel = null;
    connection = null;
    if (closing) return;
    logger.warn("mq.connection.closed");
    reconnect();
  });

  const ch = await conn.createChannel();
  ch.on("error", (err) => {
    logger.error({ message: err.message }, "mq.channel.error");
  });

  // WHY prefetch: without it RabbitMQ pushes the entire backlog to this
  // process at once. Capping unacked messages bounds memory and makes the
  // work spread fairly if we ever run two replicas.
  await ch.prefetch(ENV.RABBITMQ_PREFETCH);

  await ch.assertExchange(ENV.RABBITMQ_EXCHANGE, "topic", { durable: true });
  await ch.assertExchange(DLX, "direct", { durable: true });

  connection = conn;
  channel = ch;
}

export async function connectMQ() {
  closing = false;
  try {
    await open();
  } catch (err) {
    logger.error({ message: err.message }, "mq.connect.failed");
    throw err;
  }
  logger.info({ exchange: ENV.RABBITMQ_EXCHANGE }, "mq.connected");
}

async function reconnect() {
  if (reconnecting || closing) return;
  reconnecting = true;
  let attempt = 0;

  while (!closing) {
    attempt += 1;
    await sleep(Math.min(attempt * 1000, 10_000));
    try {
      await open();
      activeConsumers.length = 0;
      for (const reg of registrations) await attach(reg);
      logger.info({ attempt }, "mq.reconnected");
      break;
    } catch (err) {
      logger.error({ attempt, message: err.message }, "mq.reconnect.failed");
    }
  }
  reconnecting = false;
}

// A permanent failure (bad payload) will never succeed on retry, so it goes
// straight to the DLQ. Everything else (SMTP down, Mongo blip) is transient.
function isPermanent(err) {
  return (
    err instanceof AppError && err.statusCode >= 400 && err.statusCode < 500
  );
}

async function attach({ queue, routingKey, handler }) {
  const ch = channel;
  if (!ch) throw new Error("MQ channel not ready");

  const dlq = `${queue}.dlq`;
  await ch.assertQueue(dlq, { durable: true });
  await ch.bindQueue(dlq, DLX, queue);

  // NOTE: x-dead-letter-* args are part of the queue's identity. If you ever
  // change them on an existing queue, RabbitMQ rejects the assert with
  // PRECONDITION_FAILED; delete the queue in the management UI first.
  await ch.assertQueue(queue, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": DLX,
      "x-dead-letter-routing-key": queue,
    },
  });
  await ch.bindQueue(queue, ENV.RABBITMQ_EXCHANGE, routingKey);

  const { consumerTag } = await ch.consume(queue, async (msg) => {
    if (!msg) return; // broker cancelled us (e.g. queue deleted)

    inFlight += 1;
    try {
      let payload;
      try {
        payload = JSON.parse(msg.content.toString("utf8"));
      } catch {
        logger.error({ queue }, "mq.message.unparseable");
        ch.nack(msg, false, false); // poison message -> DLQ
        return;
      }

      try {
        await handler(payload, msg);
        ch.ack(msg);
      } catch (err) {
        const redelivered = msg.fields.redelivered;
        const dead = isPermanent(err) || redelivered;

        logger.error(
          {
            queue,
            routingKey: msg.fields.routingKey,
            code: err.code,
            message: err.message,
            action: dead ? "dead-letter" : "requeue-once",
          },
          "mq.message.failed",
        );

        // WHY "requeue once": requeue=true forever would hot-loop a failing
        // message at full speed. One retry absorbs a blip; after that we park
        // it in the DLQ where a human can inspect and replay it.
        ch.nack(msg, false, !dead);
      }
    } catch (ackErr) {
      // Channel died mid-handler. Not acking is correct: the broker will
      // redeliver, and the idempotent send makes that safe.
      logger.error({ message: ackErr.message }, "mq.ack.failed");
    } finally {
      inFlight -= 1;
    }
  });

  activeConsumers.push({ channel: ch, tag: consumerTag });
  logger.info({ queue, routingKey }, "mq.consumer.started");
}

export async function consume(registration) {
  registrations.push(registration);
  await attach(registration);
}

export function isMQConnected() {
  return channel !== null;
}

export async function closeMQ() {
  closing = true;

  // 1) stop receiving new messages
  for (const { channel: ch, tag } of activeConsumers) {
    await ch.cancel(tag).catch(() => {});
  }

  // 2) let handlers that are mid-send finish so we don't ack-less abort an
  //    email and force a redelivery
  const deadline = Date.now() + 5_000;
  while (inFlight > 0 && Date.now() < deadline) await sleep(100);
  if (inFlight > 0) logger.warn({ inFlight }, "mq.shutdown.inflight.abandoned");

  await channel?.close().catch(() => {});
  await connection?.close().catch(() => {});
  channel = null;
  connection = null;
  logger.info("mq.disconnected.by.shutdown");
}


import amqp from "amqplib";
import cron from "node-cron";
import logger from '../backend/logger.js';

const RABBIT_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

let channel;

async function connect()
{

  try
  {

    const conn = await amqp.connect(RABBIT_URL);

    channel = await conn.createChannel();

    await channel.assertQueue("tasks",

      { durable: true }

    );

    logger.info("Scheduler connecté à RabbitMQ", { url: RABBIT_URL });

  }

  catch (err)
  {

    logger.error("Erreur connexion RabbitMQ", { err: err && (err.message || String(err)) });

    setTimeout(connect, 3000);

  }

}

let counter = 0;

function publishJob()
{

  if (!channel) {
    logger.warn("Channel non prêt, job ignoré");
    return;
  }

  const job = {

    id: `job-${Date.now()}-${counter++}`,

    type: "collect",

    createdAt: Date.now()

  };

  channel.sendToQueue(
    "tasks",
    Buffer.from(JSON.stringify(job)),
    { persistent: true }
  );
  logger.info("Job publié", { jobId: job.id });

}

await connect();

cron.schedule("*/30 * * * * *", () =>
{

  publishJob();

});

console.log("Scheduler démarré — publication toutes les 30s");

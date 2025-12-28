import amqp from "amqplib";
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

    await channel.assertQueue("failed_tasks",

      { durable: true }

    );

    await channel.prefetch(1);

    channel.consume("tasks", handleMessage,

      { noAck: false }

    );

    logger.info("Worker connecté et en écoute sur la queue 'tasks'", { url: RABBIT_URL });

  }

  catch (err)
  {

    logger.error("Erreur connexion RabbitMQ (worker)", { err: err && (err.message || String(err)) });

    setTimeout(connect, 3000);

  }

}

async function processJob(job)
{

  await new Promise((res) => setTimeout(res, 1000));

  if (Math.random() < 0.15) {
    throw new Error("Erreur simulée de traitement");
  }
  return { ok: true };

}

async function handleMessage(msg)
{

  if (!msg)
  {

    return;

  }

  const content = msg.content.toString();

  let job;

  try
  {

    job = JSON.parse(content);

  }

  catch (err)
  {

    console.error("Message JSON invalide, ack et skip");

    channel.ack(msg);

    return;

  }

  const headers = msg.properties.headers || {};

  const retries = headers["x-retries"] || 0;

  try
  {

    logger.info('Processing job', { jobId: job.id, retries });
    await processJob(job);
    channel.ack(msg);
    logger.info('Job traité', { jobId: job.id });

  }

  catch (err)
  {

    logger.error('Erreur traitement job', { jobId: job.id, err: err && (err.message || String(err)) });

    if (retries < 3)
    {

      const newHeaders = { ...headers, "x-retries": retries + 1 };

      channel.sendToQueue(
        "tasks",
        Buffer.from(JSON.stringify(job)),
        { persistent: true, headers: newHeaders }
      );
      channel.ack(msg);
      logger.info('Job re-publié pour retry', { jobId: job.id, tries: retries + 1 });

    }

    else
    {

      channel.sendToQueue(
        "failed_tasks",
        Buffer.from(JSON.stringify({ job, error: err.message, failedAt: Date.now() })),
        { persistent: true }
      );
      channel.ack(msg);
      logger.info("Job déplacé vers 'failed_tasks'", { jobId: job.id });

    }

  }

}

await connect();

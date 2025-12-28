import amqp from "amqplib";

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

    console.log("Worker connecté et en écoute sur la queue 'tasks'");

  }

  catch (err)
  {

    console.error("Erreur connexion RabbitMQ (worker):", err.message);

    setTimeout(connect, 3000);

  }

}

async function processJob(job)
{

  await new Promise((res) => setTimeout(res, 1000));

  if (Math.random() < 0.15)
  {

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

    console.log("Processing job", job.id, "retries:", retries);

    await processJob(job);

    channel.ack(msg);

    console.log("Job traité:", job.id);

  }

  catch (err)
  {

    console.error("Erreur traitement job", job.id, err.message);

    if (retries < 3)
    {

      const newHeaders = { ...headers, "x-retries": retries + 1 };

      channel.sendToQueue(

        "tasks",

        Buffer.from(JSON.stringify(job)),

        { persistent: true, headers: newHeaders }

      );

      channel.ack(msg);

      console.log("Job re-publié pour retry:", job.id, "tries:", retries + 1);

    }

    else
    {

      channel.sendToQueue(

        "failed_tasks",

        Buffer.from(JSON.stringify({ job, error: err.message, failedAt: Date.now() })),

        { persistent: true }

      );

      channel.ack(msg);

      console.log("Job déplacé vers 'failed_tasks':", job.id);

    }

  }

}

await connect();

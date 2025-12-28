import amqp from "amqplib";
import cron from "node-cron";

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

    console.log("Scheduler connecté à RabbitMQ");

  }

  catch (err)
  {

    console.error("Erreur connexion RabbitMQ:", err.message);

    setTimeout(connect, 3000);

  }

}

let counter = 0;

function publishJob()
{

  if (!channel)
  {

    console.warn("Channel non prêt, job ignoré");

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

  console.log("Job publié:", job.id);

}

await connect();

cron.schedule("*/30 * * * * *", () =>
{

  publishJob();

});

console.log("Scheduler démarré — publication toutes les 30s");

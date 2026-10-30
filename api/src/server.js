import Fastify from 'fastify';
import { pool, initDb } from './db.js';
import { connectMqtt, mqttConnected, publish } from './mqtt.js';

const app = Fastify({ logger: true });

// ---------- helpers ----------

const stateSchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    power: { type: 'boolean' },
    brightness: { type: 'integer', minimum: 0, maximum: 100 },
    hue: { type: 'integer', minimum: 0, maximum: 360 },
    saturation: { type: 'integer', minimum: 0, maximum: 100 },
  },
};

// What we publish to the bulb. Adjust once you know the bulb's topic format.
function toBulbPayload(light) {
  return {
    power: light.power,
    brightness: light.brightness,
    hue: light.hue,
    saturation: light.saturation,
  };
}

// ---------- routes ----------

app.get('/health', async (req, reply) => {
  try {
    await pool.query('SELECT 1');
    return { ok: true, db: true, mqtt: mqttConnected() };
  } catch (err) {
    req.log.error({ err }, 'health check: db failed');
    return reply.code(503).send({ ok: false, db: false, mqtt: mqttConnected() });
  }
});

app.get('/lights', async () => {
  const { rows } = await pool.query('SELECT * FROM lights ORDER BY id');
  return rows;
});

app.get('/lights/:id', async (req, reply) => {
  const { rows } = await pool.query('SELECT * FROM lights WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return reply.code(404).send({ error: 'light not found' });
  return rows[0];
});

app.post(
  '/lights',
  {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'topic'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1 },
          topic: { type: 'string', minLength: 1 },
        },
      },
    },
  },
  async (req, reply) => {
    try {
      const { rows } = await pool.query(
        'INSERT INTO lights (name, topic) VALUES ($1, $2) RETURNING *',
        [req.body.name, req.body.topic],
      );
      return reply.code(201).send(rows[0]);
    } catch (err) {
      if (err.code === '23505') return reply.code(409).send({ error: 'name already exists' });
      throw err;
    }
  },
);

// Change a light's desired state: write to the DB, then publish to MQTT.
app.post('/lights/:id/state', { schema: { body: stateSchema } }, async (req, reply) => {
  const { power, brightness, hue, saturation } = req.body;

  const { rows } = await pool.query(
    `UPDATE lights SET
       power      = COALESCE($2, power),
       brightness = COALESCE($3, brightness),
       hue        = COALESCE($4, hue),
       saturation = COALESCE($5, saturation),
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [req.params.id, power ?? null, brightness ?? null, hue ?? null, saturation ?? null],
  );
  if (rows.length === 0) return reply.code(404).send({ error: 'light not found' });

  const light = rows[0];
  let published = false;
  try {
    published = await publish(req.log, light.topic, toBulbPayload(light));
  } catch (err) {
    req.log.error({ err }, 'MQTT publish failed');
  }

  return { light, published };
});

// ---------- start ----------

try {
  await initDb();
  connectMqtt(app.log);
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

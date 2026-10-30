import mqtt from 'mqtt';

let client = null;

// MQTT is optional while testing: with no MQTT_URL the API just logs what it would publish.
export function connectMqtt(log) {
  if (!process.env.MQTT_URL) {
    log.warn('MQTT_URL not set, publishes will be logged only');
    return;
  }
  client = mqtt.connect(process.env.MQTT_URL, {
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASSWORD,
  });
  client.on('connect', () => log.info('MQTT connected'));
  client.on('error', (err) => log.error({ err }, 'MQTT error'));
}

export function mqttConnected() {
  return client?.connected ?? false;
}

// Returns true if published, false if skipped.
export async function publish(log, topic, payload) {
  const message = JSON.stringify(payload);
  if (!client?.connected) {
    log.info({ topic, message }, 'MQTT not connected, would publish');
    return false;
  }
  await client.publishAsync(topic, message, { retain: true, qos: 1 });
  return true;
}

const redis = require('redis');
require("dotenv").config();

  const redis_url = process.env.REDIS_URL|| "redis://127.0.0.1:6379/";
  const redis_client = redis.createClient({
    url: redis_url,
    socket: {
      tls: (redis_url.match(/rediss:/) != null),
      rejectUnauthorized: false,
    }
  });
  

function redis_error_handler(err) {
  console.debug(`node-redis version is ${require('redis/package.json').version}`);
  console.debug(err);
}

(async () => {
  redis_client.on('error', (err) => {
    console.debug('Error from Redis Client:', err);
    process.exit(1);
  });
  redis_client.on('ready', () => console.debug('Redis is ready..'));

  const connect = await redis_client.connect().catch(redis_error_handler);;
  const pong = await redis_client.ping().catch(redis_error_handler);
})();

module.exports = {
  ...redis_client,
  get: (redis_client.get).bind(redis_client),
  hget: (redis_client.hGet).bind(redis_client),
  hgetall: (redis_client.hGetAll).bind(redis_client),
  expire: (redis_client.expire).bind(redis_client),
  set: (redis_client.set).bind(redis_client),
  mset: (redis_client.mSet).bind(redis_client),
  hset: (redis_client.hSet).bind(redis_client),

};
/**
 * Redis
 */
// Import ioredis.
// You can also use `import Redis from "ioredis"`
// if your project is an ESM module or a TypeScript project.
const Redis = require("ioredis");

// Create a Redis instance.
// By default, it will connect to localhost:6379.
// We are going to cover how to specify connection options soon.
// const redis = new Redis();
let redisClient = '';

redisClient = new Redis({
    port: process.env.REDIS_PORT || 6379, // Redis port
    host: process.env.REDIS_HOST || "127.0.0.1", // Redis host
    username: process.env.REDIS_USERNAME || "default", // needs Redis >= 6
    password: process.env.REDIS_PASSWORD || "my-top-secret",
    db: process.env.REDIS_DB || 0, // Defaults to 0
});

// dev testing
redisClient.set("devtesting", "the value"); // Returns a promise which resolves to "OK" when the command succeeds.

// Redis Client Ready
redisClient.once('ready', function() {
    console.log('redis client is ready')

    // Flush Redis DB
    // redisClient.flushdb();

    // Initialize Chatters
    redisClient.get('chat_users', function(err, reply) {
        if (reply) {
            chatters = JSON.parse(reply);
        }
    });

    // Initialize Messages
    redisClient.get('chat_app_messages', function(err, reply) {
        if (reply) {
            chat_messages = JSON.parse(reply);
        }
    });
});

module.exports = { redisClient }
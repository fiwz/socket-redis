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
    retryStrategy: function (times) {

        if (times % 4 ==0) {
          logger.error("redisRetryError", 'Redis reconnect exhausted after 3 retries.');
          return null;
        }

        return 200;

    }
});

// Redis Client Ready
redisClient.once('ready', function() {
    console.log('redis new:redis client is ready')

    // dev testing
    redisClient.set("devtesting", "the value"); // Returns a promise which resolves to "OK" when the command succeeds.
});

async function justVariable() {
// const justVariable = {
    try {
        const chattersData =
        // await redisClient.connect(function () { /* Do your stuff */
            await redisClient.get('chat_users', function(err, reply) {
                if (reply) {
                    console.log('redis new:user is:', reply)
                    let chatters = JSON.parse(reply);
                    let arrChatters = [];
                    for (var i = 0; i < chatters.length; i++) {
                        arrChatters.push(chatters[i]);
                    }
                    return arrChatters
                }
            })
        // });

        const chatAppMessages =
            await redisClient.get('chat_app_messages', function(err, reply) {
                if (reply) {
                    console.log('redis new:messagessss from redis', reply)
                    chat_messages = JSON.parse(reply);
                    let arrMessage = [];
                    for (var i = 0; i < chat_messages.length; i++) {
                        arrMessage.push(chat_messages[i]);
                    }
                    return arrMessage
                }
            });

        const user1 = "developer"

        return {
            chattersData,
            chatAppMessages,
            user1
        }
    } catch (e) {
        console.error(e);
    }
};

// console.log('status:', redisClient.status)

module.exports = { justVariable, redisClient }
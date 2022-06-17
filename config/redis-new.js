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
    try {
        const chattersData =
            // await redisClient.get('chat_users', function(err, reply) {
            await redisClient.call('JSON.GET', 'chat_users', function(err, reply) {
                let arrChatters = []
                if (reply) {
                    arrChatters = JSON.parse(reply);
                }
                return arrChatters
            })

        const chatAppMessages =
            await redisClient.exists('chat_app_messages').then((respExists) => {
                console.log('raw exists is: ', respExists)
                return respExists
            })
            .then( async (result1) => {
                console.log('from the first then: ', result1)
                // return "second then"
                let arrMessage = [];
                if(result1 !== 0) {
                    let msgFromRedis = await redisClient.call('JSON.GET', 'chat_app_messages', function(err, reply) {
                        if (reply) {
                            // console.log('redis new:messagessss from redis', reply)
                            chat_messages = JSON.parse(reply);
                            return chat_messages
                        } else {
                            return []
                        }
                    });

                    arrMessage = msgFromRedis
                    console.log('msgFromRedis', msgFromRedis)
                }

                return arrMessage
            })

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
// justVariable().then(x => console.log('result is:', x))

module.exports = { justVariable, redisClient }
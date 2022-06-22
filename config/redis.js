/**
 * Redis
 */
// Import ioredis.
// You can also use `import Redis from "ioredis"`
// if your project is an ESM module or a TypeScript project.
const Redis = require("ioredis");
const bcrypt = require("bcrypt")

// Create a Redis instance.
// By default, it will connect to localhost:6379.
// We are going to cover how to specify connection options soon.
// const redis = new Redis();
// let redisClient = '';
const redisCnf = {
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
}
const redisClient = new Redis(redisCnf);
const redisSub = new Redis(redisCnf);

// Redis Client Ready
redisClient.once('ready', async function() {
    console.log('redis new:redis client is ready')

    // dev testing
    redisClient.set("devtesting", "the value"); // Returns a promise which resolves to "OK" when the command succeeds.
    redisClient.call('JSON.SET', 'devtesting_json', '.', JSON.stringify({ "from": "developer", "message": "helloooo" })) // test reJSON

    redisClient.set('username:developer', 'user:100')
    redisClient.hmset('user:100',
        [
            "username", "developer",
            "password", await bcrypt.hash("password123", 10),
            "company_name", "A",
            "department", "general"
        ]
    )
    redisClient.set('username:developer2', 'user:101')
    redisClient.hmset('user:101',
        [
            "username", "developer2",
            "password", await bcrypt.hash("password123", 10),
            "company_name", "A",
            "department", "IT"
        ]
    )
});

const justVariable = {
    chattersData : async () => {
        const chatters = await redisClient.call('JSON.GET', 'chat_users', function(err, reply) {
            let arrChatters = []
            if (reply) {
                arrChatters = JSON.parse(reply);
            }
            return arrChatters
        })
        return chatters
    },

    chatAppMessages : async () => {
        const msgExists = await redisClient.exists('chat_app_messages');
        console.log('msgExists: ', msgExists)

        let arrMessage = [];
        if(msgExists !== 0) {
            let msgFromRedis = await redisClient.call('JSON.GET', 'chat_app_messages', function(err, reply) {
                if (reply) {
                    chat_messages = JSON.parse(reply);
                    return chat_messages
                } else {
                    return []
                }
            });
            arrMessage = msgFromRedis
        }
        return arrMessage
    },

    user1 : "developer",
}

module.exports = {
    justVariable,
    client: redisClient,
    sub: redisSub,
}
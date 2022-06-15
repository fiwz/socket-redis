const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    allowEIO3: true // false by default
});
const PORT = process.env.PORT || 4000;
require('dotenv').config(); // env
const fs = require('fs');
var creds = '';

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
const redis = new Redis();
var client = '';

// Express Middleware for serving static
// files and parsing the request body
app.use(express.static('public'));

// set body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/**
 * Router/routes
 */
 const mainRouter = require('./routes/index-router');
// Set Routing
// app.use('/main-page', mainRouter)

const { responseData, responseMessage } = require('./utils/response-handler');

// Create Server
const server = http.listen(PORT, () => console.log(`Server running at port: ${PORT}`));
console.info('Current Env: ', process.env.APP_ENV)

// Store people in chatroom
var chatters = [];
// Store messages in chatroom
var chat_messages = [];

// Read credentials from JSON
fs.readFile('./config/redis-creds.json', 'utf-8', function(err, data) {
    if(err) throw err;
    creds = JSON.parse(data);
    // client = redis.createClient('redis://' + creds.user + ':' + creds.password + '@' + creds.host + ':' + creds.port);

    client = new Redis({
        port: 6379, // Redis port
        host: "127.0.0.1", // Redis host
        username: "default", // needs Redis >= 6
        password: "my-top-secret",
        db: 0, // Defaults to 0
    });

    // dev testing
    redis.set("mykey", "value"); // Returns a promise which resolves to "OK" when the command succeeds.

    // Redis Client Ready
    client.once('ready', function() {
        console.log('redis client is ready')

        // Flush Redis DB
        // client.flushdb();

        // Initialize Chatters
        client.get('chat_users', function(err, reply) {
            if (reply) {
                chatters = JSON.parse(reply);
            }
        });

        // Initialize Messages
        client.get('chat_app_messages', function(err, reply) {
            if (reply) {
                chat_messages = JSON.parse(reply);
            }
        });
    });
});

/**
 * UI
 */
app.get('/ui',function(req,res){
    res.sendFile(path.join(__dirname+'/views/index.html'));
    //__dirname : It will resolve to your project folder.
});

/**
 *  API
 */
// API - Join Chat
app.post('/join', function(req, res) {
    var username = req.body.username;
    console.log('debug', chatters.indexOf(username) === -1, chatters.indexOf(username))
    if (chatters.indexOf(username) === -1) {
        chatters.push(username);
        client.set('chat_users', JSON.stringify(chatters));

        responseData(res, 200, {
            'chatters': chatters,
            'status': 'OK'
        })
    } else {

        responseData(res, 500, {
            'status': 'failed'
        })
    }
});

// API - Leave Chat
app.post('/leave', function(req, res) {
    var username = req.body.username;
    chatters.splice(chatters.indexOf(username), 1);
    client.set('chat_users', JSON.stringify(chatters));
    responseData(res, 200, {
        'status': 'OK'
    })
});

// API - Send + Store Message
app.post('/send_message', function(req, res) {
    var username = req.body.username;
    var message = req.body.message;
    chat_messages.push({
        'sender': username,
        'message': message
    });
    client.set('chat_app_messages', JSON.stringify(chat_messages));
    responseData(res, 200, {
        'status': 'OK'
    })
});

// API - Get Messages
app.get('/get_messages', function(req, res) {
    responseData(res, 200, chat_messages)
});

// API - Get Chatters
app.get('/get_chatters', function(req, res) {
    console.log('chatters', chatters, chatters.length)
    responseData(res, 200, { numberOfChatters: chatters.length, member_joined: chatters})
});

/**
 * Socket
 */
// Define Namespace
const agentNamespace = io.of("/agents");

// Register Handlers
const registerAgentHandlers = require("./handler/agentHandler");
const onConnection = (socket) => {
    registerAgentHandlers(agentNamespace, socket);
}

// Socket Connection
io.on("connection", onConnection);

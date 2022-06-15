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

// Redis
const redis = require('./config/redis');
const redisClient = redis.redisClient

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

    redis.chattersData.then((ctr) => {
        if(ctr) {
            chatters = JSON.parse(ctr);
        }
        let arrChatters = [];
        for (var i = 0; i < chatters.length; i++) {
            arrChatters.push(chatters[i]);
        }
        arrChatters.push(username);
        redisClient.set('chat_users', JSON.stringify(arrChatters));

        console.log('server:arrChatters', arrChatters)

        mainNamespace.emit('count_chatters', { numberOfChatters: arrChatters.length, member_joined: arrChatters})

        responseData(res, 200, {
            'chatters': arrChatters,
            'status': 'OK'
        })
    })

});

// API - Leave Chat
app.post('/leave', function(req, res) {
    var username = req.body.username;
    chatters.splice(chatters.indexOf(username), 1);
    redisClient.set('chat_users', JSON.stringify(chatters));
    responseData(res, 200, {
        'status': 'OK'
    })
});

// API - Send + Store Message
app.post('/send_message', function(req, res) {
    var username = req.body.username;
    var message = req.body.message;

    redis.chatAppMessages.then((ctr) => {
        let messageData = []
        if(ctr) {
            messageData = JSON.parse(ctr);
        }

        let arrMsg = [];
        for (var i = 0; i < messageData.length; i++) {
            arrMsg.push(messageData[i]);
        }
        arrMsg.push({
            'sender': username,
            'message': message
        });

        console.log('arrMsg', arrMsg)

        redisClient.set('chat_app_messages', JSON.stringify(arrMsg));
        responseData(res, 200, {
            'status': 'OK'
        })
    })

});

// API - Get Messages
app.get('/get_messages', function(req, res) {
    // responseData(res, 200, chat_messages)

    redis.chatAppMessages.then((ctr) => {
        let messageData = []
        if(ctr) {
            messageData = JSON.parse(ctr);
        }
        console.log('server:get_msg', messageData)
        responseData(res, 200, messageData)
    })

});

// API - Get Chatters
app.get('/get_chatters', function(req, res) {
    redis.chattersData.then((ctr) => {
        let userData = []
        if(ctr) {
            userData = JSON.parse(ctr);
        }
        responseData(res, 200, { numberOfChatters: userData.length, member_joined: userData})
    })
});

/**
 * Socket
 */
// Define Namespace
const mainNamespace = io;
// const agentNamespace = io.of("/agents");

// Register Handlers
const registerMainHandlers = require("./handler/mainHandler");
// const registerAgentHandlers = require("./handler/agentHandler");
const onConnection = (socket) => {
    registerMainHandlers(mainNamespace, socket);
    // registerAgentHandlers(agentNamespace, socket);
}

// Socket Connection
mainNamespace.on("connection", onConnection);
// agentNamespace.on("connection", onConnection);

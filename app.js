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
// const redis = require('./config/redis');
// const redisClient = redis.redisClient
const redisNew = require('./config/redis-new');

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
    redisNew.justVariable().then((response) => {
        let arrChatters = [];
        if(response.chattersData) {
            // console.log('server:/join response.chattersData', response.chattersData)
            chatters = JSON.parse(response.chattersData);
            for (var i = 0; i < chatters.length; i++) {
                arrChatters.push(chatters[i]);
            }
            // console.log('chatters.length awal: ', chatters.length)
            // console.log('sebelum: ', arrChatters)
        }

        arrChatters.push(username);

        (async () => {
            // await redisNew.redisClient.set('chat_users', JSON.stringify(arrChatters));
            await redisNew.redisClient.call('JSON.SET', 'chat_users', '.', JSON.stringify(arrChatters))
            // console.log('server:arrChatters setelah: ', arrChatters)
        })()

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
    redisNew.redisClient.set('chat_users', JSON.stringify(chatters));
    responseData(res, 200, {
        'status': 'OK'
    })
});

// API - Send + Store Message
app.post('/send_message', function(req, res) {
    var username = req.body.username;
    var message = req.body.message;

    let newmsg = {
        'sender': username,
        'message': message
    };

    redisNew.justVariable().then((response) => {
        let arrMsg = [];
        let objMsg = {}
        if(response.chatAppMessages.length !== 0) {
            arrMsg = JSON.parse(response.chatAppMessages)
        }
        arrMsg.push(newmsg);

        (async () => {
            // await redisNew.redisClient.set('chat_app_messages', JSON.stringify(arrMsg))
            await redisNew.redisClient.call('JSON.SET', 'chat_app_messages', '.', JSON.stringify(arrMsg))
        })()

        responseData(res, 200, { 'status': 'OK' })
    })
});

// API - Get Messages
app.get('/get_messages', function(req, res) {
    redisNew.justVariable().then((response) => {
        let messageData = []
        if(response.chatAppMessages.length !== 0) {
            messageData = JSON.parse(response.chatAppMessages);
            console.log('server:get_msg', messageData)
        }

        responseData(res, 200, messageData)
    })

});

// API - Get Chatters
app.get('/get_chatters', function(req, res) {
    console.info('status:', redisNew.redisClient.status)

    // redisClient.connect(function () { /* Do your stuff */
    redisNew.justVariable().then((response) => {
        // console.log('rawnya: ', response)

        let userData = []
        if(response.chattersData) {
            console.log('response.chattersData', response.chattersData)
            userData = JSON.parse(response.chattersData);
        }

        /** Dev Debug */
        // Set String
        // (async () => { await redisNew.redisClient.set('test_aja', 'yeeeaaa') })()

        // Set JSON
        // (command_name, key, root, value)
        // (async () => {
        //     await redisNew.redisClient.call('JSON.SET', 'testing_json', '.', '{ "message": "wkwkwk" }')
        //     console.log('aaaaaa', await redisNew.redisClient.exists('chat_app_messages'));
        // })()

        responseData(res, 200, { numberOfChatters: userData.length, member_joined: userData})
    })
    // });
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

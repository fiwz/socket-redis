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
const redisF = redis.justVariable
const redisClient = redis.client

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
    redisF.chattersData()
    .then(async (response) => {
        let arrChatters = [];
        if(response) {
            arrChatters = JSON.parse(response);
        }
        arrChatters.push(username);
        await redisClient.call('JSON.SET', 'chat_users', '.', JSON.stringify(arrChatters))

        // emit
        mainNamespace.emit('count_chatters', { numberOfChatters: arrChatters.length, member_joined: arrChatters})

        responseData(res, 200, {
            'chatters': arrChatters,
            'status': 'OK'
        })
    })
    .catch((error) => {
        console.log('Error Join Chat ', error)
        responseData(res, 200, {
            'chatters': [],
            'status': 'Error'
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
app.post('/send_message', async function(req, res) {
    var username = req.body.username;
    var message = req.body.message;

    let newmsg = {
        'sender': username,
        'message': message
    };

    redisF.chatAppMessages()
    .then(async (response) => {
        let arrMsg = [];
        if(response.length !== 0) {
            arrMsg = JSON.parse(response)
        }
        arrMsg.push(newmsg);
        await redisClient.call('JSON.SET', 'chat_app_messages', '.', JSON.stringify(arrMsg))

        responseData(res, 200, { 'status': 'OK' })
    })
    .catch((error) => {
        console.log('Error Send Message ', error)
        responseData(res, 200, [])
    })
});

// API - Get Messages
app.get('/get_messages', async function(req, res) {
    redisF.chatAppMessages()
    .then((response) => {
        let messageData = []
        messageData = JSON.parse(response);
        responseData(res, 200, messageData)
    })
    .catch((error) => {
        console.log('Error Get Messages ', error)
        responseData(res, 200, [])
    })
});

// API - Get Chatters
app.get('/get_chatters', async function(req, res) {
    redisF.chattersData()
    .then((response) => {
        console.log('chatters: ', response)
        let userData = []
        if(userData) {
            userData = JSON.parse(response);
        }

        responseData(res, 200, { numberOfChatters: userData.length, member_joined: userData})
    })
    .catch((error) => {
        console.log('Error Get Chatters ', error)
        responseData(res, 200, { numberOfChatters: 0, member_joined: []})
    })
});

/**
 * Socket
 */
// Define Namespace
const mainNamespace = io;

// Register Handlers
const registerMainHandlers = require("./handler/mainHandler");

const onConnection = (socket) => {
    registerMainHandlers(mainNamespace, socket);
}

// Socket Connection
mainNamespace.on("connection", onConnection);
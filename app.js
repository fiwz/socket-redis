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
const bcrypt = require("bcrypt");
const session = require("express-session");
let RedisStore = require("connect-redis")(session);

// Redis
const redis = require('./config/redis');
const redisF = redis.justVariable
const redisClient = redis.client
const sub = redis.sub

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

// Session Middleware
const sessionMiddleware = session({
    store: new RedisStore({ client: redisClient }),
    secret: "keyboard cat",
    saveUninitialized: true,
    resave: true,
});

const auth = (req, res, next) => {
    if (!req.session.user) {
        return responseMessage(res, 403, 'User Session Required')
    }
    next();
};

/** Store session in redis. */
app.use(sessionMiddleware);
io.use((socket, next) => {
  /** @ts-ignore */
  sessionMiddleware(socket.request, socket.request.res || {}, next);
  // sessionMiddleware(socket.request, socket.request.res, next); will not work with websocket-only
  // connections, as 'socket.request.res' will be undefined in that case
});


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

        return responseData(res, 200, {
            'chatters': arrChatters,
            'status': 'OK'
        })
    })
    .catch((error) => {
        console.log('Error Join Chat ', error)
        return responseData(res, 200, {
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
    return responseData(res, 200, {
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

        return responseData(res, 200, { 'status': 'OK' })
    })
    .catch((error) => {
        console.log('Error Send Message ', error)
        return responseData(res, 200, [])
    })
});

// API - Get Messages
app.get('/get_messages', async function(req, res) {
    redisF.chatAppMessages()
    .then((response) => {
        let messageData = []
        messageData = JSON.parse(response);
        return responseData(res, 200, messageData)
    })
    .catch((error) => {
        console.log('Error Get Messages ', error)
        return responseData(res, 200, [])
    })
});

// API - Get Chatters
app.get('/get_chatters', async function(req, res) {
    redisF.chattersData()
    .then((response) => {
        let userData = []
        if(userData) {
            userData = JSON.parse(response);
        }

        return responseData(res, 200, { numberOfChatters: userData.length, member_joined: userData})
    })
    .catch((error) => {
        console.log('Error Get Chatters ', error)
        return responseData(res, 200, { numberOfChatters: 0, member_joined: []})
    })
});

// API - Login
app.post('/login', async function(req, res) {
    const { username, password } = req.body;
    if (username !== "developer" && username !== "developer2") {
        return responseData(res, 403, { "message": "User Not Found", "data": null })
    } else {
        const savedUserId = await redisClient.get(`username:${username}`);
        const data = await redisClient.hgetall(savedUserId)
        if (await bcrypt.compare(password, data.password)) {
            let user = { id: savedUserId.split(":").pop(), username }
            req.session.user = user;

            return responseData(res, 200, user)
        }
    }

    return responseMessage(res, 400, "Invalid username or password" )
});

// API - Login Client
app.post('/login-client', async function(req, res) {
    const { clientEmail } = req.body;
    let user = { email: clientEmail }
    req.session.user = user;
    await redisClient.sadd("company:A:online_clients", user.email);

    /**
     *
     // generate chat ID
     CHT1

     // create room (JSON)
     company:A:room:CHT1

     // insert ke list pending chat (SADD set)
     company:A:dept:general:pending_chats
        // (BE) publish & broadcast emit "company:A:dept:general:pending_chats"

     // diambil oleh agent (SMOVE move to on going set)
     company:A:dept:general:ongoing_chats
     > code:
     (FE) socket.emit "join.room" (masuk ke room yg on going)
     (BE) socket.on "join.room" (join room socket)


     // chat dari client muncul di list on going milik agent (SADD set)
     user:100:rooms
     > SMEMBERS user:100:rooms
     > CHT1
     atau ini
     > company:A:room:CHT1

     // menampilkan chat detail
     > JSON.GET company:A:dept:general:room:CHT1

     // join room/load
     > code:
     (FE) socket.emit "join.room" (masuk ke room yg on going)
     (BE) socket.on "join.room" (join room socket)

     // agent mengirimkan chat
     > code:
     (FE) socket.emit message => messagenya apa & bawa id room/id chat
     (BE) publish & broadcast emit "show.room"
          publish & emit "message" ke room "room id/chat id"

            publish("show.room", msg);
            socket.broadcast.emit(`show.room`, msg);
            await zadd(roomKey, "" + message.date, messageString);
            publish("message", message);
            io.to(roomKey).emit("message", message);
    (FE) listen (socket.on)
        socket.on "show.room"
        socket.on "message"

     // ditransfer (nanti)
     // disolve/history (nanti)

     */

    // create room
    await redisClient.call('JSON.SET', 'company:A:room:CHT1', '.', JSON.stringify({ "from": `${user.email}`, "message": "hello from client" }))
    await redisClient.sadd('company:A:dept:general:pending_chats', 'company:A:room:CHT1')
    await redisClient.set(`client:${user.email}:rooms`, 'company:A:room:CHT1')

    // emit
    mainNamespace.emit('company:A:dept:general:pending_chats', 'company:A:room:CHT1')

    return responseData(res, 200, user)
});

// API - Login Info
app.get('/login-info', auth, async function(req, res) {
    return responseData(res, 200, req.session.user)
});

app.get(`/users/online/:companyName`, auth, async (req, res) => {
    const companyName = 'A'
    const onlineIds = await redisClient.smembers(`company:${companyName}:online_users`);
    const users = {};
    for (let onlineId of onlineIds) {
      const user = await redisClient.hgetall(`user:${onlineId}`);
      users[onlineId] = {
        id: onlineId,
        username: user.username,
        company_name: user.company_name,
        online: true,
      };
    }
    return responseData(res, 200, users)
});

app.get(`/clients/online/:companyName`, auth, async (req, res) => {
    const companyName = 'A'
    const onlineIds = await redisClient.smembers(`company:${companyName}:online_clients`);
    let users = {};
    for (let onlineId in onlineIds) {
        users[onlineId] = onlineIds[onlineId]
    }
    return responseData(res, 200, users)
});

// API - Logout
app.post("/logout", auth, async (req, res) => {
    if (req.session.user !== undefined) {
        const userId = req.session.user.id;
        if(userId) {
            await redisClient.srem("company:A:online_users", userId);
        } else {
            await redisClient.srem("company:A:online_clients", req.session.user.email);
        }
    }
    req.session.destroy(() => {});
    return responseMessage(res, 200, "Logout Success" )
});

// API - Pending Messages
app.get("/:companyName/chats/pending", auth, async (req, res) => {
    const companyName = 'A'
    const userDept = 'general'
    const pendingList = await redisClient.smembers(`company:${companyName}:dept:${userDept}:pending_chats`);
    let pendingChats = {};
    pendingList.forEach((pd, idx) => {
        console.log('pd:', pd, idx)
        pendingChats[idx] = pd
    })

    console.log('pending chats', pendingList, typeof(pendingList))
    return responseData(res, 200, pendingChats)
});

// API - send message example
app.get('/send-message', async (req, res) => {
    mainNamespace.to('company:A:room:CHT1')
    .emit("message", JSON.stringify({'from': 'server', 'message': 'hello, this is testing emit to room'}))
    return responseMessage(res, 200, "Send Example Msg Executed" )
})


// PubSub
app.get('/publisher', (req, res) => {
    const user = {
        id : "123456",
        name : "Davis"
    }

    redisClient.publish("user-notify",JSON.stringify(user))
    return responseMessage(res, 200, "Publish Example Executed" )
})

sub.on("message",(channel, message) => {
    console.log("Received data :"+message);
})
sub.subscribe("user-notify");
app.get('/subscriber',(req,res) => {
    // res.send("Subscriber One");
    return responseMessage(res, 200, "Subscriber One" )
})

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
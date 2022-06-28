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

const { getCurrentDateTime } = require("./utils/helpers");
const { createUserAuth } = require("./services/user-service")

const {
    generateChatId,
    getMessagesByChatId
} = require("./services/main-chat-service")

const session = require("express-session");
let RedisStore = require("connect-redis")(session);

// Redis
const redis = require('./config/redis');
const redisF = redis.mainAction
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

const publish = (type, data) => {
    const outgoing = {
        // serverId: SERVER_ID,
        type,
        data,
    };
    redisClient.publish("MESSAGES", JSON.stringify(outgoing));
};

const initPubSub = () => {
    console.log('initPubSub')
    /** We don't use channels here, since the contained message contains all the necessary data. */
    sub.on("message", (_, message) => {
        console.log('sub message', message)
        /**
         * @type {{
         *   type: string;
         *   data: object;
         * }}
         **/
        const { type, data } = JSON.parse(message);
        /** We don't handle the pub/sub messages if the server is the same */
        // if (serverId === SERVER_ID) {
        //   return;
        // }
        console.log('tipe', type, data)
        mainNamespace.emit(type, data);
    });
    sub.subscribe("MESSAGES");
};
initPubSub()

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
    const data = req.body
    const savedData = await createUserAuth(data)
    let user = {
        id: savedData.agent_id,
        email: savedData.email_agent,
        name: savedData.name_agent,
        company_name: savedData.company_name,
        department_name: savedData.department_name
    }
    req.session.user = user;

    return responseMessage(res, 200, "OK" )
});

// API - Login Client
app.post('/login-client', async function(req, res) {
    let datetime = getCurrentDateTime()
    let user = req.body
    let chatContent = {
        created_at: datetime,
        updated_at: datetime,
        formatted_date: datetime
    };

    req.session.user = user;
    await redisClient.sadd(`company:${user.company_name}:online_clients`, user.email);

    let chatId = generateChatId() // generate chatId
    let chatRoom = `company:${user.company_name}:room:${chatId}`
    // let chatRoomMembersKey = chatRoom+':members'
    let pendingDepartmentRoom = `company:${user.company_name}:dept:${user.department_name}:pending_chat_room`
    chatContent = {...chatContent, ...{
        from: user.email,
        user_name: user.name,
        message: user.message,
        department_name: user.department_name,
        topic_name: user.topic_name
    }}

    let arrChatContent = [chatContent]

    // create room
    await redisClient.call('JSON.SET', chatRoom, '.', JSON.stringify(arrChatContent))
    await redisClient.zadd(`company:${user.company_name}:dept:${user.department_name}:pending_chats`, getCurrentDateTime('unix'), chatRoom)
    await redisClient.set(`client:${user.email}:rooms`, chatRoom)
    // await redisClient.sadd(chatRoomMembersKey, idUser atau Email)

    // emit to room: pending chat per department
    let pendingMsg = {
        chat_id: chatId,
        room: chatRoom,
        chat_reply: [
            chatContent
        ]
    }
    mainNamespace.to(pendingDepartmentRoom).emit('chat.pending', pendingMsg)

    return responseData(res, 200, user)
});

// API - Login Info
app.get('/login-info', auth, async function(req, res) {
    return responseData(res, 200, req.session.user)
});

// app.get(`/users/online/:companyName`, auth, async (req, res) => {
app.get(`/users/online/:companyName`, async (req, res) => {
    const companyName = req.params.companyName
    const onlineIds = await redisClient.smembers(`company:${companyName}:online_users`);
    const users = {};
    for (let onlineId of onlineIds) {
      const user = await redisClient.hgetall(`user:${onlineId}`);
      users[onlineId] = {
        // id: onlineId,
        // username: user.username,
        // company_name: user.company_name,
        // online: true,
        phone_agent: user.phone_agent,
        email_agent: user.email_agent,
        module: user.module,
        agent_id: user.agent_id,
        type_user: user.type_user,
        department_name: user.department_name,
        // token: user.token,
        last_action: user.last_action,
        status: user.status,
        name_agent: user.name_agent,
        permission_name: user.permission_name,
        id_company: user.id_company,
        uuid: user.uuid,
        id_department: user.id_department,
        avatar: user.avatar,
        company_name: user.company_name,
        roles_id: user.roles_id,
        online: true,
      };
    }
    return responseData(res, 200, users)
});

app.get(`/clients/online/:companyName`, auth, async (req, res) => {
    const companyName = req.params.companyName
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
    const currentClient = req.session.user
    if(currentClient) {
        mainNamespace
            .to(`company:gina-company:dept:developer:pending_chat_room`)
            .emit("chat.pending", JSON.stringify({
                roomId: `company:A:room:chatId-dummy`,
                chatId: 'chatId-dummy',
                from: `${currentClient.email}`,
                message: "There is Pending Msg"
            }))
        return responseData(res, 200, currentClient )
    } else {
        return responseMessage(res, 403, "Client is not logged in" )
    }
})

/** Fetch messages from a selected room */
app.get("/chat-details/:id", auth, async (req, res) => {
    try {
        const chatID = req.params.id
        const messages = await getMessagesByChatId(chatID);

        // emit show.room chatId

        return responseData(res, 200, messages )
    } catch (err) {
        return responseMessage(res, 403, 'Error fetch messages' + err )
    }
});



// Subscribe
sub.on("message",(channel, message) => {
    console.log("Received data :"+message);
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
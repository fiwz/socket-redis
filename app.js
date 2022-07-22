const express = require('express');
const app = express();
require('dotenv').config(); // env
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http').Server(app);
const PORT = process.env.PORT || 4000;
const fs = require('fs');
const bcrypt = require('bcrypt');
const cors = require('cors');
const session = require('express-session');
let RedisStore = require('connect-redis')(session);

// CORS
let corsOptions = {
  methods: ['GET', 'POST'],
  credentials: true,
  origin: [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:4000',
    'http://localhost:8081',
    'ws://localhost:3000',
    'ws://localhost:4000',
  ], // works in subdomain of example2.com like testing.example2.com
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

let corsMiddleware = (origin, callback) => {
  callback('', corsOptions);
};

app.use(cors(corsMiddleware));
const io = require('socket.io')(http, {
  cors: corsMiddleware,
  allowEIO3: true, // false by default
});

// Redis
const redis = require('./config/redis');
const redisF = redis.mainAction;
const redisClient = redis.client;
const sub = redis.sub;

// Express Middleware for serving static
// files and parsing the request body
app.use(express.static('public'));

// Set body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
const { responseData, responseMessage } = require('./utils/response-handler');

// Router/routes
const mainRouter = require('./routes/index-router');
// Set Routing
// app.use('/main-page', mainRouter)

const {
  getCurrentDateTime,
  generateChatId
} = require('./utils/helpers');
const {
  createUserAuth,
  getCompanyOnlineUsers,
} = require('./services/user-service');
const {
  getClientDetailByChatId,
  getMessagesByChatId,
  getPendingListByRoomKey,
  initAllChatService,
} = require('./services/main-chat-service');

// Session Middleware
const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }),
  secret: 'keyboard cat',
  saveUninitialized: true,
  resave: true,
});

const auth = (req, res, next) => {
  if (!req.session.user) {
    return responseMessage(res, 403, 'User Session Required', false);
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
const server = http.listen(PORT, () =>
  console.log(`Server running at port: ${PORT}`)
);
console.info('Current Env: ', process.env.APP_ENV);

const publish = (type, data) => {
  const outgoing = {
    // serverId: SERVER_ID,
    type,
    data,
  };
  redisClient.publish('MESSAGES', JSON.stringify(outgoing));
};

const initPubSub = () => {
  console.log('initPubSub');
  /** We don't use channels here, since the contained message contains all the necessary data. */
  sub.on('message', (_, message) => {
    console.log('sub message', message);
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
    console.log('tipe', type, data);
    mainNamespace.emit(type, data);
  });
  sub.subscribe('MESSAGES');
};
initPubSub();

// const {
//   initWhatsappService
// } = require('./services/whatsapp-service')

/**
 * UI
 */
// app.get('/ui', function (req, res) {
//   res.sendFile(path.join(__dirname + '/views/index.html'));
//   //__dirname : It will resolve to your project folder.
// });

/**
 *  API
 */

// API - Login
app.post('/login', async function (req, res) {
  const data = req.body;
  const savedData = await createUserAuth(data); // Save all data to redis
  // Save some data to session
  let user = {
    id: savedData.agent_id,
    avatar: savedData.avatar,
    company_name: savedData.company_name,
    department_name: savedData.department_name,
    email: savedData.email_agent,
    name: savedData.name_agent,
    phone: savedData.phone_agent,
    roles_id: savedData.roles_id,
    token: savedData.token,
    uuid: savedData.uuid,
  };
  req.session.user = user;

  req.session.save(function (err) {
    req.session.reload(function (err) {
      if (err) {
        console.log('error reload', err);
        return socket.disconnect();
      }
    });
  });

  return responseMessage(res, 200, 'OK');
});

// API - Login Client
app.post('/login-client', async function (req, res) {
  let datetime = getCurrentDateTime();
  let user = req.body;
  let chatContent = {
    created_at: datetime,
    updated_at: datetime,
    formatted_date: datetime,
  };

  req.session.user = user;
  await redisClient.sadd(
    `company:${user.company_name}:online_clients`,
    user.email
  );

  let chatId = generateChatId(); // generate chatId
  let chatRoom = `company:${user.company_name}:room:${chatId}`;
  let chatRoomMembersKey = chatRoom + ':members';
  let pendingDepartmentRoom = `company:${user.company_name}:dept:${user.department_name}:pending_chat_room`;
  chatContent = {
    ...chatContent,
    ...{
      from: user.email,
      user_name: user.name,
      message: user.message,
      company_name: user.company_name,
      department_name: user.department_name,
      topic_name: user.topic_name,

      // add channel name (soon to be dynamic)
      id_channel: 1,
      channel_name: 'Livechat',

      // add status (soon to be dynamic)
      // set status to pending
      status: 0
    },
  };

  let arrChatContent = [chatContent];

  // create room
  let pendingRoomKey = `company:${user.company_name}:dept:${user.department_name}:pending_chats`;
  await redisClient.call('JSON.SET', chatRoom, '.', JSON.stringify(arrChatContent)
  );
  await redisClient.zadd(pendingRoomKey, getCurrentDateTime('unix'), chatRoom);
  await redisClient.set(`client:${user.email}:rooms`, chatRoom);
  await redisClient.zadd(
    chatRoomMembersKey,
    getCurrentDateTime('unix'),
    user.email
  );

  // emit to room: pending chat per department
  const pendingList = await getPendingListByRoomKey(pendingRoomKey);
  mainNamespace.to(pendingDepartmentRoom).emit('chat.pending', pendingList);

  return responseData(res, 200, user);
});

// API - Login Info
app.get('/login-info', auth, async function (req, res) {
  return responseData(res, 200, req.session.user);
});

// app.get(`/users/online/:companyName`, auth, async (req, res) => {
app.get(`/users/online/:companyName`, async (req, res) => {
  const users = await getCompanyOnlineUsers(mainNamespace, null, req);
  mainNamespace.emit('usersOnline', users);

  return responseData(res, 200, users);
});

app.get(`/clients/online/:companyName`, auth, async (req, res) => {
  const companyName = req.params.companyName;
  const onlineIds = await redisClient.smembers(
    `company:${companyName}:online_clients`
  );
  let users = {};
  for (let onlineId in onlineIds) {
    users[onlineId] = onlineIds[onlineId];
  }
  return responseData(res, 200, users);
});

// API - Logout
app.post('/logout', auth, async (req, res) => {
  if (req.session.user !== undefined) {
    const userId = req.session.user.id;
    if (userId) {
      await redisClient.srem('company:A:online_users', userId);
    } else {
      await redisClient.srem(
        'company:A:online_clients',
        req.session.user.email
      );
    }
  }
  req.session.destroy(() => {});
  return responseMessage(res, 200, 'Logout Success');
});

/** Fetch messages from a selected room */
app.get('/chat-details/:id', auth, async (req, res) => {
  try {
    const chatID = req.params.id
    const messages = await getMessagesByChatId(chatID, req)

    if(!messages.room)
      return responseMessage(res, 404, 'Error fetch messages. Data is not found', false);

      return responseData(res, 200, messages);
  } catch (err) {
    return responseMessage(res, 404, 'Error fetch messages' + err, false);
  }
});

/** Fetch client info from a selected room */
app.get('/client-details/:id', auth, async (req, res) => {
  try {
    const chatID = req.params.id;
    const clientDetail = await getClientDetailByChatId(chatID);

    if(!clientDetail)
      return responseMessage(res, 404, 'Error get client detail. Data is not found', false);

      return responseData(res, 200, clientDetail);
  } catch (err) {
    return responseMessage(res, 404, 'Error get client detail' + err, false);
  }
});

// Subscribe
sub.on('message', (channel, message) => {
  console.log('Received data :' + message);
});

/**
 * Socket
 */
// Define Namespace
const mainNamespace = io;

// Register Handlers
const registerMainHandlers = require('./handler/mainHandler');

const onConnection = (socket) => {
  registerMainHandlers(mainNamespace, socket);
};

// Socket Connection
// initWhatsappService(mainNamespace)
initAllChatService(mainNamespace)
mainNamespace.on('connection', onConnection);

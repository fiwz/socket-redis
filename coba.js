const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http').Server(app);
const PORT = 4001;
require('dotenv').config(); // env
const fs = require('fs');
const bcrypt = require('bcrypt');
const cors = require('cors');


// const session = require('express-session')({
//     store: new RedisStore({ client: redisClient }),
//     secret: "my-secret",
//     resave: true,
//     saveUninitialized: true
// });
// let RedisStore = require('connect-redis')(session);


const session = require('express-session');
let RedisStore = require('connect-redis')(session);


const io = require('socket.io')(http, {
    cors: {
        // origin: origins_arr,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    allowEIO3: true, // false by default
});

// CORS
var corsOptions = {
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    methods: ['GET', 'POST'],
    credentials: true,
};
app.use(cors(corsOptions));

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

// Session Middleware
// const sessionMiddleware = session({
    // store: new RedisStore({ client: redisClient }),
//     secret: 'keyboard cat',
//     saveUninitialized: true,
//     resave: true,
// });

// const auth = (req, res, next) => {
//   if (!req.session.user) {
//     return responseMessage(res, 403, 'User Session Required');
//   }
//   next();
// };

const cookie    = require('cookie')
const signature = require('cookie-signature')
const cookieParser = require('cookie-parser');
var sharedsession = require("express-socket.io-session");

const sessionMiddleware = session({
    store: new RedisStore({ client: redisClient }),
    name: 'fortunecookie',
    key: 'userID',
    secret: 'keyboard cat',
    saveUninitialized: false,
    resave: false,
});

app.use(sessionMiddleware);
io.use(sharedsession(sessionMiddleware, {
    // autoSave:true
}));


/** Store session in redis. */
// app.use(sessionMiddleware);
// io.use((socket, next) => {
//   /** @ts-ignore */
//   sessionMiddleware(socket.request, socket.request.res || {}, next);
//   // sessionMiddleware(socket.request, socket.request.res, next); will not work with websocket-only
//   // connections, as 'socket.request.res' will be undefined in that case
// });

// Create Server
const server = http.listen(PORT, () =>
  console.log(`Server running at port: ${PORT}`)
);


app.post('/login', (req, res) => {
    req.session.user = {'name': 'Afiani'};
    res.send('ok')
});



// Socket Connection
io.on('connection', async (socket) => {
    console.log('socket is connected')

    console.log('==========', 'user socket id: ', socket.id)
    console.log('==========', 'user session', socket.request.session)
    console.log('==========', 'user session ID', socket.request.sessionID)
    console.log('===============', 'via handshake', socket.handshake)
    // console.log('session from redis', socket.handshake.sessionID, '=====>>>>>>', await redisClient.get(`sess:${socket.handshake.sessionID}`) )

    socket.on("login", function(userdata) {
        console.log('***************************', 'masuk')
        socket.handshake.session.userdata = userdata;
        socket.handshake.session.save();
        console.log('###############', socket.handshake.session)
    });
});

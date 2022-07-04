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
const session = require('express-session');
let RedisStore = require('connect-redis')(session);

// CORS
let corsOptions = {
    methods: ['GET', 'POST'],
    credentials: true,
    origin: ["http://localhost:8080", /\.example2\.com$/, /localhost$/], // works in subdomain of example2.com like testing.example2.com
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

let corsMiddleware = (origin, callback) => {
    callback("", corsOptions)
}

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

// Session Middleware
const sessionMiddleware = session({
    store: new RedisStore({ client: redisClient }),
    secret: 'keyboard cat',
    saveUninitialized: true,
    resave: true,
});

const auth = (req, res, next) => {
  if (!req.session.user) {
    return responseMessage(res, 403, 'User Session Required');
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

// API Login
app.get('/login', (req, res) => {
    req.session.user = {'name': req.query.name};
    res.send('ok')
});

/**
 * Frontend
 *
 * Usage in html/js:
    const socket2 = io('http://localhost:4001', {
        withCredentials: true,
    });
    socket2.connect()

    const response = fetch('http://localhost:4001/login?name=Bobi',
    {
        method: "POST",
        headers: { 'Content-Type': 'application/json' }, // do not pass this when using GET method
        body: JSON.stringify(data_login_post), // do not pass this when using GET method
        credentials: 'include'
    }
    ).then((response) => {
        console.log('response login client', response)
    });
 *
 */

// Socket Connection
io.on('connection', async (socket) => {
    console.log('socket is connected')

    console.log('==========', 'user socket id: ', socket.id)
    console.log('==========', 'user session', socket.request.session)
    console.log('==========', 'user session ID', socket.request.sessionID)
    // console.log('===============', 'via handshake', socket.handshake)
    // console.log('session from redis', socket.handshake.sessionID, '=====>>>>>>', await redisClient.get(`sess:${socket.handshake.sessionID}`) )

    socket.on("login", function(userdata) {
        console.log('***************************', 'masuk')
        socket.handshake.session.userdata = userdata;
        socket.handshake.session.save();
        console.log('###############', socket.handshake.session)
    });
});

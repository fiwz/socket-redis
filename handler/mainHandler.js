// Redis
const redis = require('../config/redis');
const redisF = redis.mainAction
const redisClient = redis.client
const sub = redis.sub

const _ = require("lodash")

const {
    getCurrentDateTime
} = require("../utils/helpers");

const {
    sendMessage,
    endChat,
    getAllChatList
} = require("../services/main-chat-service");

const {
    initAllConnectedUsers,
    userInsertAndJoinRoom,
    clientGetAndJoinRoom,
    getCompanyOnlineUsers,
    userGetAndJoinRoom
} = require("../services/user-service")


module.exports = async (io, socket) => {
    // console.log('==========', 'user socket id: ', socket.id)
    console.log('==========', 'user session', socket.request.session)
    console.log('==========', 'user session ID', socket.request.sessionID)
    // console.log('===============', 'via handshake', socket.handshake)
    // console.log('session from redis', socket.handshake.sessionID, '=====>>>>>>', await redisClient.get(`sess:${socket.handshake.sessionID}`) )

    socket.on('reload', async (req=null) => {
        // Reload session to get updated client session
        socket.request.session.reload((err) => {
            if (err) {
              return socket.disconnect();
            }
            console.log('***************', 'reload socket', socket.request.session)
            userGetAndJoinRoom(socket)
        });

    })

    await initAllConnectedUsers(io, socket)

    /**
     * User (Agent) Login
     *
     * Refresh/reload socket session on login
     */
    socket.on('user.login', async(request) => {
        // sessionMiddleware(socket.request, {}, async function(){
        //     // console.log('*********', 'session ID', socket.request.sessionID)
        //     socket.request.session.user = "{'name': 'fia'}"
        //     socket.request.session.save()
        //     console.log('session from redis', await redisClient.get(`sess:${socket.request.sessionID}`) )
        // })

        // socket.handshake.session.userdata = request
        // socket.handshake.session.save();
        // console.log('###############', socket.handshake)

        await socket.request.session.reload((err) => {
            if (err) {
              return socket.disconnect();
            }
            console.log('***************', 'LOGIN: reload socket', socket.request.session)
            userGetAndJoinRoom(socket)
        });
    })

    /**
     * Agent Join Room
     */
    socket.on("room.join", async (id) => {
        const joinedRoom = await userInsertAndJoinRoom(socket, id)
        io.to(socket.id).emit('chat.ongoing', joinedRoom) // Emit to agent's on going list
    });

    /**
     * New Chat
     *
     * - Insert to pending list
     * - Join client to chat room
     */
    socket.on('chat.new', async (req=null) => {
        // Reload session to get updated client session
        socket.request.session.reload((err) => {
            if (err) {
              return socket.disconnect();
            }
            clientGetAndJoinRoom(socket)
        });
    })

    /**
     * Handle incoming message to socket
     * - Handle incoming message both from agent and client
     */
    socket.on('message', async (data=null) => {
        await sendMessage(io, socket, data)
    })

    /**
     * Close chat/resolve a chat/end a chat
     */
    socket.on('chat.end', async(data) => {
        const result = await endChat(io, socket, data)
        // console.log('result', result)
    })

    /**
     * Client request to fetch all data
     */
    socket.on('allData', async() => {
        if (socket.request.session.user !== undefined) {
            const myChatList = await getAllChatList(socket)
            const companyOnlineUsers = await getCompanyOnlineUsers(socket)

            let result = myChatList
            result.online_users = companyOnlineUsers

            socket.emit('chat.onrefresh', result)
        }
    })

    socket.on("disconnect", async () => {
        // leave room based on user
        // code...

        console.log('disconnect sesss', socket.request.session.user)

        if (socket.request.session.user !== undefined) {
            const user = socket.request.session.user;
            if(user.id) {
                // Leave Company Room
                await redisClient.zrem(`company:${user.company_name}:online_users`, user.id); // remove from redis
                let companyOnlineUserRoom = `company:${user.company_name}:online_user_room`
                io.in(socket.id).socketsLeave(companyOnlineUserRoom); // leave socket

                // Emit to FE
                // Get Latest Online Users
                const companyOnlineUsers = await getCompanyOnlineUsers(socket)
                io.to(companyOnlineUserRoom).emit('users.offline', companyOnlineUsers)

                console.log('user is offline: ', user.id)
            } else {
                await redisClient.srem(`company:${socket.request.session.user.company_name}:online_clients`, socket.request.session.user.email);
                console.log('client is offline: ', socket.request.session.user.email)
            }
        }
    });
}
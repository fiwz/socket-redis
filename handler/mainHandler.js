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
    clientGetAndJoinRoom
} = require("../services/user-service")

module.exports = async (io, socket) => {

    await initAllConnectedUsers(io, socket)

    // // Fire 'send' event for updating Message list in UI
    // socket.on('message', function(data) {
    //     console.log('socket message in server', data)
    //     io.emit('send', data);
    // });

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
    })

    /**
     * Client request to fetch all data
     */
    socket.on('allData', async() => {
        if (socket.request.session.user !== undefined) {
            const myChatList = await getAllChatList(socket)
            socket.emit('chat.onrefresh', myChatList)
        }
    })

    socket.on("disconnect", async () => {
        // leave room based on user
        // code...

        if (socket.request.session.user !== undefined) {
            const userId = socket.request.session.user.id;
            if(userId) {
                await redisClient.srem(`company:${socket.request.session.user.company_name}:online_users`, userId);
                console.log('user is offline: ', userId)
            } else {
                await redisClient.srem("company:A:online_clients", socket.request.session.user.email);
                console.log('client is offline: ', socket.request.session.user.email)
            }
        }
    });
}
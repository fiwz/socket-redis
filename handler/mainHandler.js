// Redis
const redis = require('../config/redis');
const redisF = redis.mainAction
const redisClient = redis.client
const sub = redis.sub

const _ = require("lodash")

const {
    getCurrentDateTime
} = require("../utils/helpers");

// const { getAllChatList } = require("../services/main-chat-service");

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

    socket.on('message', async (data=null) => {
        // console.log('===============', 'listen dari klik btn send', data)
        // console.log('===============', 'socketnya', socket.request.session)

        let sender = socket.request.session.user
        let chatId = data.chatId
        let roomId = ''

        // check if keys exists
        let existingKeys = await redisClient.keys(`*room:${chatId}`)
        if(existingKeys.length < 0) {
            console.error('userJoinRoom: empty keys')
            return {
                data: roomId,
                message: 'Failed join into chat room'
            }
        }
        roomId = existingKeys[0] // return the first keys

        let datetime = getCurrentDateTime()

        data.from = sender.id ? sender.id : sender.email
        data.formatted_date = datetime

        io.to(roomId).emit('message', data)
    })

    socket.on("disconnect", async () => {
        // leave room based on user
        // code...

        if (socket.request.session.user !== undefined) {
            const userId = socket.request.session.user.id;
            if(userId) {
                await redisClient.srem("company:A:online_users", userId);
                console.log('user is offline: ', userId)
            } else {
                await redisClient.srem("company:A:online_clients", socket.request.session.user.email);
                console.log('client is offline: ', socket.request.session.user.email)
            }
        }
    });
}
// Redis
const redis = require('../config/redis');
const redisF = redis.justVariable
const redisClient = redis.client
const sub = redis.sub

const _ = require("lodash")
const {
    getAllChatList,
    clientJoinRoom,
    getClientChatList,
    userJoinRoom
} = require("../utils/helpers");

module.exports = async (io, socket) => {
    // Detect online users & clients, join room based on user
    if (socket.request.session.user !== undefined) {
        const user = socket.request.session.user
        if(user.id) {
            // insert to online users
            // await redisClient.sadd("company:A:online_users", user.id);
            await redisClient.sadd(`company:${user.company_name}:online_users`, user.id);
            console.log(`User is connected: ${user.id}`)

            // join chat room
            const userRooms = await redisClient.smembers(`username:${user.username}:rooms`) // nanti ganti jadi user:IDNYA:rooms
            console.log('userRooms ', userRooms, typeof(userRooms))
            for(let item of userRooms) {
                socket.join(item)
                console.log('user joined: ', item)
            }

            // join room: pending chat per department
            socket.join(`company:${user.company_name}:dept:${user.department_name}:pending_chat_room`)
            console.log('existing room:', socket.rooms)

            // on refresh
            // get pending chat
            // get on going chat
            // get bubble chat per chat ID
            // emit dataOnRefresh
            const myChatList = await getAllChatList(socket)
            socket.emit('chat.onrefresh', myChatList)
        } else {
            // join room
            clientJoinRoom(socket)

            // on refresh
            // get bubble chat
            const clientChatList = await getClientChatList(socket)
            socket.emit('client.chat.onrefresh', clientChatList)
        }
    }

    // Fire 'send' event for updating Message list in UI
    socket.on('message', function(data) {
        console.log('socket message in server', data)
        io.emit('send', data);
    });

    socket.on("room.join", async (id) => {
        userJoinRoom(socket, id)
    });

    // Client Join Room
    socket.on('chat.new', async (req=null) => {
        // reload session to get updated client session
        socket.request.session.reload((err) => {
            if (err) {
              return socket.disconnect();
            }

            // join room
            clientJoinRoom(socket)

            // emit there is pending chat to department
            io.emit('chat.pending', 'hey there is new pending chat!')
        });
    })

    socket.on("reconnect", (attempt) => {
        console.log('Reconnect success ', attempt) // but not working
    });

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
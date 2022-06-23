// Redis
const redis = require('../config/redis');
const redisF = redis.justVariable
const redisClient = redis.client
const sub = redis.sub

const _ = require("lodash")
const {
    getAllChatList
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
            console.log('my chat list:', await getAllChatList(socket))
        } else {
            await redisClient.sadd("company:A:online_clients", socket.request.session.user.email);
            console.log(`Client is connected: ${socket.request.session.user.email}`)

            // rejoin room
            let clientRoomKey = `client:${socket.request.session.user.email}:rooms`
            let clientRoomVal = await redisClient.get(clientRoomKey)
            socket.join(clientRoomVal)
            console.log('client joined: ', clientRoomVal)

            // on refresh
            // get bubble chat
        }
    }

    // Fire 'send' event for updating Message list in UI
    socket.on('message', function(data) {
        console.log('socket message in server', data)
        io.emit('send', data);
    });

    socket.on("room.join", async (id) => {
        if (socket.request.session.user !== undefined) {
            const userId = socket.request.session.user.id;
            const username = socket.request.session.user.username;
            if(userId) {
                await redisClient.sadd(`username:${username}:rooms`, `company:A:room:${id}`);
                console.log('someone join room', id)
                socket.join(`company:A:room:${id}`);
            }
        }
    });

    socket.on('new_chat', (req) => {
        // proses save db dll

        // socket.join
        // io.emit
    })

    socket.on("reconnect", (attempt) => {
        console.log('Reconnect success ', attempt) // but not working
    });

    socket.on("disconnect", async () => {
        // leave room based on user
        // code...

        console.log('someone disconnected')
        console.log('room dc:', socket.rooms)
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
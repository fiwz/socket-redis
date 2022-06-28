// Redis
const redis = require('../config/redis');
const redisF = redis.mainAction
const redisClient = redis.client
const sub = redis.sub

const {
    getAllChatList,
    getClientChatList
} = require("../services/main-chat-service");


const { getCurrentDateTime } = require("../utils/helpers");

/**
 * User Session
 * (Agent Session)
 *
 * Only for agent
 * Save session and user data
 * @param {*} data
 * @returns
 */
const createUserAuth = async (data) => {
    let arrData = []
    let newData = []
    Object.keys(data).forEach((item, idx) => {
        if(['company_name', 'department_name'].includes(item)) {
            arrData.push(item, slugify(data[item]))
            newData[item] = slugify(data[item])
        } else {
            arrData.push(item, data[item])
            newData[item] = data[item]
        }
    })

    // Save data user to redis
    let userDataKey = `user:${data.agent_id}`
    await redisClient.hmset(userDataKey, arrData)

    // Insert user to company department
    let companySlug = slugify(data.company_name)
    let departmentSlug = slugify(data.department_name)
    let usersInDepartmentKey = `company:${companySlug}:dept:${departmentSlug}:users`
    await redisClient.sadd(usersInDepartmentKey, data.agent_id)

    return newData
}

/**
 * Init user on connected
 *
 * - Detect online users(agent) & clients
 * - Join room based on user roles
 * @param {*} io
 * @param {*} socket
 */
const initAllConnectedUsers = async(io, socket) => {
    if (socket.request.session.user !== undefined) {
        const user = socket.request.session.user

        // If agent
        if(user.id) {
            // Add to online user list
            let companyOnlineUsersKey = `company:${user.company_name}:online_users`
            await redisClient.sadd(companyOnlineUsersKey, user.id);
            // console.log(`User is connected: ${user.id}`)

            userGetAndJoinRoom(socket)

            const myChatList = await getAllChatList(socket)
            socket.emit('chat.onrefresh', myChatList)
        } else { // If client
            clientGetAndJoinRoom(socket)

            const clientChatList = await getClientChatList(socket)
            socket.emit('client.chat.onrefresh', clientChatList)
        }
    }
}

/**
 * Client Get And Join Room
 *
 * Get client room and join client to existing room
 */
const clientGetAndJoinRoom = async (socket) => {
    let clientRoomKey = `client:${socket.request.session.user.email}:rooms`
    let clientRoomId = await redisClient.get(clientRoomKey)
    socket.join(clientRoomId)

    // insert room yg diklik ke list room milik agent
    // add user to room:QBFCL1656301812:members (optional)
    // code...

    return `Client has joined: ${clientRoomId}`
}

/**
 * User Get And Join Room
 *
 * Only for agent
 * Get user room and join client to existing room
 */
 const userGetAndJoinRoom = async (socket) => {
    const user = socket.request.session.user

    // Join On Going Chat Room
    const userRooms = await redisClient.zrange(`user:${user.id}:rooms`, 0, -1)
    for(let item of userRooms) {
        socket.join(item)
        console.log('User joined: ', item)
    }

    // Join Department Room
    // Agent will get notified if there is new pending chat
    let pendingDepartmentRoom = `company:${user.company_name}:dept:${user.department_name}:pending_chat_room`
    socket.join(pendingDepartmentRoom)
    // console.log('existing room:', socket.rooms)
}

const userInsertAndJoinRoom = async(socket, id) => {
    if (socket.request.session.user === undefined) {
        return {
            data: roomId,
            message: 'Failed join into chat room. Please login to continue'
        }
    }

    const user = socket.request.session.user
    const chatId = id
    let roomId = ''
    let chatRoomMembersKey = ''
    let chatResult = {
        chat_id: chatId,
        room: roomId,
        chat_reply: []
    }

    // check if keys exists
    let existingKeys = await redisClient.keys(`*room:${chatId}`)
    if(existingKeys.length < 0) {
        console.error('userJoinRoom: empty keys')
        return {
            data: roomId,
            message: 'Failed join into chat room'
        }
    }

    // insert agent to room
    roomId = existingKeys[0] // return the first keys
    chatResult.room = roomId
    chatRoomMembersKey = roomId+':members'
    socket.join(roomId);
    console.log('someone join room', roomId)
    console.log('existing room:', socket.rooms)

    // insert room to user's list rooms
    let userRoomsKey = `user:${user.id}:rooms`
    await redisClient.zadd(userRoomsKey, getCurrentDateTime('unix'), roomId)

    // add user to room:QBFCL1656301812:members (optional)
    // await redisClient.sadd(chatRoomMembersKey, idAgent)

    // get message bubbles
    let bubbles = await redisClient.call('JSON.GET', roomId)
    bubbles = JSON.parse(bubbles)
    chatResult.chat_reply = bubbles

    let currentDepartmentName = bubbles[0].department_name
    let currentCompanyName = user.company_name
    let pendingChatInDepartment = `company:${currentCompanyName}:dept:${currentDepartmentName}:pending_chats`

    // check if room is in pending list by department
    let isExistsInPending = await redisClient.zrank(pendingChatInDepartment, roomId)
    if(isExistsInPending || isExistsInPending == 0) {
        let removeKeyInPending = await redisClient.zrem(pendingChatInDepartment, roomId)
        if(removeKeyInPending) {
            console.log(`success remove ${roomId} from ${pendingChatInDepartment}`)
        } else {
            console.error(`error remove ${roomId} from ${pendingChatInDepartment}`)
        }
    }

    return {
        data: chatResult,
        message: 'Successfully join into chat room!'
    }
}


module.exports = {
    createUserAuth,
    initAllConnectedUsers,
    userInsertAndJoinRoom,
    clientGetAndJoinRoom
}
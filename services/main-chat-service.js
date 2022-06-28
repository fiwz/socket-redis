// Redis
const redis = require('../config/redis');
const redisF = redis.justVariable
const redisClient = redis.client
const sub = redis.sub

const moment = require('moment');

const { getCurrentDateTime } = require("../utils/helpers");

/**
 * Generate Chat ID
 *
 * Chat ID length is 15 characters
 * @param {*} length
 * @returns
 */
const generateChatId = (length=4) => {
    let result           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() *
        charactersLength));
    }
    const currentUnix =  moment().unix()

    return `Q${result+currentUnix}`
}


const getPendingListByUser = async(socket) => {
    const user = socket.request.session.user
    let pendingList = []
    let pendingListWithBubble = []
    let listPendingChatKey = `company:${user.company_name}:dept:${user.department_name}:pending_chats`

    pendingList = await redisClient.zrange(listPendingChatKey, 0, -1);
    if(pendingList) {
        for(let [idx, item] of pendingList.entries()) {
            let bubbleExist = await redisClient.exists(item)
            pendingListWithBubble[idx] = {
                chat_id: item.split(':').pop(),
                room: item,
                chat_reply: []
            }

            if(bubbleExist) {
                let bubbles = await redisClient.call('JSON.GET', item)
                pendingListWithBubble[idx].chat_reply = JSON.parse(bubbles)
            }
        }
    }

    return pendingListWithBubble
}

const getOngoingListByUser = async(socket) => {
    const user = socket.request.session.user
    let ongoingList = []
    let ongoingListWithBubble = []

    let userRooms = `user:${user.id}:rooms`
    ongoingList = await redisClient.zrange(userRooms, 0, -1);
    if(ongoingList) {
        for(let [idx, item] of ongoingList.entries()) {
            let bubbleExist = await redisClient.exists(item)
            ongoingListWithBubble[idx] = {
                chat_id: item.split(':').pop(),
                room: item,
                chat_reply: []
            }

            if(bubbleExist) {
                let bubbles = await redisClient.call('JSON.GET', item)
                ongoingListWithBubble[idx].chat_reply = JSON.parse(bubbles)
            }
        }
    }

    return ongoingListWithBubble
}

const getAllChatList = async (socket) => {
    let pendingList = await getPendingListByUser(socket)
    let ongoingList = await getOngoingListByUser(socket)

    return {
        pending: pendingList,
        ongoing: ongoingList
    }
}

const getClientChatList = async (socket) => {
    let clientRoomKey = `client:${socket.request.session.user.email}:rooms`
    let clientRoomId = await redisClient.get(clientRoomKey)
    let chatResult = {}

    let bubbleExist = await redisClient.exists(clientRoomKey)
    chatResult = {
        chat_id: clientRoomId.split(':').pop(),
        room: clientRoomId,
        chat_reply: []
    }

    if(bubbleExist) {
        let bubbles = await redisClient.call('JSON.GET', clientRoomId)
        chatResult.chat_reply = JSON.parse(bubbles)
    }

    return chatResult
}

const getMessagesByChatId = async (id) => {
    const chatId = id
    let roomId = ''
    let chatResult = {
        chat_id: chatId,
        room: roomId,
        chat_reply: []
    }

    // check if keys exists
    let existingKeys = await redisClient.keys(`*room:${chatId}`)
    if(existingKeys.length < 0) {
        console.log('empty keys')
        return chatResult
    }

    roomId = existingKeys[0] // return the first keys
    chatResult.room = roomId

    // get message bubbles
    let bubbles = await redisClient.call('JSON.GET', roomId)
    chatResult.chat_reply = JSON.parse(bubbles)

    return chatResult
}

const sendMessage = async(io, socket, data) => {
    let sender = socket.request.session.user
    let chatId = data.chatId
    let roomId = ''

    // Check if keys exists
    let existingKeys = await redisClient.keys(`*room:${chatId}`)
    if(existingKeys.length < 0) {
        console.error('Send Message Error: empty keys')
        return {
            data: data,
            message: 'Failed to send message'
        }
    }

    roomId = existingKeys[0] // return the first keys
    let datetime = getCurrentDateTime()

    let chatContent = {
        created_at: datetime,
        updated_at: datetime,
        formatted_date: datetime,
        from: sender.id ? sender.id : sender.email, // agent get agent id or client
        agent_name: sender.id ? sender.name : "",
        user_name: sender.id ? "" : sender.name,
        message: data.message
    };

    // Save to db
    let saveMsg = await redisClient.call('JSON.ARRAPPEND', roomId, '.', JSON.stringify(chatContent))

    io.to(roomId).emit('show.room', chatContent)
    io.to(roomId).emit('message', chatContent)
}

const endChat = async(io, socket, data) => {
    // cek apakah roomnya ada

    // add ke list company resolve
    // add ke list company department resolve
    // add ke agent resolve

    // hapus dari agent rooms
    // hapus dari client rooms

    // client leave socket roomId
    // agent leave socket roomId
}



module.exports = {
    generateChatId,
    getAllChatList,
    getClientChatList,
    getMessagesByChatId,
    sendMessage,
    endChat
}
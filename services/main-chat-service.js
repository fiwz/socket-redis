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

/**
 * Get pending list and its messages
 * by logged in agent (user)
 *
 * @param {*} socket
 * @returns
 */
const getPendingListByUser = async(socket) => {
    const user = socket.request.session.user
    let listPendingChatRoom = `company:${user.company_name}:dept:${user.department_name}:pending_chats`
    let pendingList = await getMessagesByManyChatRoom(listPendingChatRoom)

    return pendingList
}

/**
 * Get Pending List by Room Key
 * Example: get pending list in department
 *
 * @param {String} roomKey
 * @returns
 */
const getPendingListByRoomKey = async(roomKey) => {
    let listPendingChatRoom = roomKey;
    let pendingList = await getMessagesByManyChatRoom(listPendingChatRoom)

    return pendingList
}

/**
 * Get on going list and its messages
 * by logged in agent (user)
 *
 * @param {*} socket
 * @returns
 */
const getOngoingListByUser = async(socket) => {
    const user = socket.request.session.user
    let userRoomsKey = `user:${user.id}:rooms`
    let userRooms = await getMessagesByManyChatRoom(userRoomsKey)

    return userRooms
}

const getResolveListByUser = async(socket) => {
    const user = socket.request.session.user
    if (socket.request.session.user === undefined) {
        return {
            data: null,
            message: 'Failed to fetch data. Please login to continue'
        }
    }
    let listResolveChatRoom = `user:${user.id}:resolve_chats`
    let resolveList = await getMessagesByManyChatRoom(listResolveChatRoom)

    return resolveList
}

/**
 * Get all type of chat list and its messages
 * by logged in agent (user)
 *
 * @param {*} socket
 * @returns
 */
const getAllChatList = async (socket) => {
    let pendingList = await getPendingListByUser(socket)
    let ongoingList = await getOngoingListByUser(socket)
    let resolveList = await getResolveListByUser(socket)
    let data = {
        pending: pendingList,
        ongoing: ongoingList,
        resolve: resolveList
    }

    return data
}

/**
 * Get chat id and its messages
 * by logged in client
 *
 * @param {*} socket
 * @returns
 */
const getClientChatList = async (socket) => {
    let clientRoomKey = `client:${socket.request.session.user.email}:rooms`
    let clientRoomId = await redisClient.get(clientRoomKey)
    let chatResult = {}

    let bubbleExist = await redisClient.exists(clientRoomKey)
    chatResult = {
        chat_id: clientRoomId ? clientRoomId.split(':').pop() : '',
        room: clientRoomId,
        chat_reply: []
    }

    if(bubbleExist) {
        let bubbles = await redisClient.call('JSON.GET', clientRoomId)
        chatResult.chat_reply = JSON.parse(bubbles)
    }

    return chatResult
}

/**
 * Fetch messages (bubbles/chat replies)
 * from given chat id
 *
 * @param {String} id
 * @returns
 */
const getMessagesByChatId = async (id) => {
    const chatId = id
    let roomId = ''
    let chatResult = {
        chat_id: chatId,
        room: roomId,
        chat_reply: []
    }

    let existingKeys = await redisClient.keys(`*room:${chatId}`)
    if(existingKeys.length <= 0 ) {
        console.log('empty keys')
        return chatResult
    }

    roomId = existingKeys[0] // return the first keys
    chatResult.room = roomId
    let bubbles = await redisClient.call('JSON.GET', roomId)
    chatResult.chat_reply = JSON.parse(bubbles)

    return chatResult
}

/**
 * Fetch messages (bubbles/chat replies)
 * from many chat room
 *
 * @param {String} roomCategory (key that holds list of chat rooms/chat id)
 * @returns Array
 */
 const getMessagesByManyChatRoom = async(roomCategory) => {
    let chatListKey = []
    let chatListWithBubble = []

    chatListKey = await redisClient.zrange(roomCategory, 0, -1);
    if(chatListKey) {
        // get participants
        // code...

        for(let [idx, item] of chatListKey.entries()) {
            let bubbleExist = await redisClient.exists(item)
            chatListWithBubble[idx] = {
                chat_id: item.split(':').pop(),
                room: item,
                chat_reply: [],
                message: "",
                formatted_date: "",
            }

            if(bubbleExist) {
                let bubbles = await redisClient.call('JSON.GET', item)
                let parsedBubbles = JSON.parse(bubbles)

                let latestMessageIndex = (parsedBubbles.length - 1)
                let latestMessage = parsedBubbles[latestMessageIndex]
                chatListWithBubble[idx] = {
                    ...chatListWithBubble[idx],
                    ...{
                        chat_reply: parsedBubbles,
                        message: latestMessage.message,
                        formatted_date: latestMessage.formatted_date,
                        // user/sender detail
                        // agent name
                        // agent email
                        // agent avatar?
                        // user name
                        // user email
                        // user avatar?
                        // code...
                    }
                }
            }

        } // end for
    }

    return chatListWithBubble
}

const sendMessage = async(io, socket, data) => {
    let sender = socket.request.session.user
    let chatId = data.chatId
    let roomId = ''

    let getMessages = await getMessagesByChatId(chatId)
    if(!getMessages.room) {
        console.error('Send Message Error: empty keys. Room not found')
        return {
            data: data,
            message: 'Failed to send message. Room not found.'
        }
    }

    roomId = getMessages.room // return the first keys
    let datetime = getCurrentDateTime()

    // Check if user is already join room
    let socketsInRoom = await io.in(roomId).fetchSockets();
    if(!socketsInRoom) {
        console.error('Send Message Error: empty keys. User is not in chat room.')
        return {
            data: data,
            message: 'Failed to send message. User is not in chat room.'
        }
    }

    let isUserInRoom = false;
    for(let [idx, socketUser] of socketsInRoom.entries()) {
        if( socket.id == socketUser.id ) {
            isUserInRoom = true;
            break;
        }
    }

    if(!isUserInRoom) {
        console.error('Send Message Error: empty keys. User is not in chat room.')
        return {
            data: data,
            message: 'Failed to send message. User is not in chat room.'
        }
    }

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
    let sender = socket.request.session.user
    let chatId = data.chatId
    let roomId = ''

    console.log('End chat for id', chatId)

    // Check if room exists
    let getMessages = await getMessagesByChatId(chatId)
    if(!getMessages.room) {
        console.error('Send Message Error: empty keys. Room not found')
        return {
            data: data,
            message: 'Failed to send message. Room not found.'
        }
    }

    roomId = getMessages.room
    let roomMembersKey = roomId+':members'
    let unixtime = getCurrentDateTime('unix')

    // Add resolve chat (room id) to company's resolve chats list
    let companySlug = roomId.split(':')[1]
    let companyResolveChatRoom = `company:${companySlug}:resolve_chats`
    await redisClient.zadd(companyResolveChatRoom, unixtime, roomId)

    // Add resolve chat (room id) to agents' resolve chats list
    let roomMembers = await redisClient.zrange(roomMembersKey, 0, -1)
    if(roomMembers && roomMembers.length > 1) {
        let agent = roomMembers.slice(1)
        for(let [idx, item] of agent.entries()) {
            let userResolveChatRoom = `user:${item}:resolve_chats`
            await redisClient.zadd(userResolveChatRoom, unixtime, roomId)

            // Delete room id from on going list
            let userRooms = `user:${item}:rooms`
            await redisClient.zrem(userRooms, roomId)
        }
    }

    // Delete room id from client's on going list
    let clientRoom = `client:${roomMembers[0]}:rooms`
    await redisClient.del(clientRoom)

    // Take out (leave) agent and user from room id
    io.in(roomId).socketsLeave(roomId);

    let listResolve = await getResolveListByUser(socket)
    let ongoingList = await getOngoingListByUser(socket)
    let result = {
        resolve: listResolve,
        ongoing: ongoingList,
        message: `End chat for chat id ${chatId}`
    }
    io.emit('chat.resolve', result)

    return result
}

module.exports = {
    endChat,
    generateChatId,
    getAllChatList,
    getClientChatList,
    getMessagesByChatId,
    getOngoingListByUser,
    getPendingListByRoomKey,
    getPendingListByUser,
    sendMessage
}
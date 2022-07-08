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

const getPendingTransferListByUser = async(socket) => {
    // Pending transfer to agent
    const user = socket.request.session.user
    if (socket.request.session.user === undefined) {
        return {
            data: null,
            message: 'Failed to fetch data. Please login to continue'
        }
    }
    let listPendingTransferChatRoom = `user:${user.id}:pending_transfer_chats`
    let pendingTransferList = await getMessagesByManyChatRoom(listPendingTransferChatRoom)

    // Pending transfer to department
    // code...

    return pendingTransferList
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
    let pendingTransferList = await getPendingTransferListByUser(socket)
    let data = {
        ongoing: ongoingList,
        pending: pendingList,
        pendingtransfer: pendingTransferList,
        resolve: resolveList,
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
        // Mapping data for every chat id (room)
        for(let [idx, item] of chatListKey.entries()) {
            let bubbleExist = await redisClient.exists(item)
            chatListWithBubble[idx] = {
                // chat_reply: [],
                agent_email: null,
                agent_id: null,
                agent_name: null,
                agent_uuid: null,
                chat_id: item.split(':').pop(),
                department_name: null,
                formatted_date: null,
                message: null,
                room: item,
                topic_name: null,
                user_avatar: null,
                user_email: null,
                user_name: null,
                user_phone: null,
            }

            if(bubbleExist) {
                let bubbles = await redisClient.call('JSON.GET', item)
                let parsedBubbles = JSON.parse(bubbles)
                let firstMessage = parsedBubbles[0]
                let latestMessageIndex = (parsedBubbles.length - 1)
                let latestMessage = parsedBubbles[latestMessageIndex]

                chatListWithBubble[idx] = {
                    ...chatListWithBubble[idx],
                    ...{
                        // chat_reply: parsedBubbles,
                        formatted_date: latestMessage.formatted_date,
                        message: latestMessage.message,
                        user_email: firstMessage.from,
                        user_name: firstMessage.user_name,
                        user_phone: firstMessage.phone ? firstMessage.phone : null,
                        department_name: firstMessage.department_name,
                        topic_name: firstMessage.topic_name,
                    }
                }
            }

            // Set Agent Key
            let chatRoomMembersKey = `${item}:members`
            let agentsInChatRoom = await redisClient.zrange(chatRoomMembersKey, 1, -1) // start from index 1
            if(agentsInChatRoom) {
                let agentId = agentsInChatRoom.pop()
                let agentDataKey = `user:${agentId}`
                let agentData = await redisClient.hgetall(agentDataKey)
                chatListWithBubble[idx].agent_email = agentData.email_agent ? agentData.email_agent : null
                chatListWithBubble[idx].agent_id = agentData.agent_id ? agentData.agent_id : null
                chatListWithBubble[idx].agent_name = agentData.name_agent ? agentData.name_agent : null
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
    // Check if room exists
    let getMessages = await getMessagesByChatId(chatId)
    if(!getMessages.room) {
        console.error('Send Message Error: empty keys. Room not found')
        return {
            data: data,
            message: 'Failed to send message. Room not found.'
        }
    }

    // Add info whose end the chat, client/agent
    // add client email/identifier to bubblechat [0]
    // add agent id to bubblechat [0]
    // add type, chat_end_by: agent/client

    roomId = getMessages.room
    let ongoingRoomMembersKey = `${roomId}:members`
    let pendingChatTransferMemberKey = `${roomId}:pending_transfer_members` // rooms only contains agent id
    let unixtime = getCurrentDateTime('unix')

    // Add resolve chat (room id) to company's resolve chats list
    let companySlug = roomId.split(':')[1]
    let companyResolveChatRoom = `company:${companySlug}:resolve_chats`
    await redisClient.zadd(companyResolveChatRoom, unixtime, roomId)

    // Add resolve chat (room id) to agents' resolve chats list
    let roomMembers = null
    roomMembers = await redisClient.zrange(pendingChatTransferMemberKey, 0, -1) // Get agents from "pending transfer room members"
    if(!roomMembers) {
        roomMembers = await redisClient.zrange(ongoingRoomMembersKey, 0, -1) // Get agents from "on going room members"
    }

    if(roomMembers && roomMembers.length > 0) {
        for(let [idx, item] of roomMembers.entries()) {
            let agentResolveChatRoom = `user:${item}:resolve_chats`
            await redisClient.zadd(agentResolveChatRoom, unixtime, roomId)

            // Delete room id from on going list
            let agentRooms = `user:${item}:rooms`
            await redisClient.zrem(agentRooms, roomId)
        }
    }

    // Delete room id from client's on going list
    let clientIdentifier = await redisClient.zrange(ongoingRoomMembersKey, 0, 0) // return object
    let clientRoom = null
    let clientResolveRoom = null
    if(clientIdentifier && clientIdentifier.length > 0) {
        clientRoom = `client:${clientIdentifier}:rooms`
        clientResolveRoom = `client:${clientIdentifier}:resolve_chats`
    }

    /** Emit to FE */
    let resultMessage = {
        success: true,
        message: `Chat ${chatId} has resolved successfully!`
    }

    let socketInPTRoomMember = await io.in(pendingChatTransferMemberKey).fetchSockets()
    if(socketInPTRoomMember) {
        for(let [index, sd] of socketInPTRoomMember.entries()) {
            if(sd.data.user) {
                // Emit data to each agent
                // Emit resolve chat
                let listResolve = await getResolveListByUser(sd)
                io.to(sd.id).emit('chat.resolve', listResolve)

                // Emit on going to only "last handled by agent"
                if(sender.id == sd.data.user.id) {
                    let ongoingList = await getOngoingListByUser(sd)
                    io.to(sd.id).emit('chat.ongoing', ongoingList)
                    io.to(sd.id).emit('chat.endresult', resultMessage)
                }

                // Remove "transfer_socket_room" from each agent
                // So, agent will not listen to room again even if agent refresh page
                let agentPTSocketRoomKey = `user:${sd.data.user.id}:pending_transfer_socket_room`
                let deletePTSocketRoomFromAgent = await redisClient.zrem(agentPTSocketRoomKey, pendingChatTransferMemberKey)
            }
        }
    }

    // Emit to client's resolve chat
    // get socket from roomID
    // check if the value is email (not integer)
    //      or if data does not have id
    // io.to(clientSocket.id).emit('client.chat.resolve', clientResolveList)
    // then remove from redis
    // remove loop user:75:pending_transfer_socket_room

    // Take out (leave) agent and user from room id
    io.in(roomId).socketsLeave(roomId);

    // Remove key
    await redisClient.del(pendingChatTransferMemberKey)
    await redisClient.del(`${roomId}:members`)

    return resultMessage
}

/**
 * Transfer Chat
 *
 * - Transfer a chat from agent to agent
 * - Transfer a chat from agent to department
 *
 * @param {*} io
 * @param {*} socket
 * @param {*} data
 * @returns
 */
const transferChat = async (io, socket, data) => {
    let initiator = socket.request.session.user
    let chatId = data.chatId
    let roomId = ''

    console.log('Transfer chat: ', chatId)

    // Check if room exists
    let getMessages = await getMessagesByChatId(chatId)
    if(!getMessages.room) {
        console.error('Transfer chat error: empty keys. Room not found')
        return {
            data: data,
            message: 'Failed to transfer chat. Room not found.'
        }
    }

    // Check if agents is present and not assign to self
    if(data.toAgent == initiator.id) {
        return {
            data: data,
            message: 'Failed to transfer chat. Can not assign to self.'
        }
    }
    let existingAgentKey = await redisClient.keys(`user:${data.toAgent}`)
    if(existingAgentKey.length <= 0) {
        return {
            data: data,
            message: 'Failed to transfer chat. Assigned agent is not found.'
        }
    }

    roomId = getMessages.room
    let previousAgentOngoingRoomKey = `user:${initiator.id}:rooms`
    let ongoingRoomMembersKey = `${roomId}:members`
    let pendingChatTransferMemberKey = `${roomId}:pending_transfer_members`
    let unixtime = getCurrentDateTime('unix')

    // Get Assigned Agent Socket
    let assignedAgentSocket = null
    let agentPTSocketRoom = `user:${data.toAgent}:pending_transfer_chat_room`
    const mySockets = await io.in(agentPTSocketRoom).fetchSockets();
    for (let [index, sd] of mySockets.entries()) {
        assignedAgentSocket = sd
    }

    /** Already handled when room.join */
    // Add previous agent to "chat id's pending transfer member"
    let handledBy = [] // Chat is handled by which agents
    let ongoingRoomMembers = await redisClient.zrange(ongoingRoomMembersKey, 0, -1)
    // if(ongoingRoomMembers && ongoingRoomMembers.length > 1) {
    //     // Only get agent, index 0 contains client's email
    //     let agent = ongoingRoomMembers.slice(1)

    //     for(let [idx, item] of agent.entries()) {
    //         handledBy.push(getCurrentDateTime('unix'), item)
    //     }
    // }

    // Add assigned agent to "chat id's pending transfer member"
    handledBy.push(getCurrentDateTime('unix'), data.toAgent)

    // Save all "handled by agents" to "chat id's pending transfer member"
    const addToPTRoom = await redisClient.zadd(pendingChatTransferMemberKey, handledBy)

    // Add assigned agent to "self's pending transfer room"
    // Save to redis
    const agentPTRoomKey = `user:${data.toAgent}:pending_transfer_chats`
    const addToAgentPTRoom = await redisClient.zadd(agentPTRoomKey, unixtime, roomId)

    console.log('agentPTRoomKey', agentPTRoomKey)
    console.log('addToAgentPTRoom', addToAgentPTRoom)

    // if addToPTRoom and addToAgentPTRoom is success
    // Remove previous agent from on going room
    // if(addToPTRoom && addToAgentPTRoom) {
        // Remove previous agent from "on going room members"
        await redisClient.zrem(ongoingRoomMembersKey, initiator.id)

        // Remove the room from "previous agent's on going room"
        await redisClient.zrem(previousAgentOngoingRoomKey, roomId)

        console.log('masuk, harusnya kehapus')
        // Leave previous agent socket from room id
        io.in(socket.id).socketsLeave(roomId);
    // }

    /** Emit to FE */
    // Emit only to "agent's pending transfer room"
    let pendingTransferList = await getPendingTransferListByUser(assignedAgentSocket)
    io.to(agentPTSocketRoom).emit('chat.pendingtransfer', pendingTransferList)

    // Emit to previous agent
    let previousAgentSocketId = socket.id
    let previousAgentOngoingList = await getOngoingListByUser(socket)
    io.to(previousAgentSocketId).emit('chat.ongoing', previousAgentOngoingList)

    return true
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
    getPendingTransferListByUser,
    sendMessage,
    transferChat
}
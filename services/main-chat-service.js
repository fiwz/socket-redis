// Redis
const redis = require('../config/redis');
const redisF = redis.justVariable
const redisClient = redis.client
const sub = redis.sub

const {
    getCurrentDateTime,
    getMemberDataFromBubble,
    replaceBaseUrl
} = require("../utils/helpers");

const {
    successResponseFormat,
    errorResponseFormat
} = require("../utils/response-handler");

const {
    initWhatsappService,
    replyToClientWhatsapp,
} = require("./whatsapp-service")

const {
    sendMessage: actionSendMessage,
    getMessagesByChatId: actionGetMessagesByChatId,
    getOngoingListByUser: actionGetOngoingListByUser,
    getPendingTransferListByUser: actionGetPendingTransferListByUser,
    getMessagesByManyChatRoom: actionGetMessagesByManyChatRoom,
    getPendingListByUser: actionGetPendingListByUser
} = require("../utils/chat-action")


const initAllChatService = (io=null, socket=null, data=null) => {
    initWhatsappService(io)
}

/**
 * Get pending list and its messages
 * by logged in agent (user)
 *
 * @param {*} socket
 * @returns
 */
const getPendingListByUser = async(socket) => {
    let data = await actionGetPendingListByUser(socket)
    return data
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
    let data = await actionGetOngoingListByUser(socket)
    return data
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
    let resolveList = await getMessagesByManyChatRoom(listResolveChatRoom, null, null, socket)

    return resolveList
}

/**
 * Get list of pending transfer chat
 * by logged in agent
 *
 * List contains:
 * - pending transfer to agent
 * - pending transfer to department
 *
 * @param {*} socket
 * @returns
 */
const getPendingTransferListByUser = async(socket) => {
    let data = await actionGetPendingTransferListByUser(socket)
    return data
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
const getClientOngoingChat = async (socket) => {
    let clientRoomKey = `client:${socket.request.session.user.email}:rooms`
    let clientRoomId = await redisClient.get(clientRoomKey)
    let chatId = clientRoomId ? clientRoomId.split(':').pop() : null
    let getMessages = await getMessagesByChatId(chatId)
    if(!getMessages.room) {
        console.error(errorResponseFormat(null, `Room ${chatId} not found.`))
        return []
    }

    return getMessages
}

/**
 * Get list resolve chat
 * by logged in client
 *
 * @param {*} socket
 */
const getClientResolveList = async (socket) => {
    const clientData = socket.request.session.user
    if (clientData === undefined) {
        // return errorResponseFormat(null, 'Failed to fetch data. Please login to continue')
        return []
    }

    let listClientResolveChatRoom = `client:${clientData.email}:resolve_chats`
    let clientResolveList = await getMessagesByManyChatRoom(listClientResolveChatRoom)

    return clientResolveList
}

/**
 * Fetch messages (bubbles/chat replies)
 * from given chat id
 *
 * @param {String} id
 * @param {*} socketOrRequest socket|API request (express request)
 * @returns
 */
const getMessagesByChatId = async (id, socketOrRequest=null) => {
    let data = await actionGetMessagesByChatId(id, socketOrRequest)
    return data
}

/**
 * Show client's detail
 * from given chat id
 *
 * @param {String} id
 * @returns
 */
 const getClientDetailByChatId = async (id) => {
    let getMessages = await getMessagesByChatId(id)
    let clientDetail = null
    if(getMessages.chat_reply) {
        clientDetail = {
            user_email: getMessages.user_email,
            user_name: getMessages.user_name,
            user_phone: getMessages.user_phone,
        }
    }

    return clientDetail
}

/**
 * Fetch messages (bubbles/chat replies)
 * from many chat room
 *
 * Can be fetch from
 * - room category id
 * - array of room id
 *
 * @param {String} roomCategory (key that holds list of chat rooms/chat id)
 * @param {Array} arrayRoomId array list of room id
 * @param {String} withBubble null|'WITHBUBBLE'
 * @returns Array
 */
 const getMessagesByManyChatRoom = async(
    roomCategory,
    arrayRoomId=null,
    withBubble=null,
    withSocketOrRequest=null
    ) => {
    let data = await actionGetMessagesByManyChatRoom(
        roomCategory,
        arrayRoomId,
        withBubble,
        withSocketOrRequest
    )
    return data
}

/**
 * Send Message
 *
 * - Store data to database
 * - Show incoming message to agent/client
 *
 * @param {*} io
 * @param {*} socket
 * @param {*} data
 * @param {*} type
 * @returns
 */
const sendMessage = async(io, socket=null, data, type=null) => {
    let storeMessage = await actionSendMessage(io, socket, data, type)

    if(storeMessage && storeMessage.success) {
        // Send message from agent to client whatsapp
        if(storeMessage.id_channel == 2 && socket)
            replyToClientWhatsapp(socket, storeMessage)
    }
}

/**
 * End Chat
 *
 * Action for end a chat/resolve a chat
 * @param {*} io
 * @param {*} socket
 * @param {*} data
 * @returns
 */
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
            message: `Failed to send message. Room ${chatId} not found.`
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

    // Client's data
    let clientIdentifier = await redisClient.zrange(ongoingRoomMembersKey, 0, 0) // return object
    let clientRoom = null
    let clientResolveRoom = null
    if(clientIdentifier && clientIdentifier.length > 0) {
        // set client identifier
        // if livechat, user email
        // if telegram/whatsapp, user phone
        clientRoom = `client:${clientIdentifier[0]}:rooms`
        clientResolveRoom = `client:${clientIdentifier[0]}:resolve_chats`
        await redisClient.del(clientRoom) // Delete room id from client's on going list
        await redisClient.zadd(clientResolveRoom, unixtime, roomId) // Add room id to client's resolve list
    }

    // UPDATE STATUS
    // Set status to resolve
    let updateFirstMessageData = getMessages.chat_reply[0]
    updateFirstMessageData.status = 9
    updateFirstMessageData.chat_end_by = sender.id ? sender.id : sender.email
    await redisClient.call('JSON.SET', roomId, '[0]', JSON.stringify(updateFirstMessageData))

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
    let socketInOngoingRoomMember = await io.in(roomId).fetchSockets()
    if(socketInOngoingRoomMember) {
        for(let [index, sd] of socketInOngoingRoomMember.entries()) {
            if(!sd.data.user.id) {
                io.to(sd.id).emit('client.chat.endresult', resultMessage)
                break;
            }
        }
    }

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
    let roomId = null
    let requestResult = null

    // Check if room exists
    let getMessages = await getMessagesByChatId(chatId)
    if(!getMessages.room) {
        console.error('Transfer chat error: empty keys. Room not found')

        requestResult = errorResponseFormat(data, `Failed to transfer chat. Room ${chatId} not found.`)
        socket.emit('chat.transferresult', requestResult)
        return requestResult
    }

    // Check Transfer Destination
    let checkDestination = await checkTransferDestination(io, socket, data);
    if(!checkDestination.success)
        return checkDestination

    roomId = getMessages.room
    let previousAgentOngoingRoomKey = `user:${initiator.id}:rooms`
    let ongoingRoomMembersKey = `${roomId}:members`
    let pendingChatTransferMemberKey = `${roomId}:pending_transfer_members`
    let unixtime = getCurrentDateTime('unix')

    // Get Assigned Agent Socket
    let assignedAgentSocket = []
    let mySockets = null
    let agentPTSocketRoom = `user:${data.toAgent}:pending_transfer_chat_room`
    let departmentPTSocketRoom = `company:${initiator.company_name}:dept:${data.toDepartment}:pending_transfer_chat_room`
    // TRANSFER TO AGENT OR DEPARTMENT
    mySockets = data.toAgent ? (await io.in(agentPTSocketRoom).fetchSockets()) : (await io.in(departmentPTSocketRoom).fetchSockets())
    if(!mySockets || mySockets.length <= 0) {
        requestResult = errorResponseFormat(null, 'Failed to transfer chat. Agent or Department is not online.')
        socket.emit('chat.transferresult', requestResult)
        return requestResult
    }

    for (let [index, sd] of mySockets.entries()) {
        assignedAgentSocket[index] = sd
    }

    // Add assigned agent to "chat id's pending transfer member"
    let handledBy = [] // Chat is handled by which agents
    let assignedRoomKey = null // WHETRHER CHAT WILL BE TRANSFERRED TO AGENT OR DEPARTMENT ROOM
    if(data.toAgent) {
        // TRANSFER TO AGENT

        handledBy.push(getCurrentDateTime('unix'), data.toAgent)

        // Save all "handled by agents" to "chat id's pending transfer member"
        const addToPTRoom = await redisClient.zadd(pendingChatTransferMemberKey, handledBy)

        // Add assigned agent to "self's pending transfer room"
        const agentPTRoomKey = `user:${data.toAgent}:pending_transfer_chats`
        assignedRoomKey = agentPTRoomKey
    } else {
        // TRANSFER TO DEPARTMENT

        // Add assigned agent to "company department's pending transfer room"
        const departmentPTRoomKey = `company:${initiator.company_name}:dept:${data.toDepartment}:pending_transfer_chats`
        assignedRoomKey = departmentPTRoomKey
    }

    // Save to redis
    const addToDepartmentPTRoom = await redisClient.zadd(assignedRoomKey, unixtime, roomId)

    // if addToPTRoom and addToAgentPTRoom is success
    // Remove previous agent from on going room
    // if(addToPTRoom && addToAgentPTRoom) {
        await redisClient.zrem(ongoingRoomMembersKey, initiator.id) // Remove previous agent from "on going room members"
        await redisClient.zrem(previousAgentOngoingRoomKey, roomId) // Remove the room from "previous agent's on going room"
        io.in(socket.id).socketsLeave(roomId); // Leave previous agent socket from room id
    // }

    // UPDATE STATUS
    // UPDATE DEPARTMENT NAME
    // Set status to pending transfer
    let updateFirstMessageData = getMessages.chat_reply[0]
    updateFirstMessageData.status = 2

    if(data.toAgent && assignedAgentSocket[0]) {
        if(updateFirstMessageData.department_name != assignedAgentSocket[0].data.user.department_name)
            updateFirstMessageData.department_name = assignedAgentSocket[0].data.user.department_name
    } else {
        updateFirstMessageData.department_name = data.toDepartment
    }
    await redisClient.call('JSON.SET', roomId, '[0]', JSON.stringify(updateFirstMessageData))

    /** Emit to FE */

    // TRANSFER TO AGENT
    if(data.toAgent) {
        // Emit only to "agent's pending transfer room"
        let pendingTransferList = await getPendingTransferListByUser(assignedAgentSocket[0])
        io.to(agentPTSocketRoom).emit('chat.pendingtransfer', pendingTransferList)
    } else {
        // TRANSFER TO DEPARTMENT

        // Emit only to agents in "company department pending transfer room"
        for([index, agentSd] of assignedAgentSocket.entries()) {
            console.log('agentSd', agentSd)
            let pendingTransferList = await getPendingTransferListByUser(agentSd)
            io.to(agentSd.id).emit('chat.pendingtransfer', pendingTransferList)
        }
    }

    // Emit to previous agent
    let previousAgentSocketId = socket.id
    let previousAgentOngoingList = await getOngoingListByUser(socket)
    io.to(previousAgentSocketId).emit('chat.ongoing', previousAgentOngoingList)

    socket.emit('chat.transferresult', successResponseFormat())
    return successResponseFormat()
}

const checkTransferDestination = async(io, socket, data) => {
    let initiator = socket.request.session.user
    // TRANSFER TO AGENT
    if(data.toAgent) {
        // Check if agents is present and not assign to self
        if(data.toAgent == initiator.id) {
            requestResult = errorResponseFormat(null, 'Failed to transfer chat. Can not assign to self.')
            socket.emit('chat.transferresult', requestResult)
            return requestResult
        }

        let existingAgentKey = await redisClient.keys(`user:${data.toAgent}`)
        if(existingAgentKey.length <= 0) {
            requestResult = errorResponseFormat(null, 'Failed to transfer chat. Assigned agent is not found.')
            socket.emit('chat.transferresult', requestResult)
            return requestResult
        }
    } else {
        // TRANSFER TO DEPARTMENT

        // Check if department is present and not assign to current department
        if(data.toDepartment == initiator.department_name) {
            requestResult = errorResponseFormat(null, 'Failed to transfer chat. Can not assign to current department.')
            socket.emit('chat.transferresult', requestResult)
            return requestResult
        }

        let existingDepartmentKey = await redisClient.keys(`company:${initiator.company_name}:dept:${data.toDepartment}:users`)
        if(existingDepartmentKey.length <= 0) {
            requestResult = errorResponseFormat(null, 'Failed to transfer chat. Department is not found/no online users.')
            socket.emit('chat.transferresult', requestResult)
            return requestResult
        }
    }

    return successResponseFormat()
}

module.exports = {
    endChat,
    getAllChatList,
    getClientDetailByChatId,
    getClientOngoingChat,
    getClientResolveList,
    // getClientWhatsappOngoingChat,
    getMessagesByChatId,
    getOngoingListByUser,
    getPendingListByRoomKey,
    getPendingListByUser,
    getPendingTransferListByUser,
    sendMessage,
    transferChat,

    initAllChatService,
}
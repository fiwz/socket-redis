// Redis
const redis = require('../config/redis');
const redisF = redis.justVariable
const redisClient = redis.client
const sub = redis.sub

const moment = require('moment');

const { getCurrentDateTime } = require("../utils/helpers");

const {
    successResponseFormat,
    errorResponseFormat
} = require("../utils/response-handler")

/**
 * Define Variable
 */
let predefinedChatKeys = {
    // chat_reply: [],
    agent_email: null,
    agent_id: null,
    agent_name: null,
    agent_uuid: null,
    channel_name: null,
    chat_id: null, // item.split(':').pop()
    department_name: null,
    formatted_date: null,
    id_channel: null,
    message: null,
    room: null, // item
    topic_name: null,
    user_avatar: null,
    user_email: null,
    user_name: null,
    user_phone: null,
}

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
    if (socket.request.session.user === undefined) {
        return {
            data: null,
            message: 'Failed to fetch data. Please login to continue'
        }
    }

    const user = socket.request.session.user
    let pendingTransferList = []

    // Pending transfer to agent
    let agentPTRoomKey = `user:${user.id}:pending_transfer_chats`
    let agentListRoomId = await redisClient.zrange(agentPTRoomKey, 0, -1);

    // Pending transfer to department
    let departmentPTRoomKey = `company:${user.company_name}:dept:${user.department_name}:pending_transfer_chats`
    let departmentListRoomId = await redisClient.zrange(departmentPTRoomKey, 0, -1);

    // Merge list if both list are exist
    if(agentListRoomId.length > 0 && departmentListRoomId.length > 0) {
        let arrayRoomId = await redisClient.zunion(2, agentPTRoomKey, departmentPTRoomKey)
        pendingTransferList = await getMessagesByManyChatRoom(null, arrayRoomId)
    } else {
        let roomKey = agentListRoomId.length > 0 ? agentPTRoomKey : departmentPTRoomKey
        pendingTransferList = await getMessagesByManyChatRoom(roomKey)
    }

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
const getClientOngoingChat = async (socket) => {
    let clientRoomKey = `client:${socket.request.session.user.email}:rooms`
    let clientRoomId = await redisClient.get(clientRoomKey)
    let chatId = clientRoomId ? clientRoomId.split(':').pop() : null
    let getMessages = await getMessagesByChatId(chatId)
    if(!getMessages.room) {
        console.error(errorResponseFormat(null, 'Room not found.'))
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
 * @returns
 */
const getMessagesByChatId = async (id) => {
    const chatId = id
    let roomId = null
    let chatResult = predefinedChatKeys
    chatResult.chat_reply = []
    chatResult.chat_id = chatId

    if(!chatId) {
        let requestResult = errorResponseFormat(null, 'Failed to get messages. Chat ID not found.')
        return requestResult
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

    // samakan dengan yang ada di get by many chat room
    // DRY
    // code...

    // Set Users Key
    if(chatResult.chat_reply && chatResult.chat_reply.length > 0) {
        let firstMessage = chatResult.chat_reply[0]
        chatResult.user_email = firstMessage.from
        chatResult.user_name = firstMessage.user_name
        chatResult.user_phone = firstMessage.phone
    }

    // Set Agent Key
    let chatRoomMembersKey = `${roomId}:members`
    let agentsInChatRoom = await redisClient.zrange(chatRoomMembersKey, 1, -1) // start from index 1
    if(agentsInChatRoom) {
        let agentId = agentsInChatRoom.pop()
        let agentDataKey = `user:${agentId}`
        let agentData = await redisClient.hgetall(agentDataKey)
        chatResult.agent_email = agentData.email_agent ? agentData.email_agent : null
        chatResult.agent_id = agentData.agent_id ? agentData.agent_id : null
        chatResult.agent_name = agentData.name_agent ? agentData.name_agent : null
    }

    return chatResult
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
 * @returns Array
 */
 const getMessagesByManyChatRoom = async(roomCategory, arrayRoomId=null) => {
    let chatListKey = []
    let chatListWithBubble = []

    if(roomCategory) {
        chatListKey = await redisClient.zrange(roomCategory, 0, -1);
    } else {
        chatListKey = arrayRoomId
    }

    if(chatListKey) {
        // Mapping data for every chat id (room)
        for(let [idx, item] of chatListKey.entries()) {
            let bubbleExist = await redisClient.exists(item)
            chatListWithBubble[idx] = predefinedChatKeys
            chatListWithBubble[idx].chat_id = item.split(':').pop()
            chatListWithBubble[idx].room = item

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
                        id_channel: firstMessage.id_channel ? firstMessage.id_channel : null,
                        channel_name: firstMessage.channel_name ? firstMessage.channel_name : null,
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

/**
 * Check if user is join the specific socket room
 *
 * @param {*} io
 * @param {*} socket
 * @param {*} roomId
 * @returns
 */
 const isUserInRoom = async(io, socket, roomId) => {
    console.log('kepanggil')
    let failedCheckUser = errorResponseFormat(null, 'Failed to process the rquest. User is not in chat room.')
    let socketsInRoom = await io.in(roomId).fetchSockets();
    if(!socketsInRoom) { // Room is empty
        failedCheckUser = errorResponseFormat(null, 'Room is Empty.')
        console.error(failedCheckUser)
        return failedCheckUser
    }

    let userExistsInRoom = false;
    for(let [idx, socketUser] of socketsInRoom.entries()) {
        if( socket.id == socketUser.id ) {
            userExistsInRoom = true;
            break;
        }
    }

    if(!userExistsInRoom) { // User is not in room
        console.error(failedCheckUser)
        return failedCheckUser
    }

    return successResponseFormat(null, 'User is already in room')
}

const sendMessage = async(io, socket, data) => {
    let sender = socket.request.session.user
    let chatId = data.chatId
    let roomId = ''

    let getMessages = await getMessagesByChatId(chatId)
    if(!getMessages.room) {
        let requestResult = errorResponseFormat(data, 'Failed to send message. Room not found.')
        console.error(requestResult)
        socket.emit('message', requestResult)

        return requestResult
    }

    roomId = getMessages.room // return the first keys
    let datetime = getCurrentDateTime()

    // Check if user is already join room
    let userInRoom = await isUserInRoom(io, socket, roomId)
    if(!userInRoom.success) {
        socket.emit('message', userInRoom)
        return userInRoom
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

    chatContent.success = true

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

        requestResult = errorResponseFormat(data, 'Failed to transfer chat. Room not found.')
        socket.emit('chat.transferresult', requestResult)
        return requestResult
    }

    // Check Transfer Destination
    await checkTransferDestination(io, socket, data)

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

    /** Emit to FE */

    // TRANSFER TO AGENT
    if(data.toAgent) {
        // Emit only to "agent's pending transfer room"
        let pendingTransferList = await getPendingTransferListByUser(assignedAgentSocket)
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
    generateChatId,
    getAllChatList,
    getClientDetailByChatId,
    getClientOngoingChat,
    getClientResolveList,
    getMessagesByChatId,
    getOngoingListByUser,
    getPendingListByRoomKey,
    getPendingListByUser,
    getPendingTransferListByUser,
    sendMessage,
    transferChat
}
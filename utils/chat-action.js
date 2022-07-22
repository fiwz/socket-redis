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

/**
 * Define Variable
 */
// Keys of List Chat
let predefinedChatKeys = {
    // chat_reply: [],
    // is_sender: null, // only in bubble chat
    agent_email: null,
    agent_id: null,
    agent_name: null,
    agent_uuid: null,
    channel_name: null,
    chat_id: null, // item.split(':').pop()
    company_name: null,
    department_name: null,
    file_id: null,
    file_name: null,
    file_path: null,
    file_type: null,
    file_url: null,
    formatted_date: null,
    id_channel: null,
    message: null,
    room: null, // item
    status: null,
    topic_name: null,
    user_email: null,
    user_name: null,
    user_phone: null,
    no_whatsapp: null, // key is used to send message to Whatsapp
}

// Keys of Bubble Chat
let predefinedBubbleKeys = {
    agent_name: null,
    created_at: null,
    file_id: null,
    file_name: null,
    file_path: null,
    file_type: null,
    file_url: null,
    formatted_date: null,
    from: null, // agent get agent id or client | sender.id ? sender.id : sender.email
    message: null,
    updated_at: null,
    user_email: null, // agent get agent id or client | sender.id ? "" : sender.email
    user_name: null, // both agent and client have name
    user_phone: null,
    no_whatsapp: null, // key is used to send message to Whatsapp
}


/**
 * Get pending list and its messages
 * by logged in agent (user)
 *
 * @param {*} socket
 * @returns
 */
 const getPendingListByUser = async(socket) => {
    if (socket.request.session === undefined && socket.request.session.user === undefined) {
        return {
            data: null,
            message: 'Failed to fetch data. Please login to continue'
        }
    }

    const user = socket.request.session.user
    let pendingList = []

    // Pending list to agent's department
    let departmentPendingRoomKey = `company:${user.company_name}:dept:${user.department_name}:pending_chats`
    let departmentListRoomId = await redisClient.zrange(departmentPendingRoomKey, 0, -1);

    // Pending transfer from socmed
    let socmedPendingRoomKey = `company:${user.company_name}:dept:fromsocmed:pending_chats`
    let socmedListRoomId = await redisClient.zrange(socmedPendingRoomKey, 0, -1);

    // Merge list if both list are exist
    if(departmentListRoomId.length > 0 && socmedListRoomId.length > 0) {
        let arrayRoomId = await redisClient.zunion(2, departmentPendingRoomKey, socmedPendingRoomKey)
        pendingList = await getMessagesByManyChatRoom(null, arrayRoomId, null, socket)
    } else {
        let roomKey = departmentListRoomId.length > 0 ? departmentPendingRoomKey : socmedPendingRoomKey
        pendingList = await getMessagesByManyChatRoom(roomKey, null, null, socket)
    }

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
    let userRooms = await getMessagesByManyChatRoom(userRoomsKey, null, null, socket)

    return userRooms
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
    if (socket.request.session === undefined && socket.request.session.user === undefined) {
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
        pendingTransferList = await getMessagesByManyChatRoom(null, arrayRoomId, null, socket)
    } else {
        let roomKey = agentListRoomId.length > 0 ? agentPTRoomKey : departmentPTRoomKey
        pendingTransferList = await getMessagesByManyChatRoom(roomKey, null, null, socket)
    }

    return pendingTransferList
}

const getClientWhatsappOngoingChat = async (WhatsappFromNumber) => {
    let clientRoomKey = `client:${WhatsappFromNumber}:rooms`
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
 * Fetch messages (bubbles/chat replies)
 * from given chat id
 *
 * @param {String} id
 * @param {*} socketOrRequest socket|API request (express request)
 * @returns
 */
 const getMessagesByChatId = async (id, socketOrRequest=null) => {
    const chatId = id
    let roomId = null
    let chatResult = predefinedChatKeys
    chatResult.chat_reply = []

    let requestResult = errorResponseFormat(null, 'Failed to get messages. Chat ID not found.')
    if(!chatId)
        return requestResult

    let existingKeys = await redisClient.keys(`*room:${chatId}`)
    if(existingKeys.length <= 0 ) {
        console.error('Error in getMessagesByChatId(). Empty room id keys.')
        return requestResult
    }

    roomId = existingKeys[0] // return the first keys
    let arrayMessageDetail = await getMessagesByManyChatRoom(null, [roomId], 'WITHBUBBLE', socketOrRequest)

    if(arrayMessageDetail.length > 0)
        chatResult = arrayMessageDetail[0]

    return chatResult
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
    let chatListKey = []
    let chatListWithBubble = []
    let socket = null
    let currentLoggedInUser = null

    // Set current logged in user data
    // Validate by socket session or express session
    if(withSocketOrRequest) {
        let userDataBySocket = withSocketOrRequest && withSocketOrRequest.request  ? withSocketOrRequest.request.session : null
        let userDataByRequest = withSocketOrRequest && withSocketOrRequest.session ? withSocketOrRequest.session : null

        currentLoggedInUser = userDataBySocket ? userDataBySocket : userDataByRequest
        if(currentLoggedInUser.user == undefined || currentLoggedInUser.user == undefined) {
            console.error(errorResponseFormat(null, 'User session is empty. Please relogin to continue.'))
            return errorResponseFormat(null, 'User session is empty. Please relogin to continue.')
        } else {
            currentLoggedInUser = currentLoggedInUser.user
        }
    }

    // Set chat list value
    if(roomCategory) {
        chatListKey = await redisClient.zrange(roomCategory, 0, -1);
    } else {
        chatListKey = arrayRoomId
    }

    if(chatListKey) {
        // Mapping data for every chat id (room)
        for(let [idx, item] of chatListKey.entries()) {
            let bubbleExist = await redisClient.exists(item)
            if(bubbleExist != 0) {
                let bubbles = await redisClient.call('JSON.GET', item)
                let parsedBubbles = JSON.parse(bubbles)
                let firstMessage = parsedBubbles[0]
                let latestMessageIndex = (parsedBubbles.length - 1)
                let latestMessage = parsedBubbles[latestMessageIndex]

                let currentRoomAgentData = await getMemberDataFromBubble(parsedBubbles)

                chatListWithBubble[idx] = predefinedChatKeys
                chatListWithBubble[idx] = {
                    ...chatListWithBubble[idx],
                    ...{
                        channel_name: firstMessage.channel_name ? firstMessage.channel_name : null,
                        chat_id: item.split(':').pop(),
                        company_name: firstMessage.company_name,
                        department_name: firstMessage.department_name,
                        formatted_date: latestMessage.formatted_date,
                        id_channel: firstMessage.id_channel ? firstMessage.id_channel : null,
                        message: latestMessage.message,
                        room: item,
                        status: (firstMessage.status || firstMessage.status == 0) ? firstMessage.status : null,
                        topic_name: firstMessage.topic_name,
                        user_email: firstMessage.from,
                        user_name: firstMessage.user_name,
                        user_phone: firstMessage.user_phone ? firstMessage.user_phone : null,
                        file_id: latestMessage.file_id ? latestMessage.file_id : null,
                        file_name: latestMessage.file_name ? latestMessage.file_name : null,
                        file_path: latestMessage.file_path ? latestMessage.file_path : null,
                        file_type: latestMessage.file_type ? latestMessage.file_type : null,
                        file_url: latestMessage.file_url ? latestMessage.file_url : null,
                        no_whatsapp: firstMessage.no_whatsapp ? firstMessage.no_whatsapp : null,
                    }
                }

                if(latestMessage.file_path && latestMessage.file_url) {
                    let changedUrl = await replaceBaseUrl(latestMessage.file_url)
                    latestMessage.file_url = changedUrl
                }

                // Show Chat Data and Its Bubble/Chat Replies
                if(withBubble && withBubble == 'WITHBUBBLE') {
                    if(parsedBubbles.length > 0) {
                        for(let [index, bubbleItem] of parsedBubbles.entries()) {
                            bubbleItem.is_sender = false

                            if( currentRoomAgentData[bubbleItem.from]) {
                                bubbleItem.avatar = currentRoomAgentData[bubbleItem.from].avatar // agent avatar
                                if(withSocketOrRequest)
                                    bubbleItem.is_sender = currentLoggedInUser.id == currentRoomAgentData[bubbleItem.from].agent_id ? true : false
                            } // end if agent data exists

                            if(bubbleItem.file_path && bubbleItem.file_url) {
                                let changedUrl = await replaceBaseUrl(bubbleItem.file_url)
                                bubbleItem.file_url = changedUrl
                            }
                        }
                    }
                    chatListWithBubble[idx].chat_reply = parsedBubbles
                }

                // Set Agent Key in List
                let latestAgentHandleMessage = currentRoomAgentData.pop()
                if(latestAgentHandleMessage) {
                    // chatListWithBubble[idx].avatar = latestAgentHandleMessage.avatar ? latestAgentHandleMessage.avatar : null
                    chatListWithBubble[idx].agent_email = latestAgentHandleMessage.email_agent ? latestAgentHandleMessage.email_agent : null
                    chatListWithBubble[idx].agent_id = latestAgentHandleMessage.agent_id ? latestAgentHandleMessage.agent_id : null
                    chatListWithBubble[idx].agent_name = latestAgentHandleMessage.name_agent ? latestAgentHandleMessage.name_agent : null
                }
            }

        } // end for

        // Remove null values
        chatListWithBubble = chatListWithBubble.filter(function(_, index) { return chatListWithBubble.hasOwnProperty(index); });
    }

    return chatListWithBubble
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
    let chatId = data.chatId
    let roomId = ''
    let chatContent = predefinedBubbleKeys
    let getMessages = null
    let datetime = getCurrentDateTime()

    // Check/validate room id
    getMessages = await getMessagesByChatId(chatId)
    if(!getMessages.room) {
        let requestResult = errorResponseFormat(data, `Failed to send message. Room ${chatId} not found.`)
        console.error(requestResult)
        if(socket)
            socket.emit('message', requestResult)

        return requestResult
    }
    roomId = getMessages.room // return the first keys

    // Chat type is Livechat
    if(socket) {
        let sender = socket.request.session.user

        // Check if user is already join room
        let userInRoom = await isUserInRoom(io, socket, roomId)
        if(!userInRoom.success) {
            socket.emit('message', userInRoom)
            return userInRoom
        }

        chatContent = {
            ...chatContent,
            ...{
                agent_name: sender.id ? sender.name : "",
                created_at: datetime,
                file_id: data.file_id ? data.file_id : null,
                file_name: data.file_name ? data.file_name : null,
                file_path: data.file_path ? data.file_path : null,
                file_type: data.file_type ? data.file_type : null,
                file_url: data.file_url ? data.file_url : null,
                formatted_date: datetime,
                from: sender.id ? sender.id : sender.email, // agent get agent id or client
                message: data.message,
                updated_at: datetime,
                user_email: sender.id ? "" : sender.email, // agent get agent id or client
                user_name: sender.id ? "" : sender.name,
            }
        }
    }

    // Chat type is Whatsapp
    if(type == 'whatsapp') {
        let setMessageData = await mappingDataSMToWhatsapp(io, null, data)
        chatContent = setMessageData
    } // end if whatsapp

    // Save to db
    let saveMsg = await redisClient.call('JSON.ARRAPPEND', roomId, '.', JSON.stringify(chatContent))

    // Set return data to show to agent/client
    chatContent.success = true

    chatContent.company_name = getMessages.company_name
    chatContent.no_whatsapp = getMessages.no_whatsapp
    chatContent.id_channel = getMessages.id_channel
    chatContent.avatar = null
    let currentRoomAgentData = await getMemberDataFromBubble([chatContent])
    if(currentRoomAgentData && currentRoomAgentData.length > 0) {
        chatContent.avatar = currentRoomAgentData[chatContent.from].avatar
    }

    // Replace file url domain/base url
    if(chatContent.file_path && chatContent.file_url) {
        let changedUrl = null
        if(type == 'whatsapp') {
            changedUrl = await replaceBaseUrl(chatContent.file_url, process.env.SOCMED_FILE_STORAGE_URL ? process.env.SOCMED_FILE_STORAGE_URL : 'http://localhost:4000')
        } else {
            changedUrl = await replaceBaseUrl(chatContent.file_url)
        }

        chatContent.file_url = changedUrl
    }

    /** Emit to FE */
    // Emit the same data to members in room id
    // io.to(roomId).emit('show.room', chatContent)
    // io.to(roomId).emit('message', chatContent)

    // Emit the same data, and is_sender key to members in room id
    let socketList = await io.in(roomId).fetchSockets()
    if(socketList && socketList.length > 0) {
        for(let [index, sd] of socketList.entries()) {
            if(sd.data.user) {
                if(sd.data.user.id && sd.data.user.id == chatContent.from) { // is agent
                    chatContent.is_sender = true
                } else if (sd.data.user.email && sd.data.user.email == chatContent.from) { // is client
                    chatContent.is_sender = true
                } else {
                    chatContent.is_sender = false
                }

                io.to(sd.id).emit('show.room', chatContent)
                io.to(sd.id).emit('message', chatContent)
            }
        } // end for
    }

    /**
     * Emit to:
     * - department pending list
     * - department pending transfer list
     * - agent's pending transfer list
     */
    if(getMessages.status == 0 || getMessages.status == 2) {
        let selectedRoom = null
        let emitKey = null
        let pendingDepartmentRoom = `company:${getMessages.company_name}:dept:${getMessages.department_name}:pending_chat_room`
        let pendingTransferDepartmentRoom = `company:${getMessages.company_name}:dept:${getMessages.department_name}:pending_transfer_chat_room`;

        // Get list chat from selected room
        selectedRoom = pendingDepartmentRoom
        emitKey = 'chat.pending'
        if(getMessages.status == 2) {
            selectedRoom = pendingTransferDepartmentRoom
            emitKey = 'chat.pendingtransfer'
        }
            // Get list pending chat from socmed
            if(type == 'whatsapp') {
                let socmedPendingRoom = `company:${getMessages.company_name}:dept:fromsocmed:pending_chat_room`
                selectedRoom = socmedPendingRoom
            }

        // Add condition if chat is pending transfer to agent
        // code...

        // Add condition if chat is pending transfer to department
        // code...

        let socketList = await io.in(selectedRoom).fetchSockets()
        if(socketList && socketList.length > 0) {
            for(let [index, sd] of socketList.entries()) {
                if(sd.data.user) {
                    let listChat = (getMessages.status == 0) ? await getPendingListByUser(sd) : await getPendingTransferListByUser(sd)
                    io.to(sd.id).emit(emitKey, listChat)
                }
            }
        }
    }

    return chatContent
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

/**
 * Set data to store to database/redis
 * When message comes from Whatsapp
 *
 * @param {*} io
 * @param {*} socket
 * @param {*} data
 * @returns
 */
 const mappingDataSMToWhatsapp = async (io, socket=null, data) => {
    let sender = { name: data.user_name }
    let datetime = getCurrentDateTime()

    let chatContent = predefinedBubbleKeys
    chatContent = {
        ...chatContent,
        ...{
            agent_name: sender.id ? sender.name : "",
            created_at: datetime,
            formatted_date: datetime,
            from: data.from,
            message: data.message,
            no_whatsapp: data.no_whatsapp,
            updated_at: datetime,
            user_email: null,
            user_name: data.user_name,
            user_phone: data.user_phone,

            file_id: data.file_id ? data.file_id : null,
            file_name: data.file_name ? data.file_name : null,
            file_path: data.file_path ? data.file_path : null,
            file_type: data.file_type ? data.file_type : null,
            file_url: data.file_url ? data.file_url : null,
        }
    }

    return chatContent
}

module.exports = {
    // endChat,
    // getAllChatList,
    // getClientDetailByChatId,
    // getClientOngoingChat,
    // getClientResolveList,
    getClientWhatsappOngoingChat,
    getMessagesByChatId,
    getOngoingListByUser,
    // getPendingListByRoomKey,
    getPendingListByUser,
    getPendingTransferListByUser,
    sendMessage,
    // transferChat,

    // initAllChatService,
    getMessagesByManyChatRoom,
}
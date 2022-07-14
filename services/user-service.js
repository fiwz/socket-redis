// Redis
const { result } = require('lodash');
const redis = require('../config/redis');
const redisF = redis.mainAction;
const redisClient = redis.client;
const sub = redis.sub;

const {
    getAllChatList,
    getClientOngoingChat,
    getClientResolveList,
    getMessagesByChatId,
    getOngoingListByUser,
    getPendingListByUser,
    getPendingTransferListByUser,
} = require('../services/main-chat-service');

const {
    getCurrentDateTime,
    slugify,
    getValueByArrayColumn
} = require('../utils/helpers');

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
    let arrData = [];
    let newData = [];
    Object.keys(data).forEach((item, idx) => {
        if(['company_name', 'department_name'].includes(item)) {
            arrData.push(item, slugify(data[item]));
            newData[item] = slugify(data[item]);
        } else {
            arrData.push(item, data[item]);
            newData[item] = data[item];
        }
    });

    // Save data user to redis
    let userDataKey = `user:${data.agent_id}`;
    await redisClient.hmset(userDataKey, arrData);

    // Insert user to company department
    let companySlug = slugify(data.company_name);
    let departmentSlug = slugify(data.department_name);
    let usersInDepartmentKey = `company:${companySlug}:dept:${departmentSlug}:users`;
    await redisClient.sadd(usersInDepartmentKey, data.agent_id);

    // Add to online user list
    let companyOnlineUsersKey = `company:${companySlug}:online_users`;
    await redisClient.zadd(
        companyOnlineUsersKey,
        getCurrentDateTime('unix'),
        data.agent_id
    );

    return newData;
};

/**
 * Init user on connected
 *
 * - Detect online users(agent) & clients
 * - Join room based on user roles
 * @param {*} io
 * @param {*} socket
 */
const initAllConnectedUsers = async (io, socket, withReturnData = false) => {
    if(socket.request.session.user !== undefined) {
        const user = socket.request.session.user;

        // If agent
        if(user.id) {
            // Add to online user list
            let companyOnlineUsersKey = `company:${user.company_name}:online_users`;
            await redisClient.zadd(
                companyOnlineUsersKey,
                getCurrentDateTime('unix'),
                user.id
            );

            // Add to company department's users in redis
            let usersInDepartmentKey = `company:${user.company_name}:dept:${user.department_name}:users`
            await redisClient.sadd(usersInDepartmentKey, user.id)

            userGetAndJoinRoom(socket);

            if(withReturnData) {
                const myChatList = await getAllChatList(socket);
                const companyOnlineUsers = await getCompanyOnlineUsers(io, socket);
                const companyOnlineDepartments = await getCompanyOnlineDepartments(io, socket)

                let result = myChatList;
                result.online_users = companyOnlineUsers;

                /** Emit to FE */
                let companyOnlineUserRoom = `company:${user.company_name}:online_user_room`;
                // Emit All Data
                // socket.emit('chat.onrefresh', result); // to all user
                socket.emit('chat.pending', myChatList.pending);
                socket.emit('chat.ongoing', myChatList.ongoing);
                socket.emit('chat.resolve', myChatList.resolve);
                socket.emit('chat.pendingtransfer', myChatList.pendingtransfer);

                // Emit Online Users
                // io.to(companyOnlineUserRoom).emit('users.online', companyOnlineUsers); // to all user in a company
                // io.to(companyOnlineUserRoom).emit('departments.online', companyOnlineDepartments); // to all user in a company
            }
        } else {
            // If client
            clientGetAndJoinRoom(socket);

            const clientChatList = await getClientOngoingChat(socket);
            const clientResolveList = await getClientResolveList(socket);
            socket.emit('client.chat.ongoing', clientChatList);
            socket.emit('client.chat.resolve', clientResolveList);
        }
    }
};

/**
 * Get online users in a company
 * based on logged in user
 *
 * - Can be fetch by socket
 * - Can be fetch by request
 * @param {*} io
 * @param {*} socket
 * @param {*} request
 * @returns
 */
const getCompanyOnlineUsers = async (io, socket = null, request = null) => {
    let onlineUsers = [];
    let sourceAuthData = socket ? socket.request.session : request.session;

    if(sourceAuthData.user !== undefined) {
        const user = sourceAuthData.user;

        // via Redis
        // let companyOnlineUsersKey = `company:${user.company_name}:online_users`
        // let isMemberExists = await redisClient.zrange(companyOnlineUsersKey, 0, -1)
        // if(isMemberExists) {
        //     for(let [idx, member] of isMemberExists.entries()) {
        //         let memberDetailKey = await redisClient.hgetall(`user:${member}`)
        //         if(memberDetailKey)
        //             onlineUsers[idx] = memberDetailKey
        //     }
        // }

        // via Socket Room
        let companyOnlineUserRoom = `company:${user.company_name}:online_user_room`;
        const socketsData = await io.in(companyOnlineUserRoom).fetchSockets();
        if(socketsData) {
            for(let [index, sd] of socketsData.entries()) {
                // dev debug
                // console.log('sd.id', sd.id);
                // console.log('sd.handshake', sd.handshake);
                // console.log('sd.rooms', sd.rooms);
                // console.log('sd.data', sd.data);

                onlineUsers[index] = sd.data.user;
            }

            io.to(companyOnlineUserRoom).emit('users.online', onlineUsers); // to all user in a company
        }
    }

    return onlineUsers;
};

/**
 * Get online departments in a company
 * - based on logged in users in a company
 * - based on current logged in user
 *
 * @param {*} io
 * @param {*} socket
 * @param {*} request
 * @returns
 */
const getCompanyOnlineDepartments = async (io, socket = null, request = null) => {
    let onlineDepartments = [];
    let sourceAuthData = socket ? socket.request.session : request.session;

    if(sourceAuthData.user !== undefined) {
        const user = sourceAuthData.user;
        let companyOnlineUserRoom = `company:${user.company_name}:online_user_room`;

        // Get Department By Online Users via Socket
        let onlineUsers = await getCompanyOnlineUsers(io, socket, request)
        onlineDepartments = await getValueByArrayColumn(onlineUsers, 'department_name', 'DISTINCT')

        /** Emit to FE */
        io.to(companyOnlineUserRoom).emit('departments.online', onlineDepartments); // to all user in a company
    }

    return onlineDepartments;
}

/**
 * Client Get And Join Room
 *
 * Get client room and join client to existing room
 */
const clientGetAndJoinRoom = async (socket) => {
    let clientSessionData = socket.request.session.user
    let clientRoomKey = `client:${clientSessionData.email}:rooms`;
    let clientRoomId = await redisClient.get(clientRoomKey);
    socket.join(clientRoomId);

    // Save client data to socket data
    socket.data.user = clientSessionData;

    // insert room yg diklik ke list room milik agent
    // add user to room:QBFCL1656301812:members (optional)
    // code...

    return `Client has joined: ${clientRoomId}`;
};

/**
 * User Get And Join Room
 *
 * Only for agent
 * Get user room and join client to existing room
 */
const userGetAndJoinRoom = async (socket) => {
    const user = socket.request.session.user;

    if(user.id) {
        // Join On Going Chat Room
        const userRooms = await redisClient.zrange(`user:${user.id}:rooms`, 0, -1);
        for(let item of userRooms) {
            socket.join(item);
            console.log('User joined: ', item);
        }

        // Join Company Online User Room
        let companyOnlineUserRoom = `company:${user.company_name}:online_user_room`;
        socket.join(companyOnlineUserRoom);

        // Join Department Room
        // Agent will get notified if there is new pending chat
        let pendingDepartmentRoom = `company:${user.company_name}:dept:${user.department_name}:pending_chat_room`;
        socket.join(pendingDepartmentRoom);

        // Join Pending Transfer to Department Room
        let pendingTransferDepartmentRoom = `company:${user.company_name}:dept:${user.department_name}:pending_transfer_chat_room`;
        socket.join(pendingTransferDepartmentRoom);

        // Join Pending Transfer to Agent's Room
        let pendingTransferAgentRoom = `user:${user.id}:pending_transfer_chat_room`;
        socket.join(pendingTransferAgentRoom);

        // Join Pending Transfer Members Room
        // Means that agent has ever handled the chat before chat is transferred
        let pendingTransferMemberRoomKey = `user:${user.id}:pending_transfer_socket_room`
        let pendingTransferMemberRoom = await redisClient.zrange(pendingTransferMemberRoomKey, 0, -1)
        if(pendingTransferMemberRoom || pendingTransferMemberRoom.length > 0) {
            for(let item of pendingTransferMemberRoom) {
                socket.join(item);
            }
        }

        // Save user data to socket data
        socket.data.user = user;
    }
};

const userInsertAndJoinRoom = async (io, socket, id) => {
    if(socket.request.session.user === undefined) {
        return {
            data: roomId,
            message: 'Failed join into chat room. Please login to continue',
        }
    }

    const user = socket.request.session.user
    const chatId = id
    let roomId = ''
    let chatRoomMembersKey = ''
    let chatResult = {
        chat_id: chatId,
        room: roomId,
        chat_reply: [],
    }

    // Check if keys exists
    let existingKeys = await redisClient.keys(`*room:${chatId}`)
    if(existingKeys.length < 0) {
        console.error('userJoinRoom: empty keys')
        return {
            data: roomId,
            message: 'Failed join into chat room',
        }
    }

    // Insert agent to on going room
    roomId = existingKeys[0] // return the first keys
    chatResult.room = roomId
    chatRoomMembersKey = `${roomId}:members`
    let unixtime = getCurrentDateTime('unix')
    socket.join(roomId)

    // Insert room id to "agent's on going rooms"
    let userRoomsKey = `user:${user.id}:rooms`
    await redisClient.zadd(userRoomsKey, unixtime, roomId)

    // Add agent id to "room members"
    await redisClient.zadd(chatRoomMembersKey, unixtime, user.id)

    // Add agent to "room id pending transfer member"
    // In case chat would be transferred
    // This key would be deleted when end chat
    let pendingChatTransferMemberKey = `${roomId}:pending_transfer_members`
    await redisClient.zadd(pendingChatTransferMemberKey, unixtime, user.id)
    await redisClient.zadd(`user:${user.id}:pending_transfer_socket_room`, unixtime, pendingChatTransferMemberKey)
    socket.join(pendingChatTransferMemberKey)

    // Get message bubbles
    let messageDetail = await getMessagesByChatId(chatId)
    chatResult = messageDetail

    // UPDATE STATUS
    // Set status to on going
    let updateFirstMessageData = messageDetail.chat_reply[0]
    updateFirstMessageData.status = 1
    await redisClient.call('JSON.SET', roomId, '[0]', JSON.stringify(updateFirstMessageData))

    // Check if room is in "pending list by department"
    let currentDepartmentName = messageDetail.chat_reply[0].department_name
    let currentCompanyName = user.company_name
    let pendingChatInDepartment = `company:${currentCompanyName}:dept:${currentDepartmentName}:pending_chats`

    let isExistsInPending = await redisClient.zrank(pendingChatInDepartment, roomId)
    if(isExistsInPending || isExistsInPending == 0) {
        let removeKeyInPending = await redisClient.zrem(pendingChatInDepartment, roomId)
        if(!removeKeyInPending)
            console.error(`error remove ${roomId} from ${pendingChatInDepartment}`)
    }

    // Check if room is in "pending transfer list by department"
    let departmentPTRoomKey = `company:${user.company_name}:dept:${user.department_name}:pending_transfer_chats`
    let departmentPTSocketRoom = `company:${user.company_name}:dept:${user.department_name}:pending_transfer_chat_room`

    let isExistsInDepartmentPT = await redisClient.zrank(departmentPTRoomKey, roomId)
    if(isExistsInDepartmentPT || isExistsInDepartmentPT == 0) {
        let removeKeyInPending = await redisClient.zrem(departmentPTRoomKey, roomId)
        if(!removeKeyInPending)
            console.error(`error remove ${roomId} from ${departmentPTRoomKey}`)
    }

    // Check if room is in "agent's pending transfer"
    let agentPendingTransferChatRoom = `user:${user.id}:pending_transfer_chats`

    let isExistsInAgentPT = await redisClient.zrank(agentPendingTransferChatRoom, roomId)
    if(isExistsInAgentPT || isExistsInAgentPT == 0) {
        let removeKeyInPending = await redisClient.zrem(agentPendingTransferChatRoom, roomId)
        if(!removeKeyInPending)
            console.error(`error remove ${roomId} from ${agentPendingTransferChatRoom}`)
    }

    let pendingList = await getPendingListByUser(socket)
    let ongoingList = await getOngoingListByUser(socket)
    let pendingTransferList = []
    let result = {
        chat_detail: chatResult,
        message: 'Successfully join into chat room!',
        ongoing: ongoingList,
        pending: pendingList,
        pendingtransfer: pendingTransferList,
        success: true,
    }

    /**
     * Emit to FE
     */
    // Emit to agent who took the chat
    io.to(socket.id).emit('chat.ongoing', ongoingList)
    io.to(socket.id).emit('chat.pending', pendingList)
    io.to(socket.id).emit('room.joinresult', {
        message: result.message,
        success: result.success
    })

    // Emit list pending transfer to all agent
    if(isExistsInDepartmentPT || isExistsInDepartmentPT == 0) { // IF IN LIST TRANSFER TO DEPARTMENT
        let mySockets = await io.in(departmentPTSocketRoom).fetchSockets();
        for([index, agentSd] of mySockets.entries()) {
            pendingTransferList = await getPendingTransferListByUser(agentSd)
            io.to(agentSd.id).emit('chat.pendingtransfer', pendingTransferList)
        }
    } else {
        pendingTransferList = await getPendingTransferListByUser(socket)
        io.to(socket.id).emit('chat.pendingtransfer', pendingTransferList)
    }

    return result
}

module.exports = {
    clientGetAndJoinRoom,
    createUserAuth,
    getCompanyOnlineDepartments,
    getCompanyOnlineUsers,
    initAllConnectedUsers,
    userGetAndJoinRoom,
    userInsertAndJoinRoom,
};
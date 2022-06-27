// Redis
const redis = require('../config/redis');
const redisF = redis.justVariable
const redisClient = redis.client
const sub = redis.sub

const moment = require('moment');
const { response } = require('express');

const generateChatId = (length=4) => {
    /**
     * Chat ID length is 15 characters
     */
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

const getCurrentDateTime = (type=null) => {
    let currentDate = moment().utc().utcOffset(+7)
    let date = currentDate.format('YYYY-MM-DD h:mm:ss') // WIB
    // if locale is set moment().utc().utcOffset(process.env.TIMEZONE).format('YYYY-MM-DD h:mm:ss')

    if(type === 'unix') {
        date = currentDate.unix()
    }

    return date
}

const slugify = function(str) {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, etc
    var from = "ãàáäâẽèéëêìíïîõòóöôùúüûñç·/_,:;";
    var to   = "aaaaaeeeeeiiiiooooouuuunc------";
    for (var i = 0, l = from.length; i < l; i++) {
      str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
                .replace(/\s+/g, '-') // collapse whitespace and replace by -
                .replace(/-+/g, '-'); // collapse dashes

    return str;
};


// AGENT
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

    // save data user to redis
    await redisClient.hmset(`user:${data.agent_id}`, arrData)

    // insert user to company department
    await redisClient.sadd(`company:${slugify(data.company_name)}:dept:${slugify(data.department_name)}:users`, data.agent_id)

    return newData
}



// CHAT DATA
const getAllChatList = async (socket) => {
    const user = socket.request.session.user
    let pendingList = []
    let pendingListWithBubble = []
    let ongoingListWithBubble = []
    let ongoingList = []
    let searchKey = `company:${user.company_name}:dept:${user.department_name}:pending_chats`

    pendingList = await redisClient.zrange(searchKey, 0, -1);
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

    return {
        pending: pendingListWithBubble,
        ongoing: ongoingListWithBubble
    }
}

const clientJoinRoom = async (socket) => {
    // console.log('===============', 'session di helpers', socket.request.session)
    let clientRoomKey = `client:${socket.request.session.user.email}:rooms`
    let clientRoomVal = await redisClient.get(clientRoomKey)
    socket.join(clientRoomVal)

    // insert room yg diklik ke list room milik agent
    // add user to room:QBFCL1656301812:members
    // code...

    console.log('client joined: ', clientRoomVal)

    return `client joined: ${clientRoomVal}`
}

const getClientChatList = async (socket) => {
    let clientRoomKey = `client:${socket.request.session.user.email}:rooms`
    let clientRoomVal = await redisClient.get(clientRoomKey)
    let chatResult = {}

    let bubbleExist = await redisClient.exists(clientRoomKey)
    chatResult = {
        chat_id: clientRoomVal.split(':').pop(),
        room: clientRoomVal,
        chat_reply: []
    }

    if(bubbleExist) {
        let bubbles = await redisClient.call('JSON.GET', clientRoomVal)
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

const userJoinRoom = async(socket, id) => {
    // insert room yg diklik ke list room milik agent (user:49:QCHAT1234)
    // search/cek pakai keys *QCHAT12345
    // add user to room:QBFCL1656301812:members (optional)
    // code...
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
    chatRoomMembersKey = roomId+':members'
    socket.join(roomId);
    console.log('someone join room', roomId)
    console.log('existing room:', socket.rooms)

    // insert room to user's list rooms
    let userRoomsKey = `user:${user.id}:rooms`
    await redisClient.zadd(userRoomsKey, getCurrentDateTime('unix'), roomId)

    // await redisClient.sadd(chatRoomMembersKey, idAgent)

    // get message bubbles
    let bubbles = await redisClient.call('JSON.GET', roomId)
    bubbles = JSON.parse(bubbles)
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
        data: roomId,
        message: 'Successfully join into chat room!'
    }
}

module.exports = {
    generateChatId,
    slugify,

    getCurrentDateTime,
    createUserAuth,
    getAllChatList,
    clientJoinRoom,
    getClientChatList,
    getMessagesByChatId,
    userJoinRoom
}
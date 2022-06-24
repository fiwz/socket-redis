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

const getCurrentDateTime = () => {
    let date = moment().utc().utcOffset(+7).format('YYYY-MM-DD h:mm:ss') // WIB
    // if locale is set moment().utc().utcOffset(process.env.TIMEZONE).format('YYYY-MM-DD h:mm:ss')

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
    let ongoingList = []
    let searchKey = `company:${user.company_name}:dept:${user.department_name}:pending_chats`

    pendingList = await redisClient.smembers(searchKey);
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

    return {
        pending: pendingListWithBubble,
        ongoing: ongoingList
    }
}

const clientJoinRoom = async (socket) => {
    let clientRoomKey = `client:${socket.request.session.user.email}:rooms`
    let clientRoomVal = await redisClient.get(clientRoomKey)
    socket.join(clientRoomVal)
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

module.exports = {
    generateChatId,
    slugify,

    getCurrentDateTime,
    createUserAuth,
    getAllChatList,
    clientJoinRoom,
    getClientChatList
}
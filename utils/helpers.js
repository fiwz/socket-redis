// Redis
const redis = require('../config/redis');
const redisF = redis.justVariable
const redisClient = redis.client
const sub = redis.sub

const moment = require('moment');

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

const getAllChatList = async (socket) => {
    let pendingList = []
    let ongoingList = []

    return {
        pending: pendingList,
        ongoing: ongoingList,
        mySession: socket.request.session
    }
}

module.exports = {
    generateChatId,
    slugify,
    createUserAuth,
    getAllChatList
}
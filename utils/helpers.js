const moment = require('moment');
// Redis
const redis = require('../config/redis');
const redisF = redis.justVariable
const redisClient = redis.client

const getCurrentDateTime = (type=null) => {
    let currentDate = moment().utc().utcOffset(+7)
    let date = currentDate.format('YYYY-MM-DD HH:mm:ss') // WIB
    // if locale is set moment().utc().utcOffset(process.env.TIMEZONE).format('YYYY-MM-DD h:mm:ss')

    if(type === 'unix') {
        date = currentDate.unix()
    }

    return date
}

const slugify = function(str) {
    if(str) {
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
    }
    return str;
}

const getValueByArrayColumn = async(array, keyToSearch, distinct=null) => {
    // get chat members
    let arrayResult = []
    for(let i in array) {
        if(array[i][keyToSearch])
            arrayResult.push(array[i][keyToSearch])
    }

    if(distinct == 'DISTINCT')
        arrayResult = arrayResult.filter((value, index, array) => array.indexOf(value) === index) // unique

    return arrayResult
}

const getMemberDataFromBubble = async (arrayBubble) => {
    let arrayChatMemberId = await getValueByArrayColumn(arrayBubble, 'from', 'DISTINCT')

    let currentRoomAgentData = []
    for(let agt of arrayChatMemberId) {
        let parsedAgentId = Number.parseInt(agt)
        if(Number.isInteger(parsedAgentId)) {
            let agentDataKey = `user:${parsedAgentId}`
            let agentData = await redisClient.hgetall(agentDataKey)

            currentRoomAgentData[parsedAgentId] = agentData
        }
    }

    return currentRoomAgentData
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

module.exports = {
    generateChatId,
    getCurrentDateTime,
    getMemberDataFromBubble,
    getValueByArrayColumn,
    slugify,
}
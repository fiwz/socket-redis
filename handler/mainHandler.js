// Redis
const redis = require('../config/redis');
const redisF = redis.justVariable
const redisClient = redis.client
const sub = redis.sub

module.exports = async (io, socket) => {
    // console.info('Socket is connected!');

    // let user = {...socket.request.session}
    // console.info('================', 'socket user', user)

    if (socket.request.session.user !== undefined) {
        const userId = socket.request.session.user.id;
        if(userId) {
            await redisClient.sadd("company:A:online_users", userId);
        } else {
            await redisClient.sadd("company:A:online_clients", socket.request.session.user.email);
        }
    }

    // Fire 'send' event for updating Message list in UI
    socket.on('message', function(data) {
        console.log('socket message in server', data)
        io.emit('send', data);
    });

    socket.on("disconnect", async () => {
        console.log('someone disconnected')
        if (socket.request.session.user !== undefined) {
            const userId = socket.request.session.user.id;
            if(userId) {
                await redisClient.srem("company:A:online_users", userId);
                console.log('user is offline: ', userId)
            } else {
                await redisClient.srem("company:A:online_clients", socket.request.session.user.email);
                console.log('client is offline: ', socket.request.session.user.email)
            }
        }
    });
}
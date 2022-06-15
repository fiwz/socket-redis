const redis = require('../config/redis');

module.exports = (io, socket) => {
    console.info('Agent Socket is connected!');

    let user = {...socket.request.session}
    console.info('================', 'socket user', user)

    // Fire 'send' event for updating Message list in UI
    socket.on('message', function(data) {
        console.log('socket message in server', data)
        io.emit('send', data);
    });

    // Fire 'count_chatters' for updating Chatter Count in UI
    // socket.on('update_chatter_count', function(data) {
    //     // console.log('masuk ke on update chatter', data)
    //     redis.chattersData.then((ctr) => {
    //         let userData = []
    //         if(ctr) {
    //             userData = JSON.parse(ctr);
    //         }
    //         io.emit('count_chatters', { numberOfChatters: userData.length, member_joined: userData})
    //         console.log('done emit', { numberOfChatters: userData.length, member_joined: userData})
    //     })
    //     // io.emit('count_chatters', { numberOfChatters: data.length, member_joined: data})
    // });
}
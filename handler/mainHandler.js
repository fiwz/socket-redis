const redis = require('../config/redis');

module.exports = (io, socket) => {
    console.info('Socket is connected!');

    let user = {...socket.request.session}
    console.info('================', 'socket user', user)

    // Fire 'send' event for updating Message list in UI
    socket.on('message', function(data) {
        console.log('socket message in server', data)
        io.emit('send', data);
    });
}
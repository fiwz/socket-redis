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
    socket.on('update_chatter_count', function(data) {
        io.emit('count_chatters', { numberOfChatters: chatters.length, member_joined: chatters});
    });
}
// Redis
const redis = require('../config/redis');
const redisF = redis.mainAction;
const redisClient = redis.client;
const sub = redis.sub;

const _ = require('lodash');

const { getCurrentDateTime } = require('../utils/helpers');

const {
  endChat,
  getAllChatList,
  sendMessage,
  transferChat,
} = require('../services/main-chat-service');

const {
  initAllConnectedUsers,
  userInsertAndJoinRoom,
  clientGetAndJoinRoom,
  getCompanyOnlineUsers,
  userGetAndJoinRoom,
} = require('../services/user-service');

module.exports = async (io, socket) => {
  // console.log('==========', 'user session', socket.request.session);
  console.log('A user is connected to socket');

  await initAllConnectedUsers(io, socket, true);

  // dev debug
//   const socketsData = await io.in(socket.id).fetchSockets();
//   console.log('user id: ', socket.request.session.user ? socket.request.session.user.id : 'blm login')
//     if (socketsData) {
//         for (let [index, sd] of socketsData.entries()) {
//         // dev debug
//         // console.log('sd.id', sd.id);
//         // console.log('sd.handshake', sd.handshake);
//         console.log('sd.rooms', sd.rooms);
//         // console.log('sd.data', sd.data);
//         }
//     }


  /**
   * Reload socket session
   */
  socket.on('reload', async (req = null) => {
    // Reload session to get updated client session
    socket.request.session.reload(async (err) => {
      if (err) {
        console.log('error reload in socket: ', err);
        return socket.disconnect();
      }

      console.log('***************', 'reload socket', socket.request.session);

      await initAllConnectedUsers(io, socket, true); // with return data
    });
  });

  /**
   * Agent Join Room
   */
  socket.on('room.join', async (id) => {
    const joinedRoom = await userInsertAndJoinRoom(io, socket, id)
  });

  /**
   * New Chat
   *
   * - Insert to pending list
   * - Join client to chat room
   */
  socket.on('chat.new', async (req = null) => {
    // Reload session to get updated client session
    socket.request.session.reload((err) => {
      if (err) {
        return socket.disconnect();
      }
      clientGetAndJoinRoom(socket);
    });
  });

  /**
   * Handle incoming message to socket
   * - Handle incoming message both from agent and client
   */
  socket.on('message', async (data = null) => {
    await sendMessage(io, socket, data);
  });

  /**
   * Close chat/resolve a chat/end a chat
   */
  socket.on('chat.end', async (data) => {
    const result = await endChat(io, socket, data);
    // console.log('result', result)
  });

  /**
   * Transfer chat
   */
  socket.on('chat.transfer', async (data) => {
    const result = await transferChat(io, socket, data)
    console.log('BE listen to chat.transfer', result)
  })

  /**
   * Client request to fetch all data
   */
  socket.on('allData', async () => {
    if (socket.request.session.user !== undefined) {
      const myChatList = await getAllChatList(socket);
      const companyOnlineUsers = await getCompanyOnlineUsers(io, socket);

      let result = myChatList;
      result.online_users = companyOnlineUsers;

      socket.emit('chat.onrefresh', result);
    }
  });

  socket.on('disconnect', async () => {
    // leave room based on user
    // code...

    if (socket.request.session.user !== undefined) {
      const user = socket.request.session.user;
      if (user.id) {
        // Leave Company Room
        await redisClient.zrem(
          `company:${user.company_name}:online_users`,
          user.id
        ); // remove from redis
        let companyOnlineUserRoom = `company:${user.company_name}:online_user_room`;
        io.in(socket.id).socketsLeave(companyOnlineUserRoom); // leave socket

        // Emit to FE
        // Get Latest Online Users
        const companyOnlineUsers = await getCompanyOnlineUsers(io, socket);
        io.to(companyOnlineUserRoom).emit('users.offline', companyOnlineUsers);

        console.log('user is offline: ', user.id);
      } else {
        await redisClient.srem(
          `company:${socket.request.session.user.company_name}:online_clients`,
          socket.request.session.user.email
        );
        console.log('client is offline: ', socket.request.session.user.email);
      }
    }
  });
};

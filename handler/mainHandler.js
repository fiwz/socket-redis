// Redis
const redis = require("../config/redis");
const redisF = redis.mainAction;
const redisClient = redis.client;
const sub = redis.sub;

const _ = require("lodash");

const { getCurrentDateTime } = require("../utils/helpers");

const {
  endChat,
  getAllChatList,
  sendMessage,
  transferChat,
} = require("../services/main-chat-service");

const {
  clientGetAndJoinRoom,
  getCompanyOnlineDepartments,
  getCompanyOnlineUsers,
  initAllConnectedUsers,
  userInsertAndJoinRoom,
} = require("../services/user-service");

const { integrateWhatsappAccount } = require("../services/whatsapp-service");

module.exports = async (io, socket) => {
  // console.log('==========', 'user session', socket.request.session);
  console.log("A user is connected to socket");

  await initAllConnectedUsers(io, socket, true);

  // dev debug
  // const socketsData = await io.in(socket.id).fetchSockets();
  // console.log('user id: ', socket.request.session.user ? socket.request.session.user.id : 'blm login')
  // if(socketsData) {
  //     for(let [index, sd] of socketsData.entries()) {
  //         // dev debug
  //         // console.log('sd.id', sd.id);
  //         // console.log('sd.handshake', sd.handshake);
  //         console.log('sd.rooms', sd.rooms);
  //         console.log('sd.data', sd.data);
  //         console.log('sd.request.session', sd.request.session);
  //     }
  // }

  /**
   * Reload socket session
   */
  socket.on("reload", async (req = null) => {
    // Reload session to get updated client session
    socket.request.session.reload(async (err) => {
      if (err) {
        console.log("error reload in socket: ", err);
        return socket.disconnect();
      }

      console.log("***************", "reload socket", socket.request.session);

      await initAllConnectedUsers(io, socket, true); // with return data
    });
  });

  /**
   * Agent Join Room
   */
  socket.on("room.join", async (id) => {
    const joinedRoom = await userInsertAndJoinRoom(io, socket, id);
  });

  /**
   * New Chat
   *
   * - Insert to pending list
   * - Join client to chat room
   */
  socket.on("chat.new", async (req = null) => {
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
  socket.on("message", async (data = null) => {
    await sendMessage(io, socket, data);
  });

  /**
   * Close chat/resolve a chat/end a chat
   */
  socket.on("chat.end", async (data) => {
    const result = await endChat(io, socket, data);
  });

  /**
   * Transfer chat
   */
  socket.on("chat.transfer", async (data) => {
    console.log("dataTransfer:", data);
    const result = await transferChat(io, socket, data);
    console.log("BE listen to chat.transfer", result);
  });

  /**
   * List of available departments
   * In transfer chat feature
   */
  socket.on("departments.online", async () => {
    const companyOnlineDepartments = await getCompanyOnlineDepartments(
      io,
      socket
    );
  });

  /**
   * Client request to fetch all data
   */
  socket.on("allData", async () => {
    if (socket.request.session.user !== undefined) {
      const myChatList = await getAllChatList(socket);
      const companyOnlineUsers = await getCompanyOnlineUsers(io, socket);

      let result = myChatList;
      result.online_users = companyOnlineUsers;

      socket.emit("chat.onrefresh", result);
    }
  });

  /**
   * Integrate Whatsapp Account
   */
  socket.on("integrate.whatsapp", async (data) => {
    const connect = await integrateWhatsappAccount(io, socket, data);
    console.log("coba", connect);
  });

  socket.on("disconnect", async () => {
    if (socket.request.session.user !== undefined) {
      const user = socket.request.session.user;
      if (user.id) {
        // Leave Company Room
        // will automatically leave when user disconnect

        // Remove from redis
        await redisClient.zrem(
          `company:${user.company_name}:online_users`,
          user.id
        ); // remove from company online users in redis
        let usersInDepartmentKey = `company:${user.company_name}:dept:${user.department_name}:users`;
        await redisClient.srem(usersInDepartmentKey, user.id); // remove from company department's users in redis

        // Emit to FE
        // Get Latest Online Users
        let companyOnlineUserRoom = `company:${user.company_name}:online_user_room`;
        const companyOnlineUsers = await getCompanyOnlineUsers(io, socket);
        io.to(companyOnlineUserRoom).emit("users.offline", companyOnlineUsers);

        // Get Latest Online Departments
        const companyOnlineDepartments = await getCompanyOnlineDepartments(
          io,
          socket
        );

        console.log("user is offline: ", user.id);
      } else {
        await redisClient.srem(
          `company:${socket.request.session.user.company_name}:online_clients`,
          socket.request.session.user.email
        );
        console.log("client is offline: ", socket.request.session.user.email);
      }
    }
  });
};

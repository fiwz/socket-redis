// Redis
const redis = require("../config/redis");
const redisF = redis.justVariable;
const redisClient = redis.client;
const sub = redis.sub;

const {
  getCurrentDateTime,
  getMemberDataFromBubble,
  replaceBaseUrl,
} = require("../utils/helpers");

const {
  successResponseFormat,
  errorResponseFormat,
} = require("../utils/response-handler");

/**
 * Define Variable
 */
// Keys of List Chat
let predefinedChatKeys = {
  // chat_reply: [],
  // is_sender: null, // only in bubble chat
  agent_email: null,
  agent_id: null,
  agent_name: null,
  agent_uuid: null,
  channel_name: null,
  chat_id: null, // item.split(':').pop()
  company_name: null,
  department_name: null,
  file_id: null,
  file_name: null,
  file_path: null,
  file_type: null,
  file_url: null,
  formatted_date: null,
  id_channel: null,
  message: null,
  room: null, // item
  status: null,
  topic_name: null,
  user_email: null,
  user_name: null,
  user_phone: null,
};

// Keys of Bubble Chat
let predefinedBubbleKeys = {
  agent_name: null,
  created_at: null,
  file_id: null,
  file_name: null,
  file_path: null,
  file_type: null,
  file_url: null,
  formatted_date: null,
  from: null, // agent get agent id or client | sender.id ? sender.id : sender.email
  message: null,
  updated_at: null,
  user_email: null, // agent get agent id or client | sender.id ? "" : sender.email
  user_name: null, // both agent and client have name
};

/**
 * Get pending list and its messages
 * by logged in agent (user)
 *
 * @param {*} socket
 * @returns
 */
const getPendingListByUser = async (socket) => {
  const user = socket.request.session.user;
  let listPendingChatRoom = `company:${user.company_name}:dept:${user.department_name}:pending_chats`;
  let pendingList = await getMessagesByManyChatRoom(
    listPendingChatRoom,
    null,
    null,
    socket
  );

  return pendingList;
};

/**
 * Get Pending List by Room Key
 * Example: get pending list in department
 *
 * @param {String} roomKey
 * @returns
 */
const getPendingListByRoomKey = async (roomKey) => {
  let listPendingChatRoom = roomKey;
  let pendingList = await getMessagesByManyChatRoom(listPendingChatRoom);

  return pendingList;
};

/**
 * Get on going list and its messages
 * by logged in agent (user)
 *
 * @param {*} socket
 * @returns
 */
const getOngoingListByUser = async (socket) => {
  const user = socket.request.session.user;
  let userRoomsKey = `user:${user.id}:rooms`;
  let userRooms = await getMessagesByManyChatRoom(
    userRoomsKey,
    null,
    null,
    socket
  );

  return userRooms;
};

const getResolveListByUser = async (socket) => {
  const user = socket.request.session.user;
  if (socket.request.session.user === undefined) {
    return {
      data: null,
      message: "Failed to fetch data. Please login to continue",
    };
  }
  let listResolveChatRoom = `user:${user.id}:resolve_chats`;
  let resolveList = await getMessagesByManyChatRoom(
    listResolveChatRoom,
    null,
    null,
    socket
  );

  return resolveList;
};

/**
 * Get list of pending transfer chat
 * by logged in agent
 *
 * List contains:
 * - pending transfer to agent
 * - pending transfer to department
 *
 * @param {*} socket
 * @returns
 */
const getPendingTransferListByUser = async (socket) => {
  if (
    socket.request.session === undefined &&
    socket.request.session.user === undefined
  ) {
    return {
      data: null,
      message: "Failed to fetch data. Please login to continue",
    };
  }

  const user = socket.request.session.user;
  let pendingTransferList = [];

  // Pending transfer to agent
  let agentPTRoomKey = `user:${user.id}:pending_transfer_chats`;
  let agentListRoomId = await redisClient.zrange(agentPTRoomKey, 0, -1);

  // Pending transfer to department
  let departmentPTRoomKey = `company:${user.company_name}:dept:${user.department_name}:pending_transfer_chats`;
  let departmentListRoomId = await redisClient.zrange(
    departmentPTRoomKey,
    0,
    -1
  );

  // Merge list if both list are exist
  if (agentListRoomId.length > 0 && departmentListRoomId.length > 0) {
    let arrayRoomId = await redisClient.zunion(
      2,
      agentPTRoomKey,
      departmentPTRoomKey
    );
    pendingTransferList = await getMessagesByManyChatRoom(
      null,
      arrayRoomId,
      null,
      socket
    );
  } else {
    let roomKey =
      agentListRoomId.length > 0 ? agentPTRoomKey : departmentPTRoomKey;
    pendingTransferList = await getMessagesByManyChatRoom(
      roomKey,
      null,
      null,
      socket
    );
  }

  return pendingTransferList;
};

/**
 * Get all type of chat list and its messages
 * by logged in agent (user)
 *
 * @param {*} socket
 * @returns
 */
const getAllChatList = async (socket) => {
  let pendingList = await getPendingListByUser(socket);
  let ongoingList = await getOngoingListByUser(socket);
  let resolveList = await getResolveListByUser(socket);
  let pendingTransferList = await getPendingTransferListByUser(socket);
  let data = {
    ongoing: ongoingList,
    pending: pendingList,
    pendingtransfer: pendingTransferList,
    resolve: resolveList,
  };

  return data;
};

/**
 * Get chat id and its messages
 * by logged in client
 *
 * @param {*} socket
 * @returns
 */
const getClientOngoingChat = async (socket) => {
  let clientRoomKey = `client:${socket.request.session.user.email}:rooms`;
  let clientRoomId = await redisClient.get(clientRoomKey);
  let chatId = clientRoomId ? clientRoomId.split(":").pop() : null;
  let getMessages = await getMessagesByChatId(chatId);
  if (!getMessages.room) {
    console.error(errorResponseFormat(null, `Room ${chatId} not found.`));
    return [];
  }

  return getMessages;
};

/**
 * Get list resolve chat
 * by logged in client
 *
 * @param {*} socket
 */
const getClientResolveList = async (socket) => {
  const clientData = socket.request.session.user;
  if (clientData === undefined) {
    // return errorResponseFormat(null, 'Failed to fetch data. Please login to continue')
    return [];
  }

  let listClientResolveChatRoom = `client:${clientData.email}:resolve_chats`;
  let clientResolveList = await getMessagesByManyChatRoom(
    listClientResolveChatRoom
  );

  return clientResolveList;
};

/**
 * Fetch messages (bubbles/chat replies)
 * from given chat id
 *
 * @param {String} id
 * @param {*} socketOrRequest socket|API request (express request)
 * @returns
 */
const getMessagesByChatId = async (id, socketOrRequest = null) => {
  const chatId = id;
  let roomId = null;
  let chatResult = predefinedChatKeys;
  chatResult.chat_reply = [];

  let requestResult = errorResponseFormat(
    null,
    "Failed to get messages. Chat ID not found."
  );
  if (!chatId) return requestResult;

  let existingKeys = await redisClient.keys(`*room:${chatId}`);
  if (existingKeys.length <= 0) {
    console.error("Error in getMessagesByChatId(). Empty room id keys.");
    return requestResult;
  }

  roomId = existingKeys[0]; // return the first keys
  let arrayMessageDetail = await getMessagesByManyChatRoom(
    null,
    [roomId],
    "WITHBUBBLE",
    socketOrRequest
  );

  if (arrayMessageDetail.length > 0) chatResult = arrayMessageDetail[0];

  return chatResult;
};

/**
 * Show client's detail
 * from given chat id
 *
 * @param {String} id
 * @returns
 */
const getClientDetailByChatId = async (id) => {
  let getMessages = await getMessagesByChatId(id);
  let clientDetail = null;
  if (getMessages.chat_reply) {
    clientDetail = {
      user_email: getMessages.user_email,
      user_name: getMessages.user_name,
      user_phone: getMessages.user_phone,
    };
  }

  return clientDetail;
};

/**
 * Fetch messages (bubbles/chat replies)
 * from many chat room
 *
 * Can be fetch from
 * - room category id
 * - array of room id
 *
 * @param {String} roomCategory (key that holds list of chat rooms/chat id)
 * @param {Array} arrayRoomId array list of room id
 * @param {String} withBubble null|'WITHBUBBLE'
 * @returns Array
 */
const getMessagesByManyChatRoom = async (
  roomCategory,
  arrayRoomId = null,
  withBubble = null,
  withSocketOrRequest = null
) => {
  let chatListKey = [];
  let chatListWithBubble = [];
  let socket = null;
  let currentLoggedInUser = null;

  // Set current logged in user data
  // Validate by socket session or express session
  if (withSocketOrRequest) {
    let userDataBySocket =
      withSocketOrRequest && withSocketOrRequest.request
        ? withSocketOrRequest.request.session
        : null;
    let userDataByRequest =
      withSocketOrRequest && withSocketOrRequest.session
        ? withSocketOrRequest.session
        : null;

    currentLoggedInUser = userDataBySocket
      ? userDataBySocket
      : userDataByRequest;
    if (
      currentLoggedInUser.user == undefined ||
      currentLoggedInUser.user == undefined
    ) {
      console.error(
        errorResponseFormat(
          null,
          "User session is empty. Please relogin to continue."
        )
      );
      return errorResponseFormat(
        null,
        "User session is empty. Please relogin to continue."
      );
    } else {
      currentLoggedInUser = currentLoggedInUser.user;
    }
  }

  // Set chat list value
  if (roomCategory) {
    chatListKey = await redisClient.zrange(roomCategory, 0, -1);
  } else {
    chatListKey = arrayRoomId;
  }

  if (chatListKey) {
    // Mapping data for every chat id (room)
    for (let [idx, item] of chatListKey.entries()) {
      let bubbleExist = await redisClient.exists(item);
      if (bubbleExist != 0) {
        let bubbles = await redisClient.call("JSON.GET", item);
        let parsedBubbles = JSON.parse(bubbles);
        let firstMessage = parsedBubbles[0];
        let latestMessageIndex = parsedBubbles.length - 1;
        let latestMessage = parsedBubbles[latestMessageIndex];

        let currentRoomAgentData = await getMemberDataFromBubble(parsedBubbles);

        chatListWithBubble[idx] = predefinedChatKeys;
        chatListWithBubble[idx] = {
          ...chatListWithBubble[idx],
          ...{
            channel_name: firstMessage.channel_name
              ? firstMessage.channel_name
              : null,
            chat_id: item.split(":").pop(),
            company_name: firstMessage.company_name,
            department_name: firstMessage.department_name,
            formatted_date: latestMessage.formatted_date,
            id_channel: firstMessage.id_channel
              ? firstMessage.id_channel
              : null,
            message: latestMessage.message,
            room: item,
            status:
              firstMessage.status || firstMessage.status == 0
                ? firstMessage.status
                : null,
            topic_name: firstMessage.topic_name,
            user_email: firstMessage.from,
            user_name: firstMessage.user_name,
            user_phone: firstMessage.phone ? firstMessage.phone : null,
            file_id: latestMessage.file_id ? latestMessage.file_id : null,
            file_name: latestMessage.file_name ? latestMessage.file_name : null,
            file_path: latestMessage.file_path ? latestMessage.file_path : null,
            file_type: latestMessage.file_type ? latestMessage.file_type : null,
            file_url: latestMessage.file_url ? latestMessage.file_url : null,
          },
        };

        if (latestMessage.file_path && latestMessage.file_url) {
          let changedUrl = await replaceBaseUrl(latestMessage.file_url);
          latestMessage.file_url = changedUrl;
        }

        // Show Chat Data and Its Bubble/Chat Replies
        if (withBubble && withBubble == "WITHBUBBLE") {
          if (parsedBubbles.length > 0) {
            for (let [index, bubbleItem] of parsedBubbles.entries()) {
              bubbleItem.is_sender = false;

              if (currentRoomAgentData[bubbleItem.from]) {
                bubbleItem.avatar =
                  currentRoomAgentData[bubbleItem.from].avatar; // agent avatar
                if (withSocketOrRequest)
                  bubbleItem.is_sender =
                    currentLoggedInUser.id ==
                    currentRoomAgentData[bubbleItem.from].agent_id
                      ? true
                      : false;
              } // end if agent data exists

              if (bubbleItem.file_path && bubbleItem.file_url) {
                let changedUrl = await replaceBaseUrl(bubbleItem.file_url);
                bubbleItem.file_url = changedUrl;
              }
            }
          }
          chatListWithBubble[idx].chat_reply = parsedBubbles;
        }

        // Set Agent Key in List
        let latestAgentHandleMessage = currentRoomAgentData.pop();
        if (latestAgentHandleMessage) {
          // chatListWithBubble[idx].avatar = latestAgentHandleMessage.avatar ? latestAgentHandleMessage.avatar : null
          chatListWithBubble[idx].agent_email =
            latestAgentHandleMessage.email_agent
              ? latestAgentHandleMessage.email_agent
              : null;
          chatListWithBubble[idx].agent_id = latestAgentHandleMessage.agent_id
            ? latestAgentHandleMessage.agent_id
            : null;
          chatListWithBubble[idx].agent_name =
            latestAgentHandleMessage.name_agent
              ? latestAgentHandleMessage.name_agent
              : null;
        }
      }
    } // end for

    // Remove null values
    chatListWithBubble = chatListWithBubble.filter(function (_, index) {
      return chatListWithBubble.hasOwnProperty(index);
    });
  }

  return chatListWithBubble;
};

/**
 * Check if user is join the specific socket room
 *
 * @param {*} io
 * @param {*} socket
 * @param {*} roomId
 * @returns
 */
const isUserInRoom = async (io, socket, roomId) => {
  let failedCheckUser = errorResponseFormat(
    null,
    "Failed to process the rquest. User is not in chat room."
  );
  let socketsInRoom = await io.in(roomId).fetchSockets();
  if (!socketsInRoom) {
    // Room is empty
    failedCheckUser = errorResponseFormat(null, "Room is Empty.");
    console.error(failedCheckUser);
    return failedCheckUser;
  }

  let userExistsInRoom = false;
  for (let [idx, socketUser] of socketsInRoom.entries()) {
    if (socket.id == socketUser.id) {
      userExistsInRoom = true;
      break;
    }
  }

  if (!userExistsInRoom) {
    // User is not in room
    console.error(failedCheckUser);
    return failedCheckUser;
  }

  return successResponseFormat(null, "User is already in room");
};

const sendMessage = async (io, socket, data) => {
  let sender = socket.request.session.user;
  let chatId = data.chatId;
  let roomId = "";

  let getMessages = await getMessagesByChatId(chatId);
  if (!getMessages.room) {
    let requestResult = errorResponseFormat(
      data,
      `Failed to send message. Room ${chatId} not found.`
    );
    console.error(requestResult);
    socket.emit("message", requestResult);

    return requestResult;
  }

  roomId = getMessages.room; // return the first keys
  let datetime = getCurrentDateTime();

  // Check if user is already join room
  let userInRoom = await isUserInRoom(io, socket, roomId);
  if (!userInRoom.success) {
    socket.emit("message", userInRoom);
    return userInRoom;
  }

  let chatContent = predefinedBubbleKeys;
  chatContent = {
    ...chatContent,
    ...{
      agent_name: sender.id ? sender.name : "",
      created_at: datetime,
      file_id: data.file_id ? data.file_id : null,
      file_name: data.file_name ? data.file_name : null,
      file_path: data.file_path ? data.file_path : null,
      file_type: data.file_type ? data.file_type : null,
      file_url: data.file_url ? data.file_url : null,
      formatted_date: datetime,
      from: sender.id ? sender.id : sender.email, // agent get agent id or client
      message: data.message,
      updated_at: datetime,
      user_email: sender.id ? "" : sender.email, // agent get agent id or client
      user_name: sender.id ? "" : sender.name,
    },
  };

  // Save to db
  let saveMsg = await redisClient.call(
    "JSON.ARRAPPEND",
    roomId,
    ".",
    JSON.stringify(chatContent)
  );

  chatContent.success = true;
  chatContent.avatar = null;
  let currentRoomAgentData = await getMemberDataFromBubble([chatContent]);
  if (currentRoomAgentData && currentRoomAgentData.length > 0) {
    chatContent.avatar = currentRoomAgentData[chatContent.from].avatar;
  }

  if (chatContent.file_path && chatContent.file_url) {
    let changedUrl = await replaceBaseUrl(chatContent.file_url);
    chatContent.file_url = changedUrl;
  }

  /** Emit to FE */
  // Emit the same data to members in room id
  // io.to(roomId).emit('show.room', chatContent)
  // io.to(roomId).emit('message', chatContent)

  // Emit the same data, and is_sender key to members in room id
  let socketList = await io.in(roomId).fetchSockets();
  if (socketList && socketList.length > 0) {
    for (let [index, sd] of socketList.entries()) {
      if (sd.data.user) {
        if (sd.data.user.id && sd.data.user.id == chatContent.from) {
          // is agent
          chatContent.is_sender = true;
        } else if (
          sd.data.user.email &&
          sd.data.user.email == chatContent.from
        ) {
          // is client
          chatContent.is_sender = true;
        } else {
          chatContent.is_sender = false;
        }

        io.to(sd.id).emit("show.room", chatContent);
        io.to(sd.id).emit("message", chatContent);
      }
    } // end for
  }

  /**
   * Emit to:
   * - department pending list
   * - department pending transfer list
   * - agent's pending transfer list
   */
  if (getMessages.status == 0 || getMessages.status == 2) {
    let selectedRoom = null;
    let emitKey = null;
    let pendingDepartmentRoom = `company:${getMessages.company_name}:dept:${getMessages.department_name}:pending_chat_room`;
    let pendingTransferDepartmentRoom = `company:${getMessages.company_name}:dept:${getMessages.department_name}:pending_transfer_chat_room`;

    selectedRoom = pendingDepartmentRoom;
    emitKey = "chat.pending";
    if (getMessages.status == 2) {
      selectedRoom = pendingTransferDepartmentRoom;
      emitKey = "chat.pendingtransfer";
    }

    // Add condition if chat is pending transfer to agent
    // code...

    // Add condition if chat is pending transfer to department
    // code...

    let socketList = await io.in(selectedRoom).fetchSockets();
    if (socketList && socketList.length > 0) {
      for (let [index, sd] of socketList.entries()) {
        if (sd.data.user) {
          let listChat =
            getMessages.status == 0
              ? await getPendingListByUser(sd)
              : await getPendingTransferListByUser(sd);
          io.to(sd.id).emit(emitKey, listChat);
        }
      }
    }
  }
};

const endChat = async (io, socket, data) => {
  let sender = socket.request.session.user;
  let chatId = data.chatId;
  let roomId = "";
  // Check if room exists
  let getMessages = await getMessagesByChatId(chatId);
  if (!getMessages.room) {
    console.error("Send Message Error: empty keys. Room not found");
    return {
      data: data,
      message: `Failed to send message. Room ${chatId} not found.`,
    };
  }

  // Add info whose end the chat, client/agent
  // add client email/identifier to bubblechat [0]
  // add agent id to bubblechat [0]
  // add type, chat_end_by: agent/client

  roomId = getMessages.room;
  let ongoingRoomMembersKey = `${roomId}:members`;
  let pendingChatTransferMemberKey = `${roomId}:pending_transfer_members`; // rooms only contains agent id
  let unixtime = getCurrentDateTime("unix");

  // Add resolve chat (room id) to company's resolve chats list
  let companySlug = roomId.split(":")[1];
  let companyResolveChatRoom = `company:${companySlug}:resolve_chats`;
  await redisClient.zadd(companyResolveChatRoom, unixtime, roomId);

  // Add resolve chat (room id) to agents' resolve chats list
  let roomMembers = null;
  roomMembers = await redisClient.zrange(pendingChatTransferMemberKey, 0, -1); // Get agents from "pending transfer room members"
  if (!roomMembers) {
    roomMembers = await redisClient.zrange(ongoingRoomMembersKey, 0, -1); // Get agents from "on going room members"
  }

  if (roomMembers && roomMembers.length > 0) {
    for (let [idx, item] of roomMembers.entries()) {
      let agentResolveChatRoom = `user:${item}:resolve_chats`;
      await redisClient.zadd(agentResolveChatRoom, unixtime, roomId);

      // Delete room id from on going list
      let agentRooms = `user:${item}:rooms`;
      await redisClient.zrem(agentRooms, roomId);
    }
  }

  // Client's data
  let clientIdentifier = await redisClient.zrange(ongoingRoomMembersKey, 0, 0); // return object
  let clientRoom = null;
  let clientResolveRoom = null;
  if (clientIdentifier && clientIdentifier.length > 0) {
    // set client identifier
    // if livechat, user email
    // if telegram/whatsapp, user phone
    clientRoom = `client:${clientIdentifier[0]}:rooms`;
    clientResolveRoom = `client:${clientIdentifier[0]}:resolve_chats`;
    await redisClient.del(clientRoom); // Delete room id from client's on going list
    await redisClient.zadd(clientResolveRoom, unixtime, roomId); // Add room id to client's resolve list
  }

  // UPDATE STATUS
  // Set status to resolve
  let updateFirstMessageData = getMessages.chat_reply[0];
  updateFirstMessageData.status = 9;
  await redisClient.call(
    "JSON.SET",
    roomId,
    "[0]",
    JSON.stringify(updateFirstMessageData)
  );

  /** Emit to FE */
  let resultMessage = {
    success: true,
    message: `Chat ${chatId} has resolved successfully!`,
  };

  let socketInPTRoomMember = await io
    .in(pendingChatTransferMemberKey)
    .fetchSockets();
  if (socketInPTRoomMember) {
    for (let [index, sd] of socketInPTRoomMember.entries()) {
      if (sd.data.user) {
        // Emit data to each agent
        // Emit resolve chat
        let listResolve = await getResolveListByUser(sd);
        io.to(sd.id).emit("chat.resolve", listResolve);

        // Emit on going to only "last handled by agent"
        if (sender.id == sd.data.user.id) {
          let ongoingList = await getOngoingListByUser(sd);
          io.to(sd.id).emit("chat.ongoing", ongoingList);
          io.to(sd.id).emit("chat.endresult", resultMessage);
        }

        // Remove "transfer_socket_room" from each agent
        // So, agent will not listen to room again even if agent refresh page
        let agentPTSocketRoomKey = `user:${sd.data.user.id}:pending_transfer_socket_room`;
        let deletePTSocketRoomFromAgent = await redisClient.zrem(
          agentPTSocketRoomKey,
          pendingChatTransferMemberKey
        );
      }
    }
  }

  // Emit to client's resolve chat
  let socketInOngoingRoomMember = await io.in(roomId).fetchSockets();
  if (socketInOngoingRoomMember) {
    for (let [index, sd] of socketInOngoingRoomMember.entries()) {
      if (!sd.data.user.id) {
        io.to(sd.id).emit("client.chat.endresult", resultMessage);
        break;
      }
    }
  }

  // Take out (leave) agent and user from room id
  io.in(roomId).socketsLeave(roomId);

  // Remove key
  await redisClient.del(pendingChatTransferMemberKey);
  await redisClient.del(`${roomId}:members`);

  return resultMessage;
};

/**
 * Transfer Chat
 *
 * - Transfer a chat from agent to agent
 * - Transfer a chat from agent to department
 *
 * @param {*} io
 * @param {*} socket
 * @param {*} data
 * @returns
 */
const transferChat = async (io, socket, data) => {
  let initiator = socket.request.session.user;
  let chatId = data.chatId;
  let roomId = null;
  let requestResult = null;

  // Check if room exists
  let getMessages = await getMessagesByChatId(chatId);
  if (!getMessages.room) {
    console.error("Transfer chat error: empty keys. Room not found");

    requestResult = errorResponseFormat(
      data,
      `Failed to transfer chat. Room ${chatId} not found.`
    );
    socket.emit("chat.transferresult", requestResult);
    return requestResult;
  }

  // Check Transfer Destination
  let checkDestination = await checkTransferDestination(io, socket, data);
  if(!checkDestination.success) {
    return checkDestination
  }

  roomId = getMessages.room;
  let previousAgentOngoingRoomKey = `user:${initiator.id}:rooms`;
  let ongoingRoomMembersKey = `${roomId}:members`;
  let pendingChatTransferMemberKey = `${roomId}:pending_transfer_members`;
  let unixtime = getCurrentDateTime("unix");

  // Get Assigned Agent Socket
  let assignedAgentSocket = [];
  let mySockets = null;
  let agentPTSocketRoom = `user:${data.toAgent}:pending_transfer_chat_room`;
  let departmentPTSocketRoom = `company:${initiator.company_name}:dept:${data.toDepartment}:pending_transfer_chat_room`;
  // TRANSFER TO AGENT OR DEPARTMENT
  mySockets = data.toAgent
    ? await io.in(agentPTSocketRoom).fetchSockets()
    : await io.in(departmentPTSocketRoom).fetchSockets();
  if (!mySockets || mySockets.length <= 0) {
    requestResult = errorResponseFormat(
      null,
      "Failed to transfer chat. Agent or Department is not online."
    );
    socket.emit("chat.transferresult", requestResult);
    return requestResult
  }

  for (let [index, sd] of mySockets.entries()) {
    assignedAgentSocket[index] = sd;
  }

  // Add assigned agent to "chat id's pending transfer member"
  let handledBy = []; // Chat is handled by which agents
  let assignedRoomKey = null; // WHETRHER CHAT WILL BE TRANSFERRED TO AGENT OR DEPARTMENT ROOM
  if (data.toAgent) {
    // TRANSFER TO AGENT

    handledBy.push(getCurrentDateTime("unix"), data.toAgent);

    // Save all "handled by agents" to "chat id's pending transfer member"
    const addToPTRoom = await redisClient.zadd(
      pendingChatTransferMemberKey,
      handledBy
    );

    // Add assigned agent to "self's pending transfer room"
    const agentPTRoomKey = `user:${data.toAgent}:pending_transfer_chats`;
    assignedRoomKey = agentPTRoomKey;
  } else {
    // TRANSFER TO DEPARTMENT

    // Add assigned agent to "company department's pending transfer room"
    const departmentPTRoomKey = `company:${initiator.company_name}:dept:${data.toDepartment}:pending_transfer_chats`;
    assignedRoomKey = departmentPTRoomKey;
  }

  // Save to redis
  const addToDepartmentPTRoom = await redisClient.zadd(
    assignedRoomKey,
    unixtime,
    roomId
  );

  // if addToPTRoom and addToAgentPTRoom is success
  // Remove previous agent from on going room
  // if(addToPTRoom && addToAgentPTRoom) {
  await redisClient.zrem(ongoingRoomMembersKey, initiator.id); // Remove previous agent from "on going room members"
  await redisClient.zrem(previousAgentOngoingRoomKey, roomId); // Remove the room from "previous agent's on going room"
  io.in(socket.id).socketsLeave(roomId); // Leave previous agent socket from room id
  // }

  // UPDATE STATUS
  // UPDATE DEPARTMENT NAME
  // Set status to pending transfer
  let updateFirstMessageData = getMessages.chat_reply[0];
  updateFirstMessageData.status = 2;

  if (data.toAgent && assignedAgentSocket[0]) {
    if (
      updateFirstMessageData.department_name !=
      assignedAgentSocket[0].data.user.department_name
    )
      updateFirstMessageData.department_name =
        assignedAgentSocket[0].data.user.department_name;
  } else {
    updateFirstMessageData.department_name = data.toDepartment;
  }
  await redisClient.call(
    "JSON.SET",
    roomId,
    "[0]",
    JSON.stringify(updateFirstMessageData)
  );

  /** Emit to FE */

  // TRANSFER TO AGENT
  if (data.toAgent) {
    // Emit only to "agent's pending transfer room"
    let pendingTransferList = await getPendingTransferListByUser(
      assignedAgentSocket[0]
    );
    io.to(agentPTSocketRoom).emit("chat.pendingtransfer", pendingTransferList);
  } else {
    // TRANSFER TO DEPARTMENT

    // Emit only to agents in "company department pending transfer room"
    for ([index, agentSd] of assignedAgentSocket.entries()) {
      console.log("agentSd", agentSd);
      let pendingTransferList = await getPendingTransferListByUser(agentSd);
      io.to(agentSd.id).emit("chat.pendingtransfer", pendingTransferList);
    }
  }

  // Emit to previous agent
  let previousAgentSocketId = socket.id;
  let previousAgentOngoingList = await getOngoingListByUser(socket);
  io.to(previousAgentSocketId).emit("chat.ongoing", previousAgentOngoingList);

  socket.emit("chat.transferresult", successResponseFormat());
  return successResponseFormat();
};

const checkTransferDestination = async (io, socket, data) => {
  let initiator = socket.request.session.user;
  // TRANSFER TO AGENT
  if (data.toAgent) {
    // Check if agents is present and not assign to self
    if (data.toAgent == initiator.id) {
      requestResult = errorResponseFormat(
        null,
        "Failed to transfer chat. Can not assign to self."
      );
      socket.emit("chat.transferresult", requestResult);
      return requestResult;
    }

    let existingAgentKey = await redisClient.keys(`user:${data.toAgent}`);
    if (existingAgentKey.length <= 0) {
      requestResult = errorResponseFormat(
        null,
        "Failed to transfer chat. Assigned agent is not found."
      );
      socket.emit("chat.transferresult", requestResult);
      return requestResult;
    }
  } else {
    // TRANSFER TO DEPARTMENT

    // Check if department is present and not assign to current department
    if (data.toDepartment == initiator.department_name) {
      requestResult = errorResponseFormat(
        null,
        "Failed to transfer chat. Can not assign to current department."
      );
      socket.emit("chat.transferresult", requestResult);
      return requestResult;
    }

    let existingDepartmentKey = await redisClient.keys(
      `company:${initiator.company_name}:dept:${data.toDepartment}:users`
    );
    if (existingDepartmentKey.length <= 0) {
      requestResult = errorResponseFormat(
        null,
        "Failed to transfer chat. Department is not found/no online users."
      );
      socket.emit("chat.transferresult", requestResult);
      return requestResult;
    }
  }

  return successResponseFormat();
};

module.exports = {
  endChat,
  getAllChatList,
  getClientDetailByChatId,
  getClientOngoingChat,
  getClientResolveList,
  getMessagesByChatId,
  getOngoingListByUser,
  getPendingListByRoomKey,
  getPendingListByUser,
  getPendingTransferListByUser,
  sendMessage,
  transferChat,
};

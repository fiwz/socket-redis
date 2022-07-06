$(() => {
  const socket = io('http://localhost:4000', {
    withCredentials: true,
    autoConnect: true,
    allowEIO3: false,
  });

  /**
   * Chatvolution V2 starts here
   */

  /** Auth */
  /**
   * Login as Agent (User)
   *
   * User data is from V1 when connect to socket
   */
  $('#btn-login').click(function () {
    let dataAuth = {
      agent_id: '49',
      avatar:
        'http://localhost:8000/storage/assets/images/uploads/gravatar/agent-qwords-49.png',
      company_name: 'Gina Company',
      department_name: 'Developer',
      email_agent: 'agent@qwords.co.id',
      id_company: '10',
      id_department: '11',
      last_action: null,
      module: 'is_dashboard',
      name_agent: 'Agent Qwords',
      permission_name: 'Agent',
      phone_agent: 'null',
      roles_id: '4',
      status: 'online',
      token:
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiYjRjMGRkZTBlYmRlNTczMzQ4MzU0MmNlYmQ0ZjQwOTk1YWZlOGFmZjExNTc5ZjZjZmZhODkzYTJlOGQwYjE0OThkNjBlYmM4YmU0OWRiZDciLCJpYXQiOjE2NTU5NjAyODYuOTMyMjQ2LCJuYmYiOjE2NTU5NjAyODYuOTMyMjUsImV4cCI6MTY4NzQ5NjI4Ni45MjMxOTYsInN1YiI6IjQ5Iiwic2NvcGVzIjpbXX0.QMJreS6iCrX3unIbMEw3evhyRQrJjFvfi2a-QD9ePsunDoaV0ZkKzCBizSuKAgMSbGVgoeLzsAbAcJYOx4DfTKIXP0nd-fFYH4vqDpXeCHSxX23oG9_-zMDKpvWx-AeOgm8ASV9lTG2vwIrPaAA1ygfy7OaW5-eu8PtckbDMoAyWwKupAPKXlsJzFyEO_ZU3kvj8Pss9F2MkrjZZjE8y1BmcVuhtezoiD45vZTdbbdiFet1YX3Q-JeyhXHrSaeX-MMsqKHW4B_PsEQF5UaCWbnL8IjXF2xxOtLWw3_CwdXkrZtwoev1nuNwEnYpTkCtEunIsxL6aofE32WHgQaxHk23N_Czqsd91SCK4iAa05pmWLKsYEO7m-MgAbEaIj7hiIXb_EqZTxj5ezqOoNbh-9toJUPUO0eZvNzeJTa49Fdbirr1RE6PfGnY39hvETIdgQVeBKpgC3YYC0wHiP77E2FB19_SqW5CRNTTcxq-M1TFSAFL4Jh_eEaqKryXHhdc2zewAoRT7quz29HqJUygNqzhdqxRWhOgIqqE6FLZFU758SqhMeEHgHSqyQpZE2iB_pAcBvOFcNzUEPMoobMsRVf2p6Bi_ewHLSAYjAeeBFdUUC5keXG2CBSpKEEKAxigeMR9GAlz7W7be-8J2CArlFoi08RSfQWNggPjFVHNEets',
      type_user: 'agent',
      uuid: '5aeb48dd-5e53-11ec-93e9-e0d55e1b6010',
    };

    let dataAuth2 = {
      agent_id: '75',
      avatar:
        'http://localhost:8000/storage/assets/images/uploads/gravatar/agent-finance-1-75.png',
      company_name: 'Gina Company',
      department_name: 'Finance',
      email_agent: 'agentfinance1@qwords.co.id',
      id_company: '10',
      id_department: '30',
      last_action: null,
      module: 'is_dashboard',
      name_agent: 'Agent Finance 1',
      permission_name: 'Agent',
      phone_agent: 'null',
      roles_id: '4',
      status: 'online',
      token:
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiZWYwMjVjZWViZmYwMmY2Mzc2YmMwYjg1NmUwMDEzYWFmZDNmZTI3MGRmYWIyZGQxNTFhNTYxNTRjNjcwYmVhYTlkNzhjNGZhMzkzOTI2YzYiLCJpYXQiOjE2NTU5NzQ5MzcuMTYwMjczLCJuYmYiOjE2NTU5NzQ5MzcuMTYwMjgzLCJleHAiOjE2ODc1MTA5MzcuMTQ0OTgxLCJzdWIiOiI3NSIsInNjb3BlcyI6W119.WYaFfA1Kh-3vYN8Ley4Fpcw2W3XgbcUWDAqajrs8Qi6lMRWiTMHoYoEpIt5EMd-B18_5R-hkEzUCN_aYHL4wwx1irZY-8jLG3ltYJ6PcdCayjizK3Ttu46pURT4wQSEO7554BLbOlmOw4d8xFvyu3FTYG4W4iQgr38KhINYTiQfl8K95k5mVOZejgrxNtz8eeeEHLBq17DNroK1Z0miDZe4y5BOlDqWIDoRbsEp3ISL9TcHUwYhZdHlzp98zg8RNPK2RvgdYOtq8rNvCvTCZ1Jo_JNURiRPUoQfby6V1Qg5KvmHE3OyeLFLfH0_aI526mcGIAgLbUYnxhY9gcEu04yOoAEyrqXqqNwEiv5FtzxSR5fuNnj2EUHbB_bRkQ7Eu704DWstzuNxdccS55gKpVFF5x1tw2FSes1fnBg08w1lmAdP7mUuo0Mt7MNvf5dpVjz7IzIxQCxxZ-rI5boMA_hYtfFZmpuBop2t2AmBjlGlwaJ2XZnrBpP8DWbstgjvlLJXmKOdxax6rkZUqJSszm4W5biewCHwwuVDLE3z4kB87szCRBk_3f7ip4pVctPQ0rDny97NaOUbpE5clSi68rPqgrD9PVAU28Ho7jsLEKmUG3sEfS9cT5ojvWmiiz2ajxC6GK7AMGuyXMouEDt1SNv-1e2W3Ve5hLyNTZEAYMyE',
      type_user: 'agent',
      uuid: '3353f742-6eab-11ec-a9f4-e0d55e1b6010',
    };

    // With fetch
    const response = fetch('http://localhost:4000/login?name=Bobi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataAuth),
      credentials: 'include',
    }).then((response) => {
      console.log('response login client', response);
      socket.connect();
      socket.emit('reload');
    });
  });

  /**
   * Login as Client and Send Message
   *
   * API is used for stored client session
   * socket.emit 'chat.new' is for send message and join client to chat room
   */
  $('#btn-loginclient').click(function () {
    const allData = {
      name: $.trim($('#client-name').val()),
      email: $.trim($('#client-email').val()),
      company_name: $.trim($('#company-name').val()),
      department_name: $.trim($('#department-name').val()),
      topic_name: $.trim($('#topic-name').val()),
      message: $.trim($('#message-content').val()),
    };

    axios
      .post('http://localhost:4000/login-client', JSON.stringify(allData), {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
        // other configuration there
      })
      .then(function (response) {
        console.log('Login client response: ', response.data);
        showLoginInfo();

        // emit after success
        socket.emit('chat.new', allData);

        // remove left side list
        $('#pending').parent().remove();

        // refresh page to see changes
      })
      .catch(function (error) {
        alert('oops');
        console.log(error);
      });
  });

  function showLoginInfo() {
    fetch('http://localhost:4000/login-info', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    }).then(async (response) => {
      response = await response.json();
      if (response.data) {
        if (!response.data.id) {
          $('.login-client-info ul').html('');
          $('.login-client-info ul').append(`
                    <li>Email: ${response.data.email}</li>
                `);

          $('.login-client-info').removeClass('d-none');
          $('.login-client-info').addClass('d-block');
        } else {
          console.log('di else');
          $('.login-info ul').html('');
          $('.login-info ul').append(`
                    <li>ID: ${response.data.id}</li>
                    <li>Email: ${response.data.email}</li>
                    <li>Company Name: ${response.data.company_name}</li>
                    <li>Dept: ${response.data.department_name}</li>
                `);

          $('.login-info').removeClass('d-none');
          $('.login-info').addClass('d-block');
        }
      }
    });
  }
  showLoginInfo(); // Show Login Info on Reload

  // Logout
  $('#btn-logout, #btn-logout-client').click(function () {
    fetch('http://localhost:4000/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
      .then(async (response) => {
        response = await response.json();
        alert(response.message);
        $('.login-info ul, .login-client-info ul').html('');
        $('.login-info, .login-client-info').removeClass('d-block');
        $('.login-info, .login-client-info').addClass('d-none');
      })
      .catch((err) => {
        console.error(err);
      });
  });

  /**
   * Agent Ambil Chat
   *
   * (Join Room)
   * Only for agent(user)
   * Ambil chat dari pending list dan memindahkannya ke on going
   */
  $(document).on('click', '#my-chats #pending ul li', function (e) {
    let elementId = $(this).attr('id');
    let chatId = elementId;
    if (elementId.search(':') != -1) {
      let roomArr = elementId.split(':');
      chatId = roomArr.pop();
    }

    axios
      .get(`http://localhost:4000/chat-details/${chatId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
        // other configuration there
      })
      .then(function (response) {
        console.log('klik di pending', response);
        let message = response.data.data;

        $('#fetch-message').html('');
        if (message.chat_reply) {
          message.chat_reply.forEach((chat, idx) => {
            $('#fetch-message').append(`
                    <div style='margin-bottom: 8px;'>
                        <p style='margin: 0px;'>${
                          chat.agent_name ? chat.agent_name : chat.from
                        }</p>
                        <p style='margin: 0px;'>${chat.message}</p>
                        <small>${chat.formatted_date}</small>
                    </div
                `);
          });
        }

        // join room if chat is in pending chat tab
        socket.emit('room.join', chatId);

        // remove chat id from list
        $(this).remove();

        // set input reply value
        $('#chat-id').val(chatId);
      })
      .catch(function (error) {
        alert('oops');
        console.log(error);
      });
  });

  /**
   * On Click in List On Going
   *
   * Show bubbles/chat detail
   */
  $(document).on('click', '#my-chats #ongoing ul li', function (e) {
    let elementId = $(this).attr('id');
    let chatId = elementId;
    if (elementId.search(':') != -1) {
      let roomArr = elementId.split(':');
      chatId = roomArr.pop();
    }

    $.get(`/chat-details/${chatId}`, function (response) {
      let message = response.data;
      $('#fetch-message').html('');
      if (message.chat_reply) {
        message.chat_reply.forEach((chat, idx) => {
          $('#fetch-message').append(`
                    <div style='margin-bottom: 8px;'>
                        <p style='margin: 0px;'>${
                          chat.agent_name ? chat.agent_name : chat.from
                        }</p>
                        <p style='margin: 0px;'>${chat.message}</p>
                        <small>${chat.formatted_date}</small>
                    </div
                `);
        });

        // set input reply value
        $('#chat-id').val(message.chat_id);
      }
    });
  });

  $(document).on('click', '#my-chats #resolve ul li', function (e) {
    let elementId = $(this).attr('id');
    let chatId = elementId;
    if (elementId.search(':') != -1) {
      let roomArr = elementId.split(':');
      chatId = roomArr.pop();
    }

    $.get(`/chat-details/${chatId}`, function (response) {
      let message = response.data;
      $('#fetch-message').html('');
      if (message.chat_reply) {
        message.chat_reply.forEach((chat, idx) => {
          $('#fetch-message').append(`
                    <div style='margin-bottom: 8px;'>
                        <p style='margin: 0px;'>${
                          chat.agent_name ? chat.agent_name : chat.from
                        }</p>
                        <p style='margin: 0px;'>${chat.message}</p>
                        <small>${chat.formatted_date}</small>
                    </div
                `);
        });
      }
    });
  });

  /**
   * Send Message
   *
   * Step:
   * - Choose one of chat from on going list
   * - System will show chat details and a form
   */
  $(document).on('click', '#btn-send-message', function (e) {
    let elementId = $('#chat-id').val();
    let chatId = elementId;
    if (elementId.search(':') != -1) {
      let roomArr = elementId.split(':');
      chatId = roomArr.pop();
    }

    socket.emit('message', {
      message: $('#message-reply').val(),
      chatId: chatId,
    });
  });

  $(document).on('click', '#btn-close-chat', function (e) {
    let elementId = $('#chat-id').val();
    let chatId = elementId;
    if (elementId.search(':') != -1) {
      let roomArr = elementId.split(':');
      chatId = roomArr.pop();
    }

    socket.emit('chat.end', {
      chatId: chatId,
    });
  });

  // Get and request all data
  // $('#btn-example').click(function() {
  socket.emit('allData');
  // })

  /** Socket */

  /**
   * Old code but needed
   * Do not remove
   */
  // socket.on('send', function(data) {
  //     console.log('socket message in client', data)
  //     var username = data.username;
  //     var message = data.message;
  //     var html = "<div class='msg'><div class='user'>" + username + "</div><div class='txt'>" + message + "</div></div>";
  //     $('#messages').append(html);
  // });

  // socket.on('count_chatters', function(data) {
  //     console.log('chatters count', data)
  //     $('.chat-info').text("There are currently " + data.numberOfChatters + " people in the chat room");
  //     $("#chat-member ul").html("")
  //     data.member_joined.forEach(member => {
  //         console.log('member', member)
  //         $("#chat-member ul").append(`<li>${member}</li>`);
  //     })
  // });

  /**
   * Socket listening event starts here
   */

  /**
   * Pending Chat
   *
   * Only for agent
   * Listening if there is new chat from client
   */
  socket.on('chat.pending', (message) => {
    console.log('new pending msg', message);

    $('#my-chats #pending ul').html('');
    for (let [index, chat] of message.entries()) {
      $('#my-chats #pending ul').append(
        `<li class="list-group-item" id="${chat.chat_id}" >${chat.chat_id}</li>`
      );
    }
  });

  /**
   * On Going Chat
   *
   * Only for agent
   * Listening if there is new on going list
   */
  socket.on('chat.ongoing', (message) => {
    // Reset on going list
    if (message.ongoing) {
      $('#my-chats #ongoing ul').html('');
      for (let [index, chat] of message.ongoing.entries()) {
        $('#my-chats #ongoing ul').append(
          `<li class="list-group-item" id="${chat.chat_id}" >${chat.chat_id}</li>`
        );
      }
    }

    // Reset pending list
    if (message.pending) {
      $('#my-chats #pending ul').html('');
      for (let [index, chat] of message.pending.entries()) {
        $('#my-chats #pending ul').append(
          `<li class="list-group-item" id="${chat.chat_id}" >${chat.chat_id}</li>`
        );
      }
    }
  });

  socket.on('chat.resolve', (message) => {
    // Reset on going list
    if (message.ongoing) {
      $('#my-chats #ongoing ul').html('');
      for (let [index, chat] of message.ongoing.entries()) {
        $('#my-chats #ongoing ul').append(
          `<li class="list-group-item" id="${chat.chat_id}" >${chat.chat_id}</li>`
        );
      }
    }

    // Reset resolve list
    if (message.resolve) {
      $('#my-chats #resolve ul').html('');
      for (let [index, chat] of message.resolve.entries()) {
        $('#my-chats #resolve ul').append(
          `<li class="list-group-item" id="${chat.chat_id}" >${chat.chat_id}</li>`
        );
      }
    }
  });

  /**
   * Show Room
   *
   * Use together with socket.on("message")
   *
   * Listen if there is new message to a chat room
   * Use this for flagging unread data in list chat
   * and show bubble chat when agent is opening the same chat detail
   */
  socket.on('show.room', (data) => {
    console.log('socket on show room: (Please open this chat)', data);
  });

  /**
   * Incoming Message
   *
   * Listen when there is message from agent/client
   * Recommend to use this for rendering bubble chat
   */
  socket.on('message', (message) => {
    $('#fetch-message').append(`
        <div style='margin-bottom: 8px;'>
            <p style='margin: 0px;'>${
              message.agent_name ? message.agent_name : message.from
            }</p>
            <p style='margin: 0px;'>${message.message}</p>
            <small>${message.formatted_date}</small>
        </div
    `);
  });

  /**
   * Get all data
   *
   * Get all chat data in dashboard agent
   * (Try to refresh your browser!)
   */
  socket.on('chat.onrefresh', (message) => {
    console.log('chat chatlist on refresh result:', message);

    // pending
    $('#my-chats #pending ul').html('');
    if (message.pending) {
      message.pending.forEach((chat, idx) => {
        $('#my-chats #pending ul').append(
          `<li class="list-group-item" id="${chat.chat_id}" >${chat.chat_id}</li>`
        );
      });
    }

    // on going
    $('#my-chats #ongoing ul').html('');
    if (message.ongoing) {
      message.ongoing.forEach((chat, idx) => {
        $('#my-chats #ongoing ul').append(
          `<li class="list-group-item" id="${chat.chat_id}" >${chat.chat_id}</li>`
        );
      });
    }

    // resolve
    $('#my-chats #resolve ul').html('');
    if (message.resolve) {
      message.resolve.forEach((chat, idx) => {
        $('#my-chats #resolve ul').append(
          `<li class="list-group-item" id="${chat.chat_id}" >${chat.chat_id}</li>`
        );
      });
    }

    // online agents
    // code...
    console.log('Online users in my company: ', message.online_users);
  });

  /**
   * New online agent (user)
   *
   * Listen if there is logged in user
   */
  socket.on('users.online', (data) => {
    console.log('Listen to users.online', data);
  });

  /**
   * Offline agent (user)
   *
   * Listen if there is logged out user
   */
  // code...
  socket.on('users.offline', (data) => {
    console.log(
      '(Listen to users.offline) A user has been offline, remaining users: ',
      data
    );
  });

  /** Client Area */
  /**
   * Get All data in client area
   */
  socket.on('client.chat.onrefresh', (message) => {
    console.log('CLIENT chat on refresh result:', message);

    $('#fetch-message').html('');
    if (message.chat_reply) {
      message.chat_reply.forEach((chat, idx) => {
        $('#fetch-message').append(`
                <div style='margin-bottom: 8px;'>
                    <p style='margin: 0px;'>${
                      chat.agent_name ? chat.agent_name : chat.from
                    }</p>
                    <p style='margin: 0px;'>${chat.message}</p>
                    <small>${chat.formatted_date}</small>
                </div
            `);
      });

      // set input reply value
      $('#chat-id').val(message.chat_id);

      $('#pending').parent().remove();
    }
  });
});

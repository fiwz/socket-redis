$(() => {
  const BASE_URL = 'http://localhost:4001'
  const socket = io(BASE_URL, {
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

    let dataAuth3 = {
      agent_id: '76',
      avatar:
        'http://localhost:8000/storage/assets/images/uploads/gravatar/agent-finance-2-76.png',
      company_name: 'Gina Company',
      department_name: 'Finance',
      email_agent: 'agentfinance2@qwords.co.id',
      id_company: '10',
      id_department: '30',
      last_action: null,
      module: 'is_dashboard',
      name_agent: 'Agent Finance 2',
      permission_name: 'Agent',
      phone_agent: 'null',
      roles_id: '4',
      status: 'online',
      token:
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNTZkNmY5OGVlMWY2ZDVmMGIxNzE5NjNjNDJjMDZiYThiNDgyYzJjM2I2NmU3YWQ4Y2YzMTQyNDQ0NTcyNDk4MjI0MGYxMzAyNmNjNGU0NjAiLCJpYXQiOjE2NTc2MDkyODAuNzU1MzE2LCJuYmYiOjE2NTc2MDkyODAuNzU1MzMzLCJleHAiOjE2ODkxNDUyODAuNzM1OTY5LCJzdWIiOiI3NiIsInNjb3BlcyI6W119.I6ZXpdfI-4wMNc0I_TaQTVeE5d0GOjkSnHnU4uPfP7_LmdwOGdyYxQ-xeAL5vncpf8PtcYeII6uZEAKX80AkZUmDZkeeoWKiNIZWCf1I9XPOBNb5FbJ6M9qqkc_XIz4wSYcedivEH9zglHaUV9RJZwwiGf46YO4F6YaGxwh2jZlyQHsj_PD5bmmh0tcaPyGOkiNEDNJ2hwj-dyh-U2y6Z5JTn8XQsjpeUVhiA0CGgmd5jUpg0To-oWyUSY9nU-FSQ0AMhVaie3Wyci5eqCkVMaOh3XFtig0gTcDI_4zRMIy8r7q_H940Ih-ndcjXQAFot8-0Aq5pyM1vYi_GfpV7T9Rb7WwW2YPLzDQqOOr9pL66nePq210Rzcs7-DKZpyQ5RlO02S1jjuNsN8lDVBj5rOjKtrPxic20Mh4HnvC0D_yc46N6k8E86VnsPdSxAMUljRyOYUGy9-ANPIh92hT4XLfeZEoQEYlrGrupa_SW79RY49n9IHXQeMHv2-5pOtFNWyKY_tPHXZbPYhqhntH38o6xFlffxjcl1gXzkLPyjig2v2trJqp9CC9niYXuDpeKBKaukWPUxsLRwFkEkpVzsLmMyqeK7EMt4D2CEnxeux2pk1PqZ9ljUhya2lDZNGEb0Eum4YGKhLAK4yUcEbNJZpl74cgxSFK9uJp5mrfYn6s',
      type_user: 'agent',
      uuid: '3b1d27cd-6eab-11ec-a9f4-e0d55e1b6010',
    };

    let dataAuthCompany = {
        agent_id: 10,
        avatar: 'http://localhost:8000/storage/assets/images/uploads/gravatar/gina-dwitasari-10.png',
        company_name: 'Gina Company',
        department_name: null,
        email_agent: 'gina@qwords.co.id',
        id_company: null,
        id_department: null,
        name_agent: 'Gina Dwitasari',
        permission_name: 'Company',
        phone_agent: null,
        roles_id: 2,
        status: 'online',
        token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiOTU4MGRmNDNlNDExZjIzZmFjZTJkZTFiNDEwMjI2MmQ5ZDE1YjFkNTUxMWM1NWI5ZjhlOTIwNTY0OTM4NmQyOGNkZTAxYzZmMjMxYmRmNTgiLCJpYXQiOjE2NTgxMTgyNDUuNTMyMzExLCJuYmYiOjE2NTgxMTgyNDUuNTMyMzE0LCJleHAiOjE2ODk2NTQyNDUuNTIwNywic3ViIjoiMTAiLCJzY29wZXMiOltdfQ.nnXjB-F-2Qt64nyoffH7vvbA4hs9Up9VgMrIrIkfXOn7EOasH3ah7NAlqpa3RPy3KgsSicohhYLbn-oRw3v5Fyt8kxF5NOINFASplzIR32_dEutGZl_gs3n6YPUS0ko-FN_k1n9cQGYkr6KKN5GJzGcTgdOhiq_zP5T5Rt6d_DNTkCDtkk-G6gjRje6gtfBDJ4d6GUBA38wDqaneDbxswhEE6fy96jiL1GmNZRPN41X7gfv3VFfGY3j5QjwcjT0lAuHySdpvlVsGs4JocO1KossT1MBfnw0MTGSTPBzKgt6ZyNezy89H0Lc0gZLl0aLY0Kw4SBDcvIlKrbrcw-jvKylYj6C24Il5ZSndVKIVnXvdGiJPAQ6BuuAL7GmQ1cLBtR7zu2dX9fWz5N99jn6PtQnwV1HUEvx3kIlki_aWAX_DWyOO8DvCmTwnCpr_Hk22dako7VKumkCkgRTloNFGeiod52eyVh2JtGc2CJSl9EM9j99rMqykpn9tiPchpHhiN1pAk4quR-dTK3aWq9hpvi5f7JkFtvcTnjHTrTVY2i689MJvWF-K3rweVCsAjYlHqaEJOadsSbmN7N9kG-6zg93Te723qs_h2wIsKfLfA2prn-lM35JX_Jq_fIchlSjoOtzOt_PqvtjMa0u1QRVw2ugVCTpRTYDSdosEzCf_gHQ',
        type_user: 'company',
        uuid: '5aeb4748-5e53-11ec-93e9-e0d55e1b6010',
    }

    // With fetch
    const response = fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataAuthCompadany),
      credentials: 'include',
    }).then((response) => {
      console.log('Login as agent response: ', response);
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
      .post(`${BASE_URL}/login-client`, JSON.stringify(allData), {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
        // other configuration there
      })
      .then(function (response) {
        console.log('Login as client response: ', response.data);
        showLoginInfo();

        setTimeout(() => {
          socket.connect();
          socket.emit('reload');

          // emit after success
          socket.emit('chat.new', allData);

          // remove left side list
          $('#pending').parent().remove();

          $('#client-resolve').removeClass('d-none');
          $('#client-resolve').addClass('d-block');
        }, 3000);

        // refresh page to see changes
      })
      .catch(function (error) {
        alert('oops');
        console.error(error);
      });
  });

  function showLoginInfo() {
    fetch(`${BASE_URL}/login-info`, {
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
    fetch(`${BASE_URL}/logout`, {
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
  $(document).on(
    'click',
    '#my-chats #pending ul li, #my-chats #pendingtransfer ul li',
    function (e) {
      let elementId = $(this).attr('id');
      let chatId = elementId;
      if (elementId.search(':') != -1) {
        let roomArr = elementId.split(':');
        chatId = roomArr.pop();
      }

      axios
        .get(`${BASE_URL}/chat-details/${chatId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
          // other configuration there
        })
        .then(function (response) {
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
          console.error(error);
        });
    }
  );

  /**
   * On Click in List On Going
   * On Click in List Resolve
   * On Click in List Resolve in Client
   *
   * Show bubbles/chat detail
   */
  $(document).on(
    'click',
    '#my-chats #ongoing ul li, #my-chats #resolve ul li, #client-resolve ul li',
    function (e) {
      let elementId = $(this).attr('id');
      let chatId = elementId;
      if (elementId.search(':') != -1) {
        let roomArr = elementId.split(':');
        chatId = roomArr.pop();
      }

      axios
        .get(`${BASE_URL}/chat-details/${chatId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
          // other configuration there
        })
        .then(function (response) {
          let message = response.data.data;
          console.log('API GET chat-details/chatId', message);

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
        })
        .catch(function (error) {
          alert('oops');
          console.error(error);
        });

      axios
        .get(`${BASE_URL}/client-details/${chatId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
          // other configuration there
        })
        .then(function (response) {
          let clientData = response.data.data;
          console.log('API GET client-details/chatId', clientData);
        })
        .catch(function (error) {
          alert('oops');
          console.error(error);
        });
    }
  );

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

  $(document).on('click', '.btn-transfer-chat', function (e) {
    console.log('transfer chat to agent');
    let data = {
      chatId: $('.transfer-chat-id').val(),
      toAgent: $('.transfer-to-agent').val(),
    };

    socket.emit('chat.transfer', data);
  });

  $(document).on('click', '.btn-transfer-chat-department', function (e) {
    let data = {
      chatId: $('.transfer-department-chat-id').val(),
      toDepartment: $('.transfer-department-slug').val(),
    };

    console.log('transfer chat to department', data);

    socket.emit('chat.transfer', data);
  });

  // Get and request all data
  // $('#btn-example').click(function() {
  socket.emit('allData');
  // })

  /**
   * Socket listening event starts here
   */

  /**
   * Result of Agent Join Room
   */
  socket.on('room.joinresult', (message) => {
    console.log('Listen room.joinresult: ', message);
    alert('Listen room.joinresult: ', message);
  });

  /**
   * Pending Chat
   *
   * Only for agent
   * Listening if there is new chat from client
   */
  socket.on('chat.pending', (message) => {
    console.log('Listen pending msg', message);

    $('#my-chats #pending ul').html('');
    for (let [index, chat] of message.entries()) {
      $('#my-chats #pending ul').append(
        `<li class="list-group-item" id="${chat.chat_id}" >${chat.user_name} (${chat.user_email})</li>`
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
    console.log('Listen ongoing msg', message);

    // Reset on going list
    if (message) {
      $('#my-chats #ongoing ul').html('');
      for (let [index, chat] of message.entries()) {
        $('#my-chats #ongoing ul').append(
          `<li class="list-group-item" id="${chat.chat_id}" >${chat.user_name} (${chat.user_email})</li>`
        );
      }
    }

    // Reset pending list
    // code...
  });

  /**
   * Resolve Chat
   *
   * Only for Agent
   * Listening if there is new resolve chat
   *
   */
  socket.on('chat.resolve', (message) => {
    console.log('Listen resolve msg', message);

    // Reset on going list
    // code...

    // Reset resolve list
    if (message) {
      $('#my-chats #resolve ul').html('');
      for (let [index, chat] of message.entries()) {
        $('#my-chats #resolve ul').append(
          `<li class="list-group-item" id="${chat.chat_id}" >${chat.user_name} (${chat.user_email})</li>`
        );
      }
    }
  });

  /**
   * Pending Transfer Chat
   *
   * Only for Agent
   * Listening if there is new pending transfer chat
   *
   */
  socket.on('chat.pendingtransfer', (message) => {
    console.log('Listen pending transfer msg', message);

    // Reset on going list
    // code...

    // Reset resolve list
    if (message) {
      $('#my-chats #pendingtransfer ul').html('');
      for (let [index, chat] of message.entries()) {
        $('#my-chats #pendingtransfer ul').append(
          `<li class="list-group-item" id="${chat.chat_id}" >${chat.user_name} (${chat.user_email})</li>`
        );
      }
    }
  });

  /**
   * End Chat Result
   *
   * Only for Agent
   * Listening if there is new resolve chat
   *
   */
  socket.on('chat.endresult', (message) => {
    console.log('Listen chat.endresult', message);
    alert(`Listen chat.endresult. ${message.message}`);
  });

  /**
   * Transfer Chat Result
   *
   * Only for Agent
   */
  socket.on('chat.transferresult', (message) => {
    console.log('Listen chat.transferresult', message);
    alert(`Listen chat.transferresult. ${message.message}`);
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
    if (!message.success) {
      return alert(message.message);
    }

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
  // socket.on('chat.onrefresh', (message) => {
  //   console.log('chat chatlist on refresh result:', message);

  //   // pending
  //   $('#my-chats #pending ul').html('');
  //   if (message.pending) {
  //     message.pending.forEach((chat, idx) => {
  //       $('#my-chats #pending ul').append(
  //         `<li class="list-group-item" id="${chat.chat_id}" >${chat.chat_id}</li>`
  //       );
  //     });
  //   }

  //   // on going
  //   $('#my-chats #ongoing ul').html('');
  //   if (message.ongoing) {
  //     message.ongoing.forEach((chat, idx) => {
  //       $('#my-chats #ongoing ul').append(
  //         `<li class="list-group-item" id="${chat.chat_id}" >${chat.chat_id}</li>`
  //       );
  //     });
  //   }

  //   // resolve
  //   $('#my-chats #resolve ul').html('');
  //   if (message.resolve) {
  //     message.resolve.forEach((chat, idx) => {
  //       $('#my-chats #resolve ul').append(
  //         `<li class="list-group-item" id="${chat.chat_id}" >${chat.chat_id}</li>`
  //       );
  //     });
  //   }

  //   // online agents
  //   // code...
  //   console.log('Online users in my company: ', message.online_users);
  // });

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
  socket.on('users.offline', (data) => {
    console.log(
      '(Listen to users.offline) A user has been offline, remaining users: ',
      data
    );
  });

  /**
   * Online departments
   *
   * Listen if there is logged in/logged out user
   */
  socket.on('departments.online', (data) => {
    console.log(
      '(Listen to departments.online) Current online departments: ',
      data
    );
  });

  $('.btn-show-department').click(() => {
    socket.emit('departments.online');
  });

    /**
     * Integrate Whatsapp Account
     */
    $('.btn-integrate-whatsapp').click(() => {
        const allData = {
            // token: $.trim($('.integrate-whatsapp-token').val()),
            inputPhone: $.trim($('.integrate-whatsapp-input-phone').val()),
        };
        socket.emit('integrate.whatsapp', allData);
    });

    socket.on('integrate.whatsappresult', (data) => {
        console.log('Listen to integrate.whatsappresult:', data);
    })

    socket.on('integrate.whatsapp.qr', (data) => {
        console.log('Listen to integrate.whatsapp.qr:', data);
    })

  /** Client Area */
  /**
   * Get All data in client area
   */
  socket.on('client.chat.ongoing', (message) => {
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
      $('#client-resolve').removeClass('d-none');
      $('#client-resolve').addClass('d-block');
    }
  });

  /**
   * Resolve chat/history for client
   */
  socket.on('client.chat.endresult', (message) => {
    console.log('CLIENT Listen client.chat.endresult:', message);
    alert(message.message);
  });

  /**
   * Resolve chat/history for client
   */
  socket.on('client.chat.resolve', (message) => {
    console.log('CLIENT Listen client.chat.resolve:', message);

    $('#client-resolve ul').html('');
    for (let [index, chat] of message.entries()) {
      $('#client-resolve ul').append(
        `<li class="list-group-item" id="${chat.chat_id}" >${chat.chat_id} <small>(${chat.formatted_date})</small></li>`
      );
    }

    $('#pending').parent().remove();
    $('#client-resolve').removeClass('d-none');
    $('#client-resolve').addClass('d-block');
  });
});

$(() => {
const socket = io('http://localhost:4000');
// const socket = io('http://localhost:4000/agents');
// const socket = io.connect('http://localhost:4000', {query: 'name=something'}, {auth: "{'foo':'bar'}" });

$.get('/get_chatters', function(response) {
    console.log('/get_chatters', response)
    $('.chat-info').text("There are currently " + response.data.numberOfChatters + " people in the chat room");

    $("#chat-member ul").html("")
    response.data.member_joined.forEach(member => {
        $("#chat-member ul").append(`<li>${member}</li>`);
    })
});

$.get('/A/chats/pending', function(response) {
    console.log('/A/chats/pending', response.data)
    for(let pd in response.data) {
        console.log('pdddddddd', response.data[pd])
        $("#my-chats #pending ul").append(`<li class="list-group-item" id="${response.data[pd]}" >${response.data[pd]}</li>`);
    }
});

$('#join-chat').click(function() {
    console.log('clicked join')

    var username = $.trim($('#username').val());
    $.ajax({
        url: '/join',
        type: 'POST',
        data: {
            username: username
        },
        success: function(response) {
            console.log('responsenya', response)
            if (response.data.status == 'OK') { //username doesn't already exists
                $('.chat').show();
                $('#leave-chat').data('username', username);
                $('#send-message').attr('data-username', username);
                console.info('username', username)
                getMessages();
            } else if (response.status == 'FAILED') { //username already exists
                alert("Sorry but the username already exists, please choose another one");
                $('#username').val('').focus();
            }
        }
    });
});

function addMessage(name, message) {
    $("#messages").append(`<h4>${name}</h4><p>${message}</p>`);
}

function getMessages() {
    $.get('/get_messages', function(response) {
        console.log('browser:get_messages', response)
        var message_count = Object.keys(response.data).length;
        if (message_count > 0) {
            var html = '';
            for (var x = 0; x < message_count; x++) {
                html += "<div class='msg mb-2'><div class='user font-weight-bold'>" + response.data[x].sender + "</div><div class='txt'>" + response.data[x].message + "</div></div>";
            }
            $('#messages').html(html);
        }
    });
}

$('#leave-chat').click(function() {
    var username = $(this).data('username');
    $.ajax({
        url: '/leave',
        type: 'POST',
        dataType: 'json',
        data: {
            username: username
        },
        success: function(response) {
            if (response.status == 'OK') {
                socket.emit('message', {
                    'username': username,
                    'message': username + " has left the chat room.."
                });
                socket.emit('update_chatter_count', {
                    'action': 'decrease'
                });
                $('.chat').hide();
                $('.join-chat').show();
                $('#username').val('');
                alert('You have successfully left the chat room');
            }
        }
    });
});

$('#send-message').click(function() {
    console.log('send message clicked')
    var username = $(this).data('username');
    var message = $.trim($('#message').val());
    $.ajax({
        url: '/send_message',
        type: 'POST',
        dataType: 'json',
        data: {
            'username': username,
            'message': message
        },
        success: function(response) {
            console.info('response send message', response)
            if (response.data.status == 'OK') {
                socket.emit('message', {
                    'username': username,
                    'message': message
                });
                $('#message').val('');
            }
        }
    });
});

/** Auth */
// Login
$('#btn-login').click(function() {
    var username = $.trim($('#uname').val());
    var password = $.trim($('#password').val());

    console.log('User Login: ', 'username: ', username, 'password: ', password)

    // emit socket
    let dataAuth = {
        agent_id: "49",
        avatar: "http://localhost:8000/storage/assets/images/uploads/gravatar/agent-qwords-49.png",
        company_name: "Gina Company",
        department_name: "Developer",
        email_agent: "agent@qwords.co.id",
        id_company: "10",
        id_department: "11",
        last_action: null,
        module: "is_dashboard",
        name_agent: "Agent Qwords",
        permission_name: "Agent",
        phone_agent: "null",
        roles_id: "4",
        status: "online",
        token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiYjRjMGRkZTBlYmRlNTczMzQ4MzU0MmNlYmQ0ZjQwOTk1YWZlOGFmZjExNTc5ZjZjZmZhODkzYTJlOGQwYjE0OThkNjBlYmM4YmU0OWRiZDciLCJpYXQiOjE2NTU5NjAyODYuOTMyMjQ2LCJuYmYiOjE2NTU5NjAyODYuOTMyMjUsImV4cCI6MTY4NzQ5NjI4Ni45MjMxOTYsInN1YiI6IjQ5Iiwic2NvcGVzIjpbXX0.QMJreS6iCrX3unIbMEw3evhyRQrJjFvfi2a-QD9ePsunDoaV0ZkKzCBizSuKAgMSbGVgoeLzsAbAcJYOx4DfTKIXP0nd-fFYH4vqDpXeCHSxX23oG9_-zMDKpvWx-AeOgm8ASV9lTG2vwIrPaAA1ygfy7OaW5-eu8PtckbDMoAyWwKupAPKXlsJzFyEO_ZU3kvj8Pss9F2MkrjZZjE8y1BmcVuhtezoiD45vZTdbbdiFet1YX3Q-JeyhXHrSaeX-MMsqKHW4B_PsEQF5UaCWbnL8IjXF2xxOtLWw3_CwdXkrZtwoev1nuNwEnYpTkCtEunIsxL6aofE32WHgQaxHk23N_Czqsd91SCK4iAa05pmWLKsYEO7m-MgAbEaIj7hiIXb_EqZTxj5ezqOoNbh-9toJUPUO0eZvNzeJTa49Fdbirr1RE6PfGnY39hvETIdgQVeBKpgC3YYC0wHiP77E2FB19_SqW5CRNTTcxq-M1TFSAFL4Jh_eEaqKryXHhdc2zewAoRT7quz29HqJUygNqzhdqxRWhOgIqqE6FLZFU758SqhMeEHgHSqyQpZE2iB_pAcBvOFcNzUEPMoobMsRVf2p6Bi_ewHLSAYjAeeBFdUUC5keXG2CBSpKEEKAxigeMR9GAlz7W7be-8J2CArlFoi08RSfQWNggPjFVHNEets",
        type_user: "agent",
        uuid: "5aeb48dd-5e53-11ec-93e9-e0d55e1b6010"
    }

    let dataAuth2 = {
        agent_id: "75",
        avatar: "http://localhost:8000/storage/assets/images/uploads/gravatar/agent-finance-1-75.png",
        company_name: "Gina Company",
        department_name: "Finance",
        email_agent: "agentfinance1@qwords.co.id",
        id_company: "10",
        id_department: "30",
        last_action: null,
        module: "is_dashboard",
        name_agent: "Agent Finance 1",
        permission_name: "Agent",
        phone_agent: "null",
        roles_id: "4",
        status: "online",
        token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiZWYwMjVjZWViZmYwMmY2Mzc2YmMwYjg1NmUwMDEzYWFmZDNmZTI3MGRmYWIyZGQxNTFhNTYxNTRjNjcwYmVhYTlkNzhjNGZhMzkzOTI2YzYiLCJpYXQiOjE2NTU5NzQ5MzcuMTYwMjczLCJuYmYiOjE2NTU5NzQ5MzcuMTYwMjgzLCJleHAiOjE2ODc1MTA5MzcuMTQ0OTgxLCJzdWIiOiI3NSIsInNjb3BlcyI6W119.WYaFfA1Kh-3vYN8Ley4Fpcw2W3XgbcUWDAqajrs8Qi6lMRWiTMHoYoEpIt5EMd-B18_5R-hkEzUCN_aYHL4wwx1irZY-8jLG3ltYJ6PcdCayjizK3Ttu46pURT4wQSEO7554BLbOlmOw4d8xFvyu3FTYG4W4iQgr38KhINYTiQfl8K95k5mVOZejgrxNtz8eeeEHLBq17DNroK1Z0miDZe4y5BOlDqWIDoRbsEp3ISL9TcHUwYhZdHlzp98zg8RNPK2RvgdYOtq8rNvCvTCZ1Jo_JNURiRPUoQfby6V1Qg5KvmHE3OyeLFLfH0_aI526mcGIAgLbUYnxhY9gcEu04yOoAEyrqXqqNwEiv5FtzxSR5fuNnj2EUHbB_bRkQ7Eu704DWstzuNxdccS55gKpVFF5x1tw2FSes1fnBg08w1lmAdP7mUuo0Mt7MNvf5dpVjz7IzIxQCxxZ-rI5boMA_hYtfFZmpuBop2t2AmBjlGlwaJ2XZnrBpP8DWbstgjvlLJXmKOdxax6rkZUqJSszm4W5biewCHwwuVDLE3z4kB87szCRBk_3f7ip4pVctPQ0rDny97NaOUbpE5clSi68rPqgrD9PVAU28Ho7jsLEKmUG3sEfS9cT5ojvWmiiz2ajxC6GK7AMGuyXMouEDt1SNv-1e2W3Ve5hLyNTZEAYMyE",
        type_user: "agent",
        uuid: "3353f742-6eab-11ec-a9f4-e0d55e1b6010"
    }

    $.ajax({
        url: '/login',
        type: 'POST',
        // data: {
        //     username: username,
        //     password: password
        // },
        data: dataAuth,
        success: function(response) {
            console.log('Login response: ', response)
            showLoginInfo()
        }
    });

    // socket.emit('user.makeAuth', dataAuth);

});

// Login as Client and Send Message
$('#btn-loginclient').click(function() {
    // var clientEmail = $.trim($('#client-email').val());
    // console.log('Client Login: ', 'email: ', clientEmail)

    const allData = {
        name: $.trim($('#client-name').val()),
        email: $.trim($('#client-email').val()),
        company_name: $.trim($('#company-name').val()),
        department_name: $.trim($('#department-name').val()),
        topic_name: $.trim($('#topic-name').val()),
        message: $.trim($('#message-content').val())
    }

    $.ajax({
        url: '/login-client',
        type: 'POST',
        data: allData,
        success: function(response) {
            console.log('Login client response: ', response)
            showLoginInfo()

            // emit after success
            socket.emit('chat.new', allData)
        }
    });
});

function showLoginInfo() {
    $.get('/login-info', function(response) {
        console.log('/login-info', response)
        console.log('type of /login-info', typeof(response.data))
        console.log('length of /login-info', response.data.length)

        if(response.data && !response.data.id) {
            $('.login-client-info ul').html("");
            $(".login-client-info ul").append(`
                <li>Email: ${response.data.email}</li>
            `);

            $('.login-client-info').removeClass('d-none')
            $('.login-client-info').addClass('d-block')
        } else {
            $('.login-info ul').html("");
            $(".login-info ul").append(`
                <li>ID: ${response.data.id}</li>
                <li>Email: ${response.data.email}</li>
                <li>Company Name: ${response.data.company_name}</li>
                <li>Dept: ${response.data.department_name}</li>
            `);

            $('.login-info').removeClass('d-none')
            $('.login-info').addClass('d-block')
        }
    });
}

// Show Login Info on Reload
showLoginInfo()

// Logout
$('#btn-logout, #btn-logout-client').click(function() {
    console.log('logout clicked')

    $.ajax({
        url: '/logout',
        type: 'POST',
        data: {
        },
        success: function(response) {
            console.log('Logout response: ', response)

            alert(response.message)
            $('.login-info ul, .login-client-info ul').html("");
            $('.login-info, .login-client-info').removeClass('d-block')
            $('.login-info, .login-client-info').addClass('d-none')
        }
    });
});

// Join Room
$(document).on('click', '#my-chats #pending ul li', function(e) {
    let elementId = $(this).attr('id')
    let room = elementId
    if(elementId.search(':') != -1) {
        let roomArr = elementId.split(':')
        room = roomArr.pop()
    }
    socket.emit('room.join', room)
});

/** Socket */
socket.on('send', function(data) {
    console.log('socket message in client', data)
    var username = data.username;
    var message = data.message;
    var html = "<div class='msg'><div class='user'>" + username + "</div><div class='txt'>" + message + "</div></div>";
    $('#messages').append(html);
});

socket.on('count_chatters', function(data) {
    console.log('chatters count', data)
    $('.chat-info').text("There are currently " + data.numberOfChatters + " people in the chat room");
    $("#chat-member ul").html("")
    data.member_joined.forEach(member => {
        console.log('member', member)
        $("#chat-member ul").append(`<li>${member}</li>`);
    })
});


socket.on("message", (message) => {
    console.log("msg result:", message)
});

socket.on("chat.pending", (message) => {
    console.log("chat pending result:", message)
    $("#my-chats #pending ul").append(`<li class="list-group-item id="$//{message}" >${message}</li>`);
});

socket.on("chat.onrefresh", (message) => {
    console.log("chat chatlist on refresh result:", message)

    $("#my-chats #pending ul").html('')
    if(message.pending) {
        message.pending.forEach((chat, idx) => {
            $("#my-chats #pending ul").append(`<li class="list-group-item id="${chat.chat_id}" >${chat.chat_id}</li>`);
        })
    }
});

socket.on("client.chat.onrefresh", (message) => {
    console.log("CLIENT chat on refresh result:", message)

    $("#fetch-message").html('')
    if(message.chat_reply) {
        message.chat_reply.forEach((chat, idx) => {
            $("#fetch-message").append(`
                <div style='margin-bottom: 8px;'>
                    <p style='margin: 0px;'>${chat.from}</p>
                    <p style='margin: 0px;'>${chat.message}</p>
                    <small>${chat.formatted_date}</small>
                </div
            `);
        })
    }
})

})
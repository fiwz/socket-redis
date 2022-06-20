$(() => {
const socket = io('http://localhost:4000');
// const socket = io('http://localhost:4000/agents');

$.get('/get_chatters', function(response) {
    console.log('/get_chatters', response)
    $('.chat-info').text("There are currently " + response.data.numberOfChatters + " people in the chat room");

    $("#chat-member ul").html("")
    response.data.member_joined.forEach(member => {
        $("#chat-member ul").append(`<li>${member}</li>`);
    })
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

    $.ajax({
        url: '/login',
        type: 'POST',
        data: {
            username: username,
            password: password
        },
        success: function(response) {
            console.log('Login response: ', response)
            showLoginInfo()
        }
    });
});

function showLoginInfo() {
    $.get('/login-info', function(response) {
        console.log('/login-info', response)
        console.log('type of /login-info', typeof(response.data))
        console.log('length of /login-info', response.data.length)

        if(response.data) {
            $('.login-info ul').html("");
            $(".login-info ul").append(`
                <li>ID: ${response.data.id}</li>
                <li>Username: ${response.data.username}</li>
            `);

            $('.login-info').removeClass('d-none')
            $('.login-info').addClass('d-block')
        }
    });
}

// Show Login Info on Reload
showLoginInfo()

// Logout
$('#btn-logout').click(function() {
    console.log('logout clicked')

    $.ajax({
        url: '/logout',
        type: 'POST',
        data: {
        },
        success: function(response) {
            console.log('Logout response: ', response)

            alert(response.message)
            $('.login-info ul').html("");
            $('.login-info').removeClass('d-block')
            $('.login-info').addClass('d-none')
        }
    });
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

})
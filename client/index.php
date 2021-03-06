<!DOCTYPE html>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">

    <script src="https://code.jquery.com/jquery-3.2.1.min.js" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js" integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.6.0/socket.io.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <script src="/public/js/main.js"></script>

    <div class="container">
        <div class="row">
            <div class="col-6">
                <div class="wrap-login py-4 px-5 bg-light border rounded rounded-4 my-3">
                    <p class="mb-3 fs-2 fw-normal">Login</p>

                    <input id="uname" name="uname" class="mb-3 form-control" placeholder="Uname" />
                    <input type="password" id="password" name="password" class="mb-3 form-control" placeholder="Password" />
                    <input type="button" id="btn-login" class="btn btn-success" value="Login">

                    <div class="login-info mb-1 d-none">
                        <div class="title-login text-capitalize mt-2 font-weight-bold">my login info</div>
                        <ul></ul>
                        <input type="button" id="btn-logout" class="btn btn-danger btn-sm" value="Logout">
                    </div>
                </div>

            </div>

            <div class="col-6">
                <div class="wrap-login py-4 px-5 bg-light border rounded rounded-4 my-3">
                    <p class="mb-3 fs-2 fw-normal">Login as Client</p>

                    <input id="client-name" name="client_name" class="mb-3 form-control" placeholder="Client Name" value="Just Client" />
                    <input id="client-email" name="client_email" class="mb-3 form-control" placeholder="Client Email" value="justclient@mailinator.com" />
                    <input id="company-name" name="company_name" class="mb-3 form-control" placeholder="Company Name" value="gina-company" />
                    <input id="department-name" name="department_name" class="mb-3 form-control" placeholder="Department Name" value="developer" />
                    <input id="topic-name" name="topic_name" class="mb-3 form-control" placeholder="Topic Name" value="instalasi" />
                    <input id="message-content" name="message_content" class="mb-3 form-control" placeholder="Message" value="halo min" />
                    <input type="button" id="btn-loginclient" class="btn btn-success" value="Send Message">

                    <div class="login-client-info mb-1 d-none">
                        <div class="title-login text-capitalize mt-2 font-weight-bold">my login info</div>
                        <ul></ul>
                        <input type="button" id="btn-logout-client" class="btn btn-danger btn-sm" value="Logout">
                    </div>
                </div>
            </div>

            <div class="col-12">
                <div class="wrap-login py-4 px-5 bg-light border rounded rounded-4 my-3" id="my-chats">
                    <p class="mb-3 fs-2 fw-normal">My Chats</p>
                    <div class="row">
                        <div class="col-6">
                            <div id="pending">
                                <div class="mb-3">Pending Chat</div>
                                <ul class="list-group">
                                    <li class="list-group-item">First item</li>
                                    <li class="list-group-item">Second item</li>
                                    <li class="list-group-item">Third item</li>
                                </ul>
                            </div>

                            <div id="pendingtransfer">
                                <div class="mt-4 mb-3">Pending Transfer</div>
                                <ul class="list-group">
                                </ul>
                            </div>

                            <div id="ongoing">
                                <div class="mt-4 mb-3">On Going Chat</div>
                                <ul class="list-group">
                                </ul>
                            </div>

                            <div id="resolve">
                                <div class="mt-4 mb-3">Resolve Chat</div>
                                <ul class="list-group">
                                </ul>
                            </div>

                        </div>
                        <div class="col-6">
                            <div class="d-flex mb-3">
                                <p class="mb-1">Fecth Message</p>
                                <button type="button" id="btn-close-chat" class="ms-auto btn btn-danger btn-sm">Close Chat</button>
                              </div>
                            <div id="fetch-message"></div>
                            <input type="hidden" id="chat-id" name="chat_id" class="mb-3 form-control" />
                            <input type="hidden" id="from" name="from" class="mb-3 form-control" />
                            <input type="hidden" id="date" name="date" class="mb-3 form-control" />
                            <input type="text" id="message-reply" name="message_reply" class="mb-3 form-control" placeholder="Reply Message" />
                            <input type="button" id="btn-send-message" class="btn btn-success" value="Send Message">

                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12">
                <div class="wrap-login py-4 px-5 bg-light border rounded rounded-4 my-3">
                    <div class="row">
                        <div class="col-6">
                            <div class="d-flex mb-3">
                                <p class="mb-1">Transfer to Agent</p>
                              </div>
                            <div id="fetch-message"></div>
                            <input type="text" id="transfer-chat-id" name="transfer_chat_id" class="mb-3 form-control" placeholder="Chat ID" />
                            <input type="text" id="transfer-to-agent" name="transfer_to_agent" class="mb-3 form-control" placeholder="Agent ID" />
                            <input type="button" id="btn-transfer-chat" class="btn btn-success" value="Transfer Chat">

                        </div>
                    </div>
                </div>
            </div>

        </div>
</html>
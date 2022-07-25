// Redis
const redis = require('../config/redis')
const redisF = redis.justVariable
const redisClient = redis.client
const sub = redis.sub

const { filter, update } = require("lodash")
const _ = require("lodash")
const fs = require("fs")
const rimraf = require("rimraf")
const path = require("path")
const mime = require("mime-types")
const QRCode = require("qrcode")

const {
    Client: WAClient,
    MessageMedia,
    LegacySessionAuth,
    LocalAuth,
    NoAuth
} = require("whatsapp-web.js")

const DBM = require("../utils/DBManagement");
const dbm = new DBM()

/**
 * Import 'file-type' ES-Module in CommonJS Node.js module
 */
let { fileTypeFromFile_, readChunk_, fileTypeFromBuffer_ } = {}
// (async () => {
    // const { fileTypeFromFile, fileTypeFromBuffer } = await import("file-type")
    // const { readChunk } = await import("read-chunk")

    // fileTypeFromFile_ = fileTypeFromFile
    // readChunk_ = readChunk
    // fileTypeFromBuffer_ = fileTypeFromBuffer
// })()
const importFileType = async () => {
    const { fileTypeFromFile, fileTypeFromBuffer } = await import("file-type")
    const { readChunk } = await import("read-chunk")

    fileTypeFromFile_ = fileTypeFromFile
    readChunk_ = readChunk
    fileTypeFromBuffer_ = fileTypeFromBuffer
}
importFileType()

const {
    successResponseFormat,
    errorResponseFormat
} = require("../utils/response-handler")

const {
    generateChatId,
    getCurrentDateTime,
    randomString,
    slugify
} = require("../utils/helpers")

const {
    getClientWhatsappOngoingChat,
    getPendingListByUser,
    sendMessage
} = require("../utils/chat-action")

/**
 * Define Variable
 */
this.clientWa = []
const definedErrorMessage = {
    companyWhatsappNotActive: `Company's Whatsapp account is not active. Please Try again in a moment.`,
    whatsappErrorSendMsg: 'Error send message to Whatsapp client:'
}

const initWhatsappService = (io=null, socket=null, data=null) => {
    console.log('init wa session')
    syncWhatsappAccountSession(io)
}

/**
 * Integrate Whatsapp Account
 *
 * - Sync whatsapp account (reconnect)
 * - Add new whatsapp account
 * @param {*} io
 * @param {*} socket
 * @param {*} data
 * @param {*} syncData
 * @returns
 */
const integrateWhatsappAccount = async(io=null, socket=null, data, syncData = false) => {
    console.log('WA integration start')

    var puppeteer = {
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu",
        ],
    }

    puppeteer = {
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        ignoreHTTPSErrors: true,
        headless: true,
    }

    if (process.env.APP_ENV !== "production")
        puppeteer.executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" // for send video to WA

    // Set companyID and other variables
    let companyID = null
    let companyUuid = null
    let companyName = null
    let phoneNumber = syncData ? data.phone_number : data.inputPhone
    let requestResult = null
    let user = null

    // Validate User Roles
    if(socket) {
        user = socket.request.session.user
        if (socket.request.session.user === undefined)
            return errorResponseFormat(null, 'Failed to integrate account. Please login to continue', 403)

        if(user.roles_id && user.roles_id != 2)
            return errorResponseFormat(null, 'Failed to integrate account. Features only available for company', 403)

        companyID = user.id
        companyUuid = user.uuid
        companyName = user.company_name
    }

    if(syncData) {
        companyID = parseInt(data.id_agent);
        companyUuid = data.uuid
        companyName = slugify(data.company_name)

        const authStrategy = new LocalAuth({
            puppeteer,
            clientId: companyID,
            // dataPath: storage.sessionPath, // don't use dataPath to keep it default to ./wwwjs_auth
        })
        const worker = `${authStrategy.dataPath}/session-${companyID}/Default/Service Worker`
        if (fs.existsSync(worker)) {
            // fs.rmdirSync(worker, { recursive: true })
            rimraf.sync(worker);
        }

        this.clientWa[companyID] = {
            companyID,
            companyUuid,
            companyName,
            phoneNumber,
            instanceWA: new WAClient({
                puppeteer,
                takeoverOnConflict: true,
                takeoverTimeoutMs: 10,
                authStrategy,
            })
        };

        console.log(`System is getting ready sync session of client id ${companyID}`)

        this.clientWa[companyID].instanceWA.initialize()
        .then(async () => {
            // const version = await this._client.getWWebVersion()
            // console.log(`WHATSAPP WEB version: v${version}`)
            console.log(`Whatsapp account of client id ${companyID} is initialized`)
        })
        .catch((err) => {
            console.error('Error when sync whatsapp session: ', err)
        })
    } else {
        console.log('A user is trying to integrate whatsapp', user)

        // Check phone number (unique)
        const feedData = await dbm.validateConnectWhatsapp({
            token: user.token,
            number: phoneNumber,
        })
        if (!feedData.data) {
            let requestResult = errorResponseFormat(null, feedData.dataRawResponse.message, feedData.code)
            socket.emit('integrate.whatsappresult', requestResult);
            return requestResult
        }

        // Init whatsapp account
        this.clientWa[companyID] = {
            companyID,
            companyUuid,
            companyName,
            phoneNumber,
            token: user.token,
            instanceWA: new WAClient({
                authStrategy: new LocalAuth({ clientId: companyID })
            })
        }
        this.clientWa[companyID].instanceWA.initialize()

        console.log('System is getting ready to show qr')
        this.clientWa[companyID].instanceWA.on("qr", (qr) => {
            console.log('QR', qr)
            QRCode.toString(qr, {type:'terminal', small: true}, function (err, url) {
                console.log(url)
            })
            socket.emit('integrate.whatsapp.qr', qr)
        })
    } // End of else

    this.clientWa[companyID].instanceWA.on("change_state", (state) => {
        console.log("Whatsapp state: ", state)

        // State is CONFLICT
        if(state === 'CONFLICT') {
            console.error("Whatsapp Error: CONFLICT detected")
            try {
                this.clientWa[companyID].instanceWA.destroy()
                console.error('Whatsapp Error: Conflict company id ', companyID)
            } catch (error) {
                console.error("Whatsapp Error:", error)
            }
        }

        // State is TIMEOUT
        if(state === 'TIMEOUT')
            console.log("TIMEOUT detected")
    })

    this.clientWa[companyID].instanceWA.on("authenticated", async (session) => {
        console.log('user is authenticated')
        this.clientWa[companyID].WaSecretBundle = session
    })

    this.clientWa[companyID].instanceWA.on("ready", async () => {
        console.log("Client whatsapp is ready!")

        // Store new integrated account
        if(data.inputPhone) {
            // Check on authenticated
            // Whether the given phone number is the same as scanned phone number
            const info = this.clientWa[companyID].instanceWA.info
            // console.log("authenticated luser info:", info)
            // console.log("current wa state auth: ", await this.clientWa[companyID].instanceWA.getState())

            let authenticatedNumber = '+' + info.wid.user
            if(data.inputPhone != authenticatedNumber) {
                this.clientWa[companyID].instanceWA.destroy()
                requestResult = errorResponseFormat(null, 'The given phone number is not match with scanned number.')
                socket.emit('integrate.whatsappresult', requestResult)

                return requestResult
            }

            // Store Data to Database
            const updateData = await dbm.integrateWhatsappAccount({
                token: user.token,
                phoneNumber: phoneNumber,
                status: 1,
            })

            if (!updateData.data) {
                requestResult = errorResponseFormat(null, updateData.dataRawResponse.message, updateData.code)
                socket.emit('integrate.whatsappresult', requestResult)
                return requestResult
            }

            // Success
            requestResult = successResponseFormat(updateData.data, updateData.message)
            socket.emit('integrate.whatsappresult', requestResult)
            return requestResult
        }

        // Handle update
        handleMessageWa(io, this.clientWa[companyID]); // start handle update after get ready state
    })
}

/**
 * Sync/reconnect Whatsapp Account
 * That already integrated
 *
 * Use together with integrateWhatsappAccount()
 * @param {*} data
 */
const syncWhatsappAccountSession = async(io, data=null) => {
    // dev debug
    // dev testing
    // let coba = integrateWhatsappAccount(null, null, {
    //     id_agent: 10,
    //     phone_number: '+6289517723708'
    // },
    // true)
    const dataConnected = await dbm.getWaAccounts();
    const listDC = dataConnected.data;

    if (listDC && listDC.length > 0) {
        listDC.forEach((result) => {
            integrateWhatsappAccount(io, null, result, true)
        })
    }
}

const handleMessageWa = async (io=null, whichClient) => {
    console.log(`Start handle update for company id ${whichClient.companyID}`);

    whichClient.instanceWA.on("ready", async (cek) => {
        console.log(`Company id ${whichClient.companyID} is ready to receive message`);
    });

    // Handle whatsapp message updates
    whichClient.instanceWA.on("message", async (message) => {
        try {
            let messageFrom = message.from;
            /**
             * IS PRIVATE MESSAGE
             *
             * Example:
             * from: '6285600098889@c.us', // private
             * from: '120363023256565629@g.us', // group
             * from: 'status@broadcast', // status
             * */
            let searchString = "@c"
            let isPrivateChat = messageFrom.includes(searchString)

            // dev debug
            // console.log('')
            // console.log('========================', 'isPrivateChat', isPrivateChat)
            // console.log("incoming message to WA")
            // console.log("===========", 'message:', message)
            // console.log("===========", 'message.body:', message.body)
            // console.log('')

            if (isPrivateChat && (message.body !== "" || message.hasMedia)) {
                // let uploadedFileId = null
                let uploadedFileData = null

                // HANDLE WA MEDIA
                if (message.hasMedia) {
                    const incomingMedia = await message.downloadMedia();

                    if (incomingMedia == undefined) throw new Error("Undefined Media");

                    const buffer = Buffer.from(incomingMedia.data, "base64");

                    let inputData = {}
                    let availableMime = ["image", "video", "archive", "other"];

                    let uploadedType = await fileTypeFromBuffer_(buffer);
                    let getMime = uploadedType.mime.split("/");
                    let uploadedMime = getMime[0];
                    let fileCategory = availableMime.includes(uploadedMime) ? uploadedMime : "other";
                    // let dirCategory = fileCategory == "image" ? "images" : fileCategory;
                    inputData.type = fileCategory;

                    // write file to disk
                    let fname = getCurrentDateTime('dateonly', '') + randomString(10) + "-" + slugify(messageFrom) + "." + uploadedType.ext;
                    // let storeLocation = "public/assets/"+ dirCategory +"/uploads/agent-client-chat";
                    // let storeLocation = "agent-client-chat";
                    let storeLocation = "whatsapp-chat";
                    let storeFileRename = storeLocation + "/" + fname;
                    inputData.path = storeFileRename;
                    inputData.name = fname;
                    fs.writeFileSync("public/" + storeFileRename, buffer);

                    // save path to database
                    let store = await dbm.storeChatFilePath(inputData);
                    // uploadedFileId = store.data.id;
                    uploadedFileData = store.data
                }
                // END OF HANDLE WA MEDIA

                // Create new chat
                let companyName = whichClient.companyName
                let formattedPhoneNumber = '+' + messageFrom.split('@').shift()
                let datetime = getCurrentDateTime()
                let chatContent = {
                    created_at: datetime,
                    updated_at: datetime,
                    formatted_date: datetime,
                    id_channel: 2,
                    channel_name: 'Whatsapp',
                }

                // Set file key
                if(uploadedFileData) {
                    chatContent.file_id = uploadedFileData.id
                    chatContent.file_name = uploadedFileData.name
                    chatContent.file_path = uploadedFileData.path
                    chatContent.file_type = uploadedFileData.type
                    chatContent.file_url = uploadedFileData.url
                }

                // Check if client has on going chat
                let isClientHasActiveChat = await getClientWhatsappOngoingChat(messageFrom)
                // console.log('************************', 'isClientHasActiveChat', isClientHasActiveChat)

                if(isClientHasActiveChat && isClientHasActiveChat.length <= 0) {
                    await redisClient.sadd(`company:${whichClient.companyName}:online_clients`, messageFrom)
                    let chatId = generateChatId() // generate chatId
                    let chatRoom = `company:${companyName}:room:${chatId}`
                    let chatRoomMembersKey = chatRoom + ':members'
                    let pendingDepartmentRoom = `company:${companyName}:dept:fromsocmed:pending_chat_room` // from socmed
                    chatContent = {
                        ...chatContent,
                        ...{
                            company_name: companyName,
                            department_name: null,
                            from: messageFrom,
                            message: message.body,
                            no_whatsapp: messageFrom,
                            topic_name: null,
                            user_email: null,
                            user_name: formattedPhoneNumber,
                            user_phone: formattedPhoneNumber,
                            status: 0
                        },
                    }
                    let arrChatContent = [chatContent]

                    // Create room
                    let clientRoomKey = `client:${messageFrom}:rooms`
                    let pendingRoomKey = `company:${companyName}:dept:fromsocmed:pending_chats`
                    await redisClient.call('JSON.SET', chatRoom, '.', JSON.stringify(arrChatContent) )
                    await redisClient.zadd(pendingRoomKey, getCurrentDateTime('unix'), chatRoom)
                    await redisClient.set(clientRoomKey, chatRoom)
                    await redisClient.zadd(chatRoomMembersKey, getCurrentDateTime('unix'), messageFrom)

                    // Emit to room: pending chat from socmed room
                    let mySockets = await io.in(pendingDepartmentRoom).fetchSockets();
                    for([index, agentSd] of mySockets.entries()) {
                        const pendingList = await getPendingListByUser(agentSd);
                        io.to(agentSd.id).emit('chat.pending', pendingList);
                    }
                } else {
                    // console.log('User already has an active message')

                    chatContent = {
                        ...chatContent,
                        ...{
                            chatId: isClientHasActiveChat.chat_id,
                            message: message.body,
                            from: messageFrom,
                            message: message.body,
                            no_whatsapp: messageFrom,
                            user_name: formattedPhoneNumber,
                            user_phone: formattedPhoneNumber,
                        }
                    }
                    let storeMessage = await sendMessage( io, null, chatContent)
                }
            } // End of if message exists
        } catch (e) {
            let requestResult = errorResponseFormat(null, `Error handle whatsapp message update. ${e.message}`, (e.code == undefined ? 400 : e.code) )
            console.error(requestResult)
            return requestResult
        }

    })
}

const replyToClientWhatsapp = async(socket, data) => {
    let selectedCompany = null
    let clientSenderWaNumber = data.no_whatsapp ? data.no_whatsapp : null

    let checkMember = await validateMembersBeforeSend(socket, {
        company_name: data.company_name,
        no_whatsapp: data.no_whatsapp
    })
    if(checkMember && !checkMember.success)
        return checkMember

    selectedCompany = checkMember.data.company_whatsapp_data

    // Validate/check company's whatsapp account state before send data
    let currentCompanySate = await checkCompanyWhatsappState(selectedCompany)
    console.log('currentCompanySate', currentCompanySate)

    if(currentCompanySate && !currentCompanySate.success) {
        requestResult = errorResponseFormat(currentCompanySate.data, `Failed to send message. ${currentCompanySate.message}`)
        socket.emit('message', requestResult)
        return requestResult
    }

    // SEND TO USER WHATSAPP
    if (!data.file_id) {
        // ONLY MESSAGE (WITHOUT FILE)
        selectedCompany.instanceWA.sendMessage(
            clientSenderWaNumber,
            data.message
        )
        .then((response) => {
            // Success send message
            // console.log('Send message to Whatsapp client:', response)
        })
        .catch((error) => {
            console.error(definedErrorMessage.whatsappErrorSendMsg, error)
            requestResult = errorResponseFormat(null, definedErrorMessage.companyWhatsappNotActive)
            socket.emit('message', requestResult)

            return requestResult
        })
    } else {
        // SEND MEDIA FILE TO WHATSAPP
        let chatFilePath = "public/" + data.file_path;

        fs.exists(chatFilePath, function (isExist) {
            if (isExist) {
                // console.log("exists:", path);
                const media = MessageMedia.fromFilePath(chatFilePath);
                if (!data.message) {
                    // Send with caption
                    selectedCompany.instanceWA.sendMessage(
                        clientSenderWaNumber,
                        media
                    )
                    .then((response) => {
                        // Success send message
                        // console.log('Send message with file to Whatsapp client:', response)
                    })
                    .catch((error) => {
                        console.error(definedErrorMessage.whatsappErrorSendMsg, error)
                        requestResult = errorResponseFormat(null, definedErrorMessage.companyWhatsappNotActive)
                        socket.emit('message', requestResult)

                        return requestResult
                    })
                } else {
                    selectedCompany.instanceWA.sendMessage(
                        clientSenderWaNumber,
                        media,
                        { caption: data.message } // only available for image and video
                    )
                    .then((response) => {
                        // Success send message
                        // console.log('Send message with file and caption to Whatsapp client:', response)
                    })
                    .catch((error) => {
                        console.error(definedErrorMessage.whatsappErrorSendMsg, error)
                        requestResult = errorResponseFormat(null, definedErrorMessage.companyWhatsappNotActive)
                        socket.emit('message', requestResult)

                        return requestResult
                    })
                } // End if there is caption
            } else {
                console.error(definedErrorMessage.whatsappErrorSendMsg, error)
                requestResult = errorResponseFormat(null, `File not found ${chatFilePath}`)
                socket.emit('message', requestResult)

                return requestResult
            }
        });
    }
}

const checkCompanyWhatsappState = async(whatsappAccountArray) => {
    // Validate/check company's whatsapp account before send data
    let currentCompanySate = await whatsappAccountArray.instanceWA.getState()
    let requestResult = null
    if(currentCompanySate != 'CONNECTED') {
        requestResult = errorResponseFormat(currentCompanySate, definedErrorMessage.companyWhatsappNotActive)
        return requestResult
    }

    requestResult = successResponseFormat(true, `Company's Whatsapp account is active`)
    return requestResult
}

const validateMembersBeforeSend = async(socket, data) => {
    let selectedCompany = null
    let clientSenderWaNumber = data.no_whatsapp ? data.no_whatsapp : null
    let requestResult = null

    // Validate client's whatsapp number
    requestResult = errorResponseFormat(data, `Failed to send message. Client's Whatsapp account is not found.`)
    if(!clientSenderWaNumber) {
        socket.emit('message', requestResult)
        return requestResult
    }

    // let isWhatsappFromFormat = clientSenderWaNumber.search('@')
    let isWhatsappFromFormat = clientSenderWaNumber.includes('@c.us')
    if(!isWhatsappFromFormat) {
        socket.emit('message', requestResult)
        return requestResult
    }

    // Search and validate company's whatsapp number
    if(this.clientWa && this.clientWa.length > 0) {
        selectedCompany = this.clientWa.find((value, index) => {
            if(value && value.companyName === data.company_name)
                return value
        })
    }

    if(!selectedCompany) {
        requestResult = errorResponseFormat(data, `Failed to send message. Company's Whatsapp account is not found or not active.`)
        socket.emit('message', requestResult)
        return requestResult
    }

    requestResult = successResponseFormat({ company_whatsapp_data: selectedCompany }, 'Validate chat member is success.')
    return requestResult
}

module.exports = {
    initWhatsappService,
    integrateWhatsappAccount,
    replyToClientWhatsapp,
}

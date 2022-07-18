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
const dbm = new DBM();

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

const { getCurrentDateTime } = require("../utils/helpers")

const {
    successResponseFormat,
    errorResponseFormat
} = require("../utils/response-handler")

/**
 * Define Variable
 */
this.clientWa = []

const initWhatsappService = (io=null, socket=null, data=null) => {
    // console.log('init wa session')
    syncWhatsappAccountSession()
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
    // let companyUuid = null
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
    }

    if(syncData) {
        companyID = parseInt(data.id_agent);
        // companyUuid = data.uuid;

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
            // companyUuid,
            phoneNumber,
            instanceWA: new WAClient({
                puppeteer,
                takeoverOnConflict: true,
                takeoverTimeoutMs: 10,
                authStrategy,
            })
        };

        console.log(`System is getting ready sync session of client id ${companyID}`, this.clientWa[companyID])
        this.clientWa[companyID].instanceWA.initialize()
        .then(async () => {
            // const version = await this._client.getWWebVersion()
            // console.log(`WHATSAPP WEB version: v${version}`)
            console.log(`Whatsapp account of client id ${companyID} is initialized`)
        })
        .catch((err) => {
            console.error('Error when sync whatsapp session: ', err)
        })

        // console.log("current company list: ", Object.keys(this.clientWa))
    } else {
        // console.log('A user is trying to integrate whatsapp', user)

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
        // companyID = parseInt(data.companyID)
        this.clientWa[companyID] = {
            phoneNumber,
            token: user.token,
            instanceWA: new WAClient({
            authStrategy: new LocalAuth({ clientId: companyID })
            // authStrategy: new NoAuth()
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
    })

    this.clientWa[companyID].instanceWA.on("ready", async () => {
        console.log("Client whatsapp is ready!")

        // return console.log('Data in this.clientWa[companyID]', this.clientWa[companyID])

        // Handle update
        // code...
        // this.handleMessageWa(agentNamespace, this.clientWa[companyID]) // start handle update after get ready state

        if(data.inputPhone) {
            // Check on authenticated
            // Whether the given phone number is the same as scanned phone number
            const info = this.clientWa[companyID].instanceWA.info
            console.log("authenticated luser info:", info)
            console.log("current wa state auth: ", await this.clientWa[companyID].instanceWA.getState())

            let authenticatedNumber = '+' + info.wid.user
            if(data.inputPhone != authenticatedNumber) {
                this.clientWa[companyID].instanceWA.destroy()
                requestResult = errorResponseFormat(null, 'The given phone number is not match with scanned number.')
                socket.emit('integrate.whatsappresult', requestResult)

                return requestResult
            }
        // }

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
    })
}

const syncWhatsappAccountSession = async (data=null) => {
    // dev debug
    // dev testing
    // let coba = integrateWhatsappAccount(null, null, {
    //     id_agent: 10,
    //     phone_number: '+6289517723708'
    // },
    // true)

    const dataConnected = await dbm.getWaAccounts();
    const listDC = dataConnected.data;

    console.log('listDC', listDC)
    if (listDC && listDC.length > 0) {
        listDC.forEach((result) => {
            integrateWhatsappAccount(
                null,
                null,
                result,
                true
            )
        })
    }

}

module.exports = {
    initWhatsappService,
    integrateWhatsappAccount,
}

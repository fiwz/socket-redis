const axios = require("axios").default;
var os = require("os");
var hostname = os.hostname();

class DBManagement {
    constructor() {
        this.base = "http://localhost:8000";
        // window.base_url_live = 'https://chatvolution.my.id';
        // this.base = 'https://chatvolution.my.id';

        // detect server
        if (hostname == "garuda6.fastcloud.id") {
        this.base = "https://chatvolution.my.id";
        }

        if (process.env.NODE_ENV == "production") {
        this.base = "https://chatvolution.my.id";
        }
    }

    /* function router dynamic */
    accessRouter = (params) => {
        return axios(params)
        .then((response) => {
            // createLog(params.url + " -- " + JSON.stringify(response.data));
            return response.data;
        })
        .catch((error) => {
            // createLog(JSON.stringify(error));
            // console.error(error.response);
            return {
                code: error.response.status,
                message: error.message,
                dataRawResponse: error.response.data,
                data: error.response.data.data,
                config: error.response.config
            };
        });
    };

    /**
     * Validate Whatsapp Phone Number
     *
     * Check whether the number given is unique
     *
     * @param {*} params
     * @returns
     */
    async validateConnectWhatsapp(params) {
        const data = {
            phone: params.number,
        };

        const config = {
            method: "POST",
            data,
        };

        config.url = this.base + `/api/agent/validate-connect-channel/whatsapp`;
        config.headers = {
            Authorization: `Bearer ${params.token}`,
            "X-Requested-With": "xmlhttprequest",
            "Content-Type": "application/json",
        };
        return await this.accessRouter(config);
    }

    /**
     * Integrate Whatsapp Account
     * @param {*} clientWa
     * @param {*} sessions
     * @returns
     */
     integrateWhatsappAccount = async (params) => {
        const data = {
            phone: params.phoneNumber,
            status: params.status,
        };
        const config = {
            method: "post",
            data,
        };
        config.url = this.base + `/api/agent/connect-channel/whatsapp`;
        config.headers = {
            Authorization: `Bearer ${params.token}`,
            "X-Requested-With": "xmlhttprequest",
            "Content-Type": "application/json",
        };

        return await this.accessRouter(config);
    };

    /**
     * Get list of integrated Whatsapp account from database
     *
     * @returns
     */
    getWaAccounts = async () => {
        const config = {
            method: "get",
        };
        config.url = this.base + `/api/channel-account-list/2`;
        config.headers = {
            "X-Requested-With": "xmlhttprequest",
            "Content-Type": "application/json",
        };

        return await this.accessRouter(config);
    };

    async sendChatWhatsapp(params) {
        const data = params;
        const config = {
            method: "post",
            data,
            url: `${this.base}/api/chat/send-chat/channel/whatsapp`,
            headers: {
                "X-Requested-With": "xmlhttprequest",
            },
        };

        return await this.accessRouter(config);
    }

    /**
     * Store chat file path to database
     * Only save the file information in database
     * The file saved in current socket project directory
     *
     * - Use together in handle incoming message from whatsapp feature
     * @param {*} params
     * @returns
     */
    async storeChatFilePath(params) {
        const data = {
            path: params.path,
            type: params.type,
            name: params.name,
        };

        const config = {
            method: "post",
            data,
        };
        config.url = this.base + `/api/chat/upload-file/socmed`;
        config.headers = {
            "X-Requested-With": "xmlhttprequest",
            "Content-Type": "application/json",
        };

        return await this.accessRouter(config);
    }
}

module.exports = DBManagement;
const { query } = require('express');

const {
    getList,
} = require('../models/chat-model');

const {
    successResponseFormat,
    errorResponseFormat
} = require('../utils/response-handler');

const DBM = require('../utils/DBManagement');
const dbm = new DBM()

exports.showList = (req, res) => {
    // buat query sql
    const querySql = '';

    // akses model
    getList(res, querySql)
}

exports.uploadFile = async (req, res) => {
    if (!req.file)
        return errorResponseFormat(null, 'The files is required.', 400, res)

    const filePath = req.file.path
    const fileName = req.file.filename
    const fileMime = req.file.mimetype

    // success
    let availableMime = ["image", "video", "archive", "other"];
    let getMime = fileMime.split("/")
    let uploadedMime = getMime[0]
    let fileCategory = availableMime.includes(uploadedMime) ? uploadedMime : "other";
    const uploadedStorage = "uploads/"

    let uploadResult = {
        type: fileCategory,
        path: uploadedStorage + fileName,
        name: fileName,
    }

    if(req.params && req.params.savetodb == undefined) {
        try {
            let store = await dbm.storeChatFilePath(uploadResult)
            if(store.code != 200)
                return errorResponseFormat(null, store.dataRawResponse.message, store.dataRawResponse.code, res)

            return successResponseFormat(store.data, null, null, res)
        } catch (err) {
            return errorResponseFormat(null, 'Error save file information to database' + err, 400, res);
        }
    }

    return successResponseFormat(uploadResult, null, null, res)
}
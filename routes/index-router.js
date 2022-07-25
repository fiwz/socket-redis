const {
    showList,
    uploadFile
} = require('../controllers/main-controller')
const express = require('express')
const router = express.Router()

// Upload file dependency
const multer = require('multer') // dependency multer
const path = require('path') // dependency path

// Upload File Config
const diskStorage = multer.diskStorage({
    // config storage file
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "../", "/public/uploads"));
    },
    // config filename
    filename: function (req, file, cb) {
        cb(
            null,
            file.fieldname + "-" + Date.now() + path.extname(file.originalname)
        );
    },
});

/**
 * Dev test
 */
router.route('/')
    .get(showList);

/**
 * Upload File
 *
 * - Used for upload file to socmed (Whatsapp, Telegram)
 * - Directly save file information (name, path, type)
 */
router.route('/upload-file/:savetodb?')
    .post(
        multer({ storage: diskStorage }).single("files"),  // field name
        uploadFile
    );

module.exports = router;
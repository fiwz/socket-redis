const {
    showList,
} = require('../controllers/main-controller')
const express = require('express')
const router = express.Router()

router.route('/')
    .get(showList);

module.exports = router;
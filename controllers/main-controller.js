const { query } = require('express');
const {
    getList,
} = require('../models/chat-model');

exports.showList = (req, res) => {
    // buat query sql
    const querySql = '';

    // akses model
    getList(res, querySql)
}

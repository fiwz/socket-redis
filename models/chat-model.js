// const koneksi = require('../config/database');
const { responseData, responseMessage } = require('../utils/response-handler');

exports.getList = (response, statement) => {
    // jalankan query
    // koneksi.query(statement, (err, rows, field) => {
        // error handling
        // if (err) {
        //     return response.status(500).json({ message: 'Gagal insert data!', error: err });
        // }

        // jika request berhasil
        // res.status(201).json({ success: true, message: 'Berhasil insert data!' });
        responseData(response, 200, { "description": "Hello World!" } );
    // });
}
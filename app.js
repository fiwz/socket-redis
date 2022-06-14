// const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const mainRouter = require('./routes/index-router');
const app = express();
const PORT = process.env.PORT || 4000;
require('dotenv').config(); // env

// set body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// set routing
app.use('/main-page', mainRouter)


// buat server nya
app.listen(PORT, () => console.log(`Server running at port: ${PORT}`));
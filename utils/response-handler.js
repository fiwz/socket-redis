const responseData = function (response, statusCode, values, isSuccess=true) {
    var data = {
        success: isSuccess,
        data: values,
    };
    response.status(statusCode).json(data);
    response.end();
};

const responseMessage = function (response, statusCode, message, isSuccess=true) {
    var data = {
        success: isSuccess,
        message: message,
    };
    response.status(statusCode).json(data);
    response.end();
};

module.exports = { responseData, responseMessage }
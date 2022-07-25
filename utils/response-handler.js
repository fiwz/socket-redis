const responseData = function (response, statusCode, values, isSuccess=true) {
    let data = {
        success: isSuccess,
        data: values,
    };
    response.status(statusCode).json(data);
    response.end();
};

const responseMessage = function (response, statusCode, message, isSuccess=true) {
    let data = {
        success: isSuccess,
        message: message,
    };
    response.status(statusCode).json(data);
    response.end();
};

/**
 * Success Response Format
 *
 * Only formatter, not return response
 */
const successResponseFormat = (data=null, message=null, statusCode=null, response=null) => {
    let resultMessage = {
        success: true,
        message: message ? message : 'Successfully process the request.',
        data: data,
    }

    if(response) {
        resultMessage.code = statusCode ? statusCode : 200
        response.status(resultMessage.code).json(resultMessage)
        response.end()
    }

    return resultMessage
}

/**
 * Error Response Format
 *
 * Only formatter, not return response
 */
 const errorResponseFormat = (data=null, message=null, statusCode=null, response=null) => {
    let resultMessage = {
        success: false,
        message: message ? message : 'Failed to process the request.',
        data: data,
    }

    if(response) {
        resultMessage.code = statusCode ? statusCode : 404
        response.status(resultMessage.code).json(resultMessage)
        response.end()
    }

    return resultMessage
}

module.exports = {
    errorResponseFormat,
    responseData,
    responseMessage,
    successResponseFormat,
}
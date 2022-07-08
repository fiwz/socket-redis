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
const successResponseFormat = (data=null, message=null, statusCode=null) => {
    let resultMessage = {
        data: data,
        message: message ? message : 'Successfully process the request.',
        success: true
    }

    if(statusCode)
        resultMessage.code = statusCode

    return resultMessage
}

/**
 * Error Response Format
 *
 * Only formatter, not return response
 */
 const errorResponseFormat = (data=null, message=null, statusCode=null) => {
    let resultMessage = {
        data: data,
        message: message ? message : 'Failed to process the request.',
        success: false
    }

    if(statusCode)
        resultMessage.code = statusCode

    return resultMessage
}

module.exports = {
    errorResponseFormat,
    responseData,
    responseMessage,
    successResponseFormat,
}
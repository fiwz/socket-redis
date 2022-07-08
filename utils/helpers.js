const moment = require('moment');

const getCurrentDateTime = (type=null) => {
    let currentDate = moment().utc().utcOffset(+7)
    let date = currentDate.format('YYYY-MM-DD HH:mm:ss') // WIB
    // if locale is set moment().utc().utcOffset(process.env.TIMEZONE).format('YYYY-MM-DD h:mm:ss')

    if(type === 'unix') {
        date = currentDate.unix()
    }

    return date
}

const slugify = function(str) {
    if(str) {
        str = str.replace(/^\s+|\s+$/g, ''); // trim
        str = str.toLowerCase();

        // remove accents, swap ñ for n, etc
        var from = "ãàáäâẽèéëêìíïîõòóöôùúüûñç·/_,:;";
        var to   = "aaaaaeeeeeiiiiooooouuuunc------";
        for (var i = 0, l = from.length; i < l; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
        }

        str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
                    .replace(/\s+/g, '-') // collapse whitespace and replace by -
                    .replace(/-+/g, '-'); // collapse dashes
    }
    return str;
};

module.exports = {
    getCurrentDateTime,
    slugify,
}
const prompt = require('prompt');
exports.getParameter  = function(paramName, paramPromptText) {
    return new Promise(function(resolve, reject) {
        prompt.start();
        prompt.get([
            {
                name : paramName,
                required : true,
                description : paramPromptText
            },
            function(err, result) {
                console.log('Success:'+result);
                if(result) {
                    console.log('Success:'+result);
                    resolve(result[paramName]);
                } else if(err) {
                    reject(null);
                }
            }
        ]);
    })
};

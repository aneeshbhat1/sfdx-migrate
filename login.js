const prompt = require('prompt'),
util = require('util'),
{ exec } = require('child_process'),
execPromise = util.promisify(exec);

module.exports.login = function (schema) {
    return new Promise((resolve, reject) => {
        prompt.start();
        prompt.get(schema,
            function (err, result) {
                if (result) {
                    execPromise('sfdx force:auth:web:login -r ' + result.URL + ' -d -a ' + result.Alias)
                        .then(data => {
                            console.log('Logged in successfully to ' + result.sourceAlias + ':' + data.stdout);
                            resolve(result);
                        })
                        .catch(err => {
                            console.log('There was an error during login to : '+result.sourceAlias);
                            reject(err);
                        });
                }
                else if (err) {
                    console.log('Error:' + err);
                    reject(err);
                }
            }
        );
    });
}
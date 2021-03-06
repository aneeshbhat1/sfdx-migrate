const cmd = require('node-command-line'),
    _ = require('lodash'),
    fs = require('fs'),
    { exec } = require('child_process'),
    util = require('util'),
    loginModule = require('./login.js'),
    execPromise = util.promisify(exec);

const schema = {
        properties: {
            URL: {
                name: 'sourceURL',
                required: true,
                description: 'Enter Source URL'
            },
            Alias: {
                name: 'sourceAlias',
                required: true,
                description: 'Enter Source Alias'

            }
        }
    };

module.exports = {
    export : (projectLocation) => {
        loginModule.login(schema)
        .then(result => {
            exportData(result, projectLocation);
        })
        .catch(err => {
            console.log(err);
        });
    }
}

function strMapToObj(strMap) {
    let obj = Object.create(null);
    for (let [k, v] of strMap) {
        obj[k] = v;
    }
    return obj;
}

function exportData(result, projectLocation) {
    let queries;
    try {
        if (fs.existsSync(projectLocation +'/queries.json')) {
            let queriesFile = fs.readFileSync(projectLocation +'/queries.json', 'utf8');
            queries = JSON.parse(queriesFile);
        }
    }
    catch(err) {
        console.log('queries.json file was not in the right format. Please refer to the documentation');
    }

    if(!queries) {
        console.log('queries.json file content is not the right format. Please refer to the documentation');
        return;
    }

    let promiseArray = [];
    queries.forEach(query => {
        const promise = execPromise('sfdx force:data:tree:export --query "' + query.Query + '" --outputdir '+projectLocation+'/sfdx-out --plan -u ' + result.Alias);
        promise.then(result => {
            console.log('Data retrieved successfully for ' + query.Type);
        })
        .catch(err => {
            console.log(err);
        });
        promiseArray = [...promiseArray, promise];
    });

    Promise.all(promiseArray).then(function (values) {
        let objectDataMap = new Map();
        if (!fs.existsSync(projectLocation+'/sfdx-out-processed/')) {
            fs.mkdirSync(projectLocation+'/sfdx-out-processed/');
        }
        queries.forEach(query => {
            if (fs.existsSync(projectLocation+'/sfdx-out/' + query.Type + 's.json')) {
                let objectDataFile = fs.readFileSync(projectLocation+'/sfdx-out/' + query.Type + 's.json', 'utf8');
                objectDataMap.set(query.Type, JSON.parse(objectDataFile));
            }
        });

        let finalObjectDependencyMap = new Map();
        objectDataMap.forEach((value, type) => {
            let objectDependencyMap = new Map();
            value.records.forEach(function (record, index) {
                let isDependent = _.some(Object.keys(record), function (prop) {
                    return _.endsWith(prop, '__r');
                });

                if (isDependent) {
                    let dependentProps = _.filter(Object.keys(record), function (prop) {
                        return _.endsWith(prop, '__r');
                    });
                    _.forEach(dependentProps, function (prop) {
                        if (!objectDependencyMap.has(record[prop]['attributes']['type'])) {
                            objectDependencyMap.set(record[prop]['attributes']['type'], []);
                        }
                        objectDependencyMap.get(record[prop]['attributes']['type']).push(
                            {
                                "Index": index,
                                "FieldName": prop,
                                "ReferenceFieldName": "Name",
                                "ReferenceFieldValue": record[prop]['Name']
                            });
                    });
                }
            });

            let dependencyObjectNameMap = new Map();
            objectDependencyMap.forEach((map, key) => {
                if (!finalObjectDependencyMap.has(key)) {
                    finalObjectDependencyMap.set(key, []);
                }

                finalObjectDependencyMap.get(key).push(type);
                if (objectDataMap.has(key)) {
                    let filteredRecords = _.filter(objectDataMap.get(key).records, function (record) {
                        return _.map(map, function (model) { return model.ReferenceFieldValue }).includes(record['Name']);
                    });

                    _.forEach(filteredRecords, function (record) {
                        dependencyObjectNameMap.set(record['Name'], record['attributes']['referenceId']);
                    });

                    objectDependencyMap.get(key).forEach(entry => {
                        let renamedFieldName = _.replace(entry.FieldName, '__r', '__c');
                        value.records[entry.Index][renamedFieldName] = '@' + dependencyObjectNameMap.get(entry.ReferenceFieldValue);
                        delete value.records[entry.Index][entry.FieldName];
                    });
                }
            });
            fs.copyFile(projectLocation+'/sfdx-out/' + type + '-plan.json', projectLocation+'/sfdx-out-processed/' + type + '-plan.json', function (err) {
                if (err) throw err;
                console.log('Plan copied successfull for object : ' + type);
            });

            fs.writeFile(projectLocation+'/sfdx-out-processed/' + type + 's.json', JSON.stringify(value, null, 4), function (err) {
                if (err) throw err;
                console.log('Input files processed successfully for object :' + type);
            });
        });

        fs.writeFile(projectLocation+'/sfdx-out-processed/dependency.json', JSON.stringify(strMapToObj(finalObjectDependencyMap), null, 4), function (err) {
            if (err) throw err;
            console.log('Dependency created successfully.');
        });
    });
}

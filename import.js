const prompt = require('prompt'),
    cmd = require('node-command-line'),
    _ = require('lodash'),
    fs=require('fs'),
    util = require('util'),
    exec = require('child_process'),
    loginModule = require('./login.js'),
    queries = require('./queries.json'),
        schema = {
        properties: {
            URL: {
                name: 'destURL',
                required: true,
                description: 'Enter Destination URL'

            },
            Alias: {
                name: 'destAlias',
                required: true,
                description: 'Enter Destination Alias'

            },
        }
    };


// loginModule.login(schema)
// .then(result => {
//     importData(result);
// })
// .catch(err => {
// });
importData({"Alias" : "P2RDemo"});

function importData(result) {  
    if(!queries) {
        console.log('queries.json file content is not the right format. Please refer to the documentation');
        return;
    }

    let objectDataMap = new Map();
    queries.forEach(query => {
        if(fs.existsSync('sfdx-out-processed/'+query.Type+'s.json')) {
            let objectDataFile = fs.readFileSync('sfdx-out-processed/'+query.Type+'s.json', 'utf8');
            objectDataMap.set(query.Type, JSON.parse(objectDataFile));
        }
        else {
            console.log('No data file for '+query.Type+' found');
        }
    });

    let dependencyMap = fs.readFileSync('sfdx-out-processed/dependency.json', 'utf8');

    objectDataMap.forEach((value, type) => {
        try {
            console.log('Data import for the object '+type+' started');
            let independentRecords = _.filter(value.records, function(record) {
                let selfDependentProps = _.filter(Object.keys(record), function(prop) {
                    return record[prop] && _.startsWith(record[prop],'@'+type+'Ref');
                });
                return selfDependentProps && selfDependentProps.length == 0 ;
            });
            importRecursively(0, 200, independentRecords, objectDataMap, type, result);
            let resolvedRecords;
            do {
                resolvedRecords = _.filter(value.records, function(record) {
                    let selfDependentProps = _.filter(Object.keys(record), function(prop) {
                        return record[prop] && _.startsWith(record[prop],'@'+type+'Ref');
                    });
                    return selfDependentProps && selfDependentProps.length == 0 && !Object.keys(record).includes('Id');
                });
                importRecursively(0, 200, resolvedRecords, objectDataMap, type, result);
            } while(resolvedRecords.length != 0)
    
            fs.writeFileSync('sfdx-out-processed/'+type+'s.json', JSON.stringify(value,null,4));
    
            let dependencyMap = JSON.parse(fs.readFileSync('sfdx-out-processed/dependency.json', 'utf8'));
            dependencyMap[type].forEach(dependentObjectType => {
                fs.writeFileSync('sfdx-out-processed/'+dependentObjectType+'s.json', JSON.stringify(objectDataMap.get(dependentObjectType),null,4));
            });
            console.log('Data import for object '+type+' completed successfully');
        }
        catch(err) {
            console.log('Data import for object '+type+' failed with error:'+err.message);
        }
    }); 

}

function importRecursively(startIndex, endIndex, records, objectDataMap, type, result) {
    if(!records || records.length == 0 ) {
        return;
    }
    fs.writeFileSync('sfdx-out-processed/tempFile.json', 
        JSON.stringify({ "records" : ((records.length <  endIndex) ? records : _.slice(records, startIndex, endIndex))}, null, 4));
    let plan = fs.readFileSync('sfdx-out-processed/'+type+'-plan.json', 'utf8');
    const parsedPlan = JSON.parse(plan);
    parsedPlan[0].files[0] = 'tempFile.json';
    parsedPlan[0].saveRefs = true;
    parsedPlan[0].resolveRefs = true;
    fs.writeFileSync('sfdx-out-processed/'+type+'-plan.json', JSON.stringify(parsedPlan, null, 4));
    let data = exec.execSync('sfdx force:data:tree:import -p sfdx-out-processed/'+type+'-plan.json -u ' + result.Alias);
    let resolvedReferences = data.toString().split('\n');
    let resolvedRefMap = new Map();
    resolvedReferences.forEach(entry => {
        if(entry.split(' ').length == 7) {
            let splitEntry = entry.split(' ');
            resolvedRefMap.set('@'+splitEntry[0], splitEntry[6]);
        }
        if(entry.split(' ').length == 6) {
            let splitEntry = entry.split(' ');
            resolvedRefMap.set('@'+splitEntry[0], splitEntry[5]);
        }
        else if(entry.split(' ').length == 5) {
            let splitEntry = entry.split(' ');
            resolvedRefMap.set('@'+splitEntry[0], splitEntry[4]);
        }
    });

    objectDataMap.get(type).records.forEach(record => {
        if(resolvedRefMap.has('@'+record.attributes.referenceId)) {
            record['Id'] = resolvedRefMap.get('@'+record.attributes.referenceId);
        }
    });

    let dependencyMap = JSON.parse(fs.readFileSync('sfdx-out-processed/dependency.json', 'utf8'));
    dependencyMap[type].forEach(dependentObjectType => {
        objectDataMap.get(dependentObjectType).records.forEach(record => {
            for(let prop in record) {
                if(_.startsWith(record[prop],'@'+type+'Ref') && resolvedRefMap.has(record[prop])) {
                    record[prop] = resolvedRefMap.get(record[prop]);
                }
            }
        });
    });

    let numberOfRecords = records.length;
    if(endIndex < numberOfRecords) {
        importRecursively(
            endIndex, 
            endIndex + ((endIndex + 200 < numberOfRecords) ? 200 : (numberOfRecords - endIndex)),
            records,
            objectDataMap,
            type,
            result);
    }
        
}
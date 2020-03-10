# sfdx-migrate

This repository contains code to a npm package that can be used to migrate configuration data from one environment to another in Salesforce. The tool is based on the Org data commands offered by SFDX. However, this tries to overcome most of the limitations of the SFDX data commands with just a few lines of javascript code.

### Prerequisites

The tool has the following Prerequisites:
* queries.json file which contains the SOQL query to the list of objects that are to be migrated in the format specified in the sample file specified in the repository.
* The __r.[APIName] notation is to be used on the SOQL queries to specify the relationships.
* All data to be exported/imported should be specified in the above file before invoking the tool.
* Make sure the fields specified in SOQL have appropriate access.
* Exclude read-only, formula fields from SOQL.

### Installation

The npm package can be installed as below

```
npm install sfdx-migrate --save
```

End with an example of getting some data out of the system or using it for a little demo

### Usage

Once installed successfully, you can get going without much difficulty by using the below lines of code and you can get the job done.

```
const migrate = require('sfdx-migrate');
migrate.export(__dirname); or migrate.import(__dirname);
```

### More information
For more information about the tool, please visit the following link https://medium.com/p/configuration-data-migration-in-salesforce-ce3e2041bc25?source=email-fa3af14d52f8--writer.postDistributed&sk=b6f3756d7a3e579b8458e9e242b55751


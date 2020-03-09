# sfdx-migrate

This repository contains code to a npm package that can be used to migrate configuration data from one environment to another in Salesforce. The tool is based on the Org data commands offered by SFDX. However, this tries to overcome most of the limitations of the SFDX data commands with just a few lines of javascript code.

### Prerequisites

The tool has the following Prerequisites:
* queries.json file which contains the SOQL query to the list of objects that are to be migrated.
* The __r.[APIName] notation is to be used on the SOQL queries to specify the relationships
* All data to be exported/imported should be specified in the above file before invoking the tool.

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
migrate.export(__dirname);
migrate.import(__dirname);
```


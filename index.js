const exportData = require('./export.js'),
      importData = require('./import.js');

module.exports = {
    export : (projectLocation) => {
        exportData.export(projectLocation);
    },
    import : (projectLocation) => {
        importData.import(projectLocation);
    }
}

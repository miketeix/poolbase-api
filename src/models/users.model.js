const NeDB = require('nedb');
const path = require('path');

module.exports = function(app) {
  const dbPath = app.get('nedb');
  const Model = new NeDB({
    filename: path.join(dbPath, 'users.db'),
    autoload: true,
  });

// ToDo: make the unique field index based on 'email'
  Model.ensureIndex({ fieldName: 'email', unique: true });

  return Model;
};

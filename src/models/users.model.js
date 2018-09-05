// user-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function(app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const user = new Schema(
    {
      email: { type: String, required: true, index: true, unique: true },
      password: { type: String, required: true },
      name: { type: String },
    },
    {
      timestamps: true,
    },
  );

  return mongooseClient.model('user', user);
};

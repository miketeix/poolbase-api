
// fee-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const fee = new Schema({
    id: { type: String, required: true, index: true, unique: true },
    type: { type: String, required: true },
    percent: { type: Number, required: true },
  }, {
    timestamps: true
  });

  return mongooseClient.model('fee', fee);

 };

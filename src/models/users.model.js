// user-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.

import addressSchema from './schemas/addressSchema';

module.exports = function(app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema, SchemaTypes: { Email } } = mongooseClient;
  const AddressSchema = addressSchema(Schema);
  const user = new Schema(
    {
      email: { type: Email, required: true, index: true, unique: true },
      password: { type: String, required: true },
      name: { type: String },
      wallets: [AddressSchema],
      avatar: { type: String },
    },
    {
      timestamps: true,
    },
  );

  return mongooseClient.model('user', user);
};

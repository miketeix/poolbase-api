// from data/pools.db
// {
//  "ownerAddress": "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
//  "maxAllocation": 200,
//   "fee": 0.25,
//   "feePayoutCurrency": "ether",
//   "payoutAddress": "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
//   "payoutTxData": "0Ab7BA78BA",
//   "adminPayoutAddress": "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
//   "inputsHash": "0x1cef2720a09a9d2020bd4b133744f2e272658c107cd5d2c285fcb5bba18f076e",
//   "name": "IIOC",
//   "description": "This is the best pool you could ever hope for.",
//   "minContribution": 5,
//   "maxContribution": 30,
//   "admins":
//     [
//      { "address": "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1", "name": "Hootie" },
//      { "address": "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1", "name": "Supports" },
//      { "address": "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1", "name": "Sooch" },
//      { "address": "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1", "name": "Norkie" },
//      { "address": "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1", "name": "Lovely" }
//     ],
//   "whitelist":
//         [
//           { "address": "0x8853a16e4753bfc56ac504edc4fe4931fc35c569", "name": "John" },
//           { "address": "0xb8844811b02e85fcd5b0a32079ab2a11d11b4d05", "name": "Mary" },
//           { "address": "0x5841043711276f5d02c30c14f4e2a2740f0587c2", "name": "Hooch" },
//           { "address": "0xf95052a6c661e9e83fdfb3d8bc42a8155d9482b9", "name": "Calibri" },
//           { "address": "0x564a1866bec2f50f0e623a484849338b94d5fdb2", "name": "Concort" },
//           { "address": "0x38912ed602cad553000bc8432312f7e0bd698efe", "name": "Calep" },
//           { "address": "0x3e102a5d4b02fb03f7ee1feecd8eeb86565948c1", "name": "Hinree" },
//           { "address": "0x84f5bc98b064a9897116496a4e18caf3627cfd43", "name": "Storeee" },
//           { "address": "0x02013a01a66122b3e7b1ed80c092250a3f9fe02d", "name": "hoomplee" },
//           { "address": "0x38ec11e246eda8b215a0b24afd093bd7cd6c1ee1", "name": "Garchoff" },
//           { "address": "0x36596eEBd695aDCd03B3e42260Aa2468885100dd", "name": "Sickldor" }
//         ],
//   "createdAt": { "$$date": 1533304407210 },
//   "_id": "l9Ztk10JUpwy22IA"
// }

// pool-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function(app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const pool = new Schema(
    {
      ownerAddress: { type: String, required: true },
      maxAllocation: { type: Number, required: true },
      fee: { type: Number, required: true },
      feePayoutCurrency: { type: String, required: true },
      payoutAddress: { type: String },
      payoutTxData: { type: String, required: true },
      adminPayoutAddress: { type: String, required: true },
      inputsHash: { type: String, required: true },
      name: { type: String, required: true },
      description: { type: String, required: true },
      minContribution: { type: Number, required: true },
      maxContribution: { type: Number, required: true },
      admin: [{ address: String, name: String }],
      whitelist: [{ address: String, name: String }],
    },
    {
      timestamps: true,
    },
  );

  return mongooseClient.model('pool', pool);
};

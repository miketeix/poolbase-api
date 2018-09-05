export default (Schema) => {
    return new Schema({
    address: { type: String, required: true },
    name: { type: String }
  });
};

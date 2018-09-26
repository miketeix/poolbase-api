export default ({ params, result }) => {
  return params.user &&
    result._id &&
    (params.user._id.toString() === result._id.toString());
}

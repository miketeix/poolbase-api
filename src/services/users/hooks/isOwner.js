export default context => {
  return context.params.user &&
    context.result._id &&
    context.params.user._id === context.result._id;
}

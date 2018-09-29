export const estimateGas = async (
  web3,
  abi,
  instanceAddress,
  functionName,
  params = [],
  opts = {},
) => {
  const contract = new web3.eth.Contract(abi, instanceAddress);
  return await contract.methods[functionName](...params).estimateGas(opts);
};

export const getFunctionAbiByName = (abi, functionName) =>
  abi.find(({ name, type }) => name === functionName && type === 'function');

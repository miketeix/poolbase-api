export const estimateGas = async (
  web3,
  abi,
  instanceAddress,
  functionName,
  params = []) => {
    const contract = new web3.eth.Contract(abi, instanceAddress);
    return await contract.methods[functionName](...params).estimateGas();
}

export const getFunctionAbiByName = (abi, functionName) => {
  return abi.find(({ name, type }) => name === functionName && type === 'function');
}

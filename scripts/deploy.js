const Web3 = require('web3');
const truffleContract = require('truffle-contract');
const poolbaseFactoryArtifact = require('./contracts/PoolbaseFactory.json');
const poolbaseEventEmitterArtifact = require('./contracts/PoolbaseEventEmitter.json');
const poolArtifact = require('./contracts/Poolbase.json');

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

// async function getContractInstance({abi, bytecode}, provider, contractAddress, from) {
//   const contract = truffleContract(artifact);
//   contract.setProvider(provider);
//   if (typeof contract.currentProvider.sendAsync !== "function") {
//       contract.currentProvider.sendAsync = function() {
//           return contract.currentProvider.send.apply(
//               contract.currentProvider, arguments
//           );
//       };
//   }
//   return await contract.deployed();
// }

async function deploy() {
  const accounts = await web3.eth.getAccounts();
  const from = accounts[0];
  console.log('from', from);
  const provider = web3.currentProvider;
  const { abi, bytecode } = poolArtifact;

  const contract = new web3.eth.Contract(abi, '0x5bf8c6684f5580d82b73ad1fb1b299c2c32e25c5', {
    from,
    gasPrice: 20000000000,
  }); // , data: bytecode
  // console.log('contract.options', contract.options);
  // console.log('contract.methods', contract.methods);
  console.log('contract.methods', contract.methods);
  contract.methods
    .ROLE_ADMIN()
    .call({ from })
    .then((err, result) => {
      console.log('err', err);
      console.log('result', result);
    });

  // const PoolFactory = await getContractInstance(poolbaseFactoryArtifact, provider, '0x9c33a9498886440f0a613c7cbcef07beb49d8e51' );
  // const EventEmitter = await getContractInstance(poolbaseEventEmitterArtifact, provider, '0xca5dd2dea153ae1a95ff030ee98b978ca11fa440' );

  // const examplePool = await getContractInstance(poolArtifact, provider, '0xf62da73dff0aa206e2c36307caaa6e76392bf43b');
  // examplePool.maxAllocation.call().then((stuff) => {
  //   console.log('stuff', stuff);
  // }).catch((yo) => {
  //   console.log('yo', yo);
  // });
  //
  // const PoolFactory = truffleContract(poolbaseFactoryArtifact);
  // const EventEmitter = truffleContract(poolbaseEventEmitterArtifact);
  //
  // PoolFactory.setProvider(web3.currentProvider);
  // EventEmitter.setProvider(web3.currentProvider);
  //
  // console.log('PoolFactory', PoolFactory);
  // PoolFactory.deployed().then((deployed) => {
  //   console.log('deployed', deployed);
  // })
  // console.log('eventEmitterContract', eventEmitterContract);
  //
  //
  // const poolFactory = await MiniMeTokenFactory.new(web3);
  // const token = await MiniMeToken.new(web3, tokenFactory.$address, 0, 0, 'GivETH', 18, 'GTH', true);
  //
  // const vault = await LPVault.new(web3, escapeHatch, escapeHatch);
  // const liquidPledging = await LiquidPledging.new(web3, vault.$address, escapeHatch, escapeHatch, token.$address);
  // await vault.setLiquidPledging(liquidPledging.$address, { from });
  //
  // const dacs = await LPPDacs.new(web3, liquidPledging.$address, escapeHatch, escapeHatch, {gas: 6500000});
  // const campaignFactory = await LPPCampaignFactory.new(web3, escapeHatch, escapeHatch, {gas: 6500000});
  // const cappedMilestones = await LPPCappedMilestones.new(web3, liquidPledging.$address, escapeHatch, escapeHatch, {from});
  //
  // await liquidPledging.addValidPlugin(web3.utils.keccak256(LPPDacsRuntimeByteCode), {from});
  // await liquidPledging.addValidPlugin(web3.utils.keccak256(LPPCampaignRuntimeByteCode), {from});
  // await liquidPledging.addValidPlugin(web3.utils.keccak256(LPPCappedMilestonesRuntimeByteCode), {from});
  //
  // await token.generateTokens(accounts[0], web3.utils.toWei('100'), {from});
  // await token.generateTokens(accounts[1], web3.utils.toWei('100'), {from, gas: 400000});
  // await token.generateTokens(accounts[2], web3.utils.toWei('100'), {from, gas: 400000});
  //
  // console.log('token Address: ', token.$address);
  // console.log('vault Address: ', vault.$address);
  // console.log('liquidPledging Address: ', liquidPledging.$address);
  // console.log('LPPDacs Address: ', dacs.$address);
  // console.log('LPPCampaignFactory Address: ', campaignFactory.$address);
  // console.log('LPPCappedMilestones Address: ', cappedMilestones.$address);
  // process.exit(); // some reason, this script won't exit. I think it has to do with web3 subscribing to tx confirmations?
}

deploy();

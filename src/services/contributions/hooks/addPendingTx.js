import Web3 from 'web3';
import errors from 'feathers-errors';
import { checkContext, setByDot } from 'feathers-hooks-common';
import AWS from 'aws-sdk';
import { soliditySha3, hexToNumber, toWei, toBN } from 'web3-utils';
import { estimateGas, getFunctionAbiByName } from '../../../utils/blockchain';

import poolbaseAbi from '../../../blockchain/contracts/PoolbaseAbi.json';



export default async context => {
  checkContext(context, 'before', ['patch', 'create']);
  const { poolbaseSignerAddress, nodeUrl, keystorePassphrase } = context.app.get('blockchain');
  const { bucketName, secretsPath, accessKey, secretAccessKey } = context.app.get('aws');

  const s3 = new AWS.S3({
    region: 'eu-central-1',
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey
  });

  const web3 = new Web3(nodeUrl);

  const { status, ownerAddress, poolAddress, amount: contributionAmount } = context.data;

  let functionName;
  switch (status) {
    case 'pending_confirmation':
      functionName = 'deposit';
      break;
    case 'pending_claim_tokens':
      functionName = 'claimToken';
      break;
    case 'pending_refund':
      functionName = 'refund';
      break;
    default:
      return context;
      break;
  }

  const functionAbi = getFunctionAbiByName(poolbaseAbi, functionName);
  console.log('poolAddress', poolAddress);
  console.log('ownerAddress', ownerAddress);
  console.log('contributionAmount', contributionAmount);
  console.log('typeof contributionAmount', typeof contributionAmount);

  const getAwsResponse = await s3.getObject({
      Bucket: bucketName,
      Key: `${secretsPath}/keystore.json`
    }).promise();
  const rawKeystoreFile = JSON.parse(getAwsResponse.Body);
  const decrypted = web3.eth.accounts.decrypt(rawKeystoreFile, keystorePassphrase);

  const hash = soliditySha3(poolAddress, ownerAddress);
  const { signature } = web3.eth.accounts.sign(hash, decrypted.privateKey, true);


  let amount = 0;
  if (status === 'pending_confirmation') {
    amount = toWei(contributionAmount.toString());
    console.log('amount', amount);
    console.log('typeof amount', typeof amount);
  }
  console.log('functionAbi', functionAbi);
  const data = web3.eth.abi.encodeFunctionCall(functionAbi, [signature]);
  let gasLimit;
  try {
    gasLimit = await estimateGas(web3, poolbaseAbi, poolAddress, functionName, [signature]);
  } catch (estimateGasError) {
    console.log('estimateGasError', estimateGasError);
  }

  const pendingTx = {
    toAddress: poolAddress,
    amount,
    gasLimit,
    data
  }

  setByDot(context.data, 'pendingTx', pendingTx);
  return context;
};

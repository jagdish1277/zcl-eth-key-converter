const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const SLPSDK = require('slp-sdk');
const eccrypto = require("eccrypto");
const keccak256 = require('keccak256')
const privateKeyToAddress = require('ethereum-private-key-to-address')
const publicKeyToAddress = require('ethereum-public-key-to-address')
const bitcoin = require('bitcoinjs-lib')
const fetch = require('node-fetch');
const inquirer  = require('./lib/inquirer');
const CryptoUtils = require("@tronscan/client/src/utils/crypto");
const url = 'https://explorer.zcl.zelcore.io/api/txs?address=t1ZefiGenesisBootstrapBURNxxxyfs71k';

const run = async () => {
  var answer = await inquirer.askUser();
  var key_list = []
  for (var i = 0; i < 200; i++){
    key_list.push(get_keys(answer.mnemonic, i));
  }

  get_filtered_txns(key_list);
};

clear();


console.log(
  chalk.yellow(
    figlet.textSync('Zefi', { horizontalLayout: 'full' })
  )
);
console.log("Example: " + 'radar limit release tackle during fever addict dog half idea cargo quality');
run();


async function get_filtered_txns(key_list){
  var txn_keys = await get_txn_keys();
  var filtered_txns = txn_keys.filter(function(txn_key) {
           return key_list.map(key =>{return key.compressed_pub_key}).includes(txn_key.compressed_pub_key)
         });
  filtered_txns = filtered_txns.map( txn => {
    txn["pub_key"] = key_list.filter(function(key){
      return key.compressed_pub_key == txn.compressed_pub_key
    })[0].pub_key;

    txn["private_key"] = key_list.filter(function(key){
      return key.compressed_pub_key == txn.compressed_pub_key
    })[0].private_key;

    txn["zclassic_address"] = key_list.filter(function(key){
      return key.compressed_pub_key == txn.compressed_pub_key
    })[0].zclassic_address;

    txn["ethereum_address"] = key_list.filter(function(key){
      return key.compressed_pub_key == txn.compressed_pub_key
    })[0].ethereum_address;

    txn["tron_address"] = key_list.filter(function(key){
      return key.compressed_pub_key == txn.compressed_pub_key
    })[0].tron_address;

    txn["zefi_amount"] = zefi_amount(parseFloat(txn.value_out), txn.block_height);

    return txn;
  });
  console.log(filtered_txns);
  return filtered_txns;
}

async function get_filtered_keys(key_list){
  var txn_keys = await get_txn_keys();
  var filtered_keys = key_list.filter(function(key) {
           return txn_keys.map(txn =>{return txn.compressed_pub_key}).includes(key.compressed_pub_key)
         });
  console.log(filtered_keys);
  return filtered_keys;
}

async function get_txns() {
  var txns = [];

  const getPages = async url => {
    try {
      const response = await fetch(url);
      const json = await response.json();
      return(json['pagesTotal'])
    } catch (error) {
      console.log(error);
    }
  };

  const getTxns = async url => {
    try {
      const response = await fetch(url);
      const json = await response.json();
      txns.push(...json['txs'])
    } catch (error) {
      console.log(error);
    }
  };

  var pages = await getPages(url);

  for (var i = 0; i< pages; i++){
    console.log("Getting Burn txns page: "+ i)
    await getTxns(url+'&pageNum='+i);
  }
  return txns;
};

async function get_txn_keys() {
  var txns = await get_txns();
  var keys = txns.map(txn => { return { "txn_id": txn.txid,
                                        "compressed_pub_key": txn.vin[0].scriptSig.asm.split(' ')[1],
                                        "value_out": txn.vout[0].value,
                                        "block_height": txn.blockheight
                                      }
                             }
                     );
  return keys;
}

function zefi_amount(zcl, blockheight){
  var multiplier = 2000;
  if (blockheight >= 846500){
    var incs_over = (blockheight - 846450) / 50;
    multiplier = multiplier - incs_over;
  }
  var zefi = Math.floor(zcl * multiplier);
  return zefi;
}

function get_keys(mn, derive = 0) {
  SLP = new SLPSDK({ restURL: 'https://rest.zslp.org/v2/' });
  const lang = "english";

  const rootSeed = SLP.Mnemonic.toSeed(mn);
  var masterHDNode = SLP.HDNode.fromSeed(rootSeed);

  var nodeZero = masterHDNode.derivePath(`m/44'/147'/0'/0/` + derive);
  var addressZero = SLP.HDNode.toCashAddress(nodeZero);
  var addressZeroWif = SLP.HDNode.toWIF(nodeZero);

  var ecpair = SLP.ECPair.fromWIF(addressZeroWif);
  var privateKeyA = ecpair.getPrivateKeyBuffer();
  var publicKeyA = eccrypto.getPublic(privateKeyA);

  const pubkeyBuf = Buffer.from(Buffer.from(publicKeyA).toString('hex'), 'hex');

  const pubkey = bitcoin.ECPair.fromPublicKey(pubkeyBuf);
  var compressedPubKey = pubkey.publicKey.toString('hex');

  return {
            "pub_key": Buffer.from(publicKeyA).toString('hex'),
            "compressed_pub_key": compressedPubKey,
            "private_key": Buffer.from(privateKeyA).toString('hex'),
            "zclassic_address": addressZero,
            "tron_address": CryptoUtils.getBase58CheckAddressFromPubBytes(publicKeyA),
            "ethereum_address": publicKeyToAddress(publicKeyA)
          }
  // console.log("Public key: " + Buffer.from(publicKeyA).toString('hex'));
  // console.log("Compressed Public Key: " + compressedPubKey)
  // console.log("Private key: " + Buffer.from(privateKeyA).toString('hex'));
  // console.log("Zclassic Address: " + addressZero);
  // console.log("Tron Address: " + addressZero);
  // console.log("Ethereum Address: " + publicKeyToAddress(publicKeyA));
}

let getContract = require("./common/contract_com.js").GetContract;
let  filePath = "./ethererscan/auth_abi.json";
let web3 = require("./common/contract_com.js").web3;
let Web3EthAbi = require('web3-eth-abi');
let comCos = require("./common/globe.js");
let contractAddress = comCos.authConAddr;
let nonceMap = new Map();

async function initAuth() {
	let contract = await getContract(filePath, contractAddress);
	return contract;
}

function getIsAuth(contract, addr) {
	return new Promise(resolve => {
  	    contract.methods.getIsAuth(addr).call().then(res => {
			if (res) {
				console.log("this house authenticate success");
				resolve(res);
			} else {
				resolve(false);
			}
		}).catch(err => {
				console.log(err)
		});
    });
}
function getHouseIds(contract, addr) {
	return new Promise((resolve, reject) => {
		contract.methods.getHouseIds(addr).call().then(res => {
			if (res) {
				resolve({status: true, data: res.transactionHash});
			} else {
				resolve({status:false, data:"查不到该地址对应的房屋ID！"});
			}
		});
	});
}
// 房屋认证
function authHouse(contract, addr, idCard, guid, owername, userId, prikey) {
    return new Promise((resolve, reject) => {
    	console.log("auth the house", addr)
    	getIsAuth(contract, addr).then(res => {
    		if (!res) {
    			const loginFun = contract.methods.authHouse(idCard, guid, owername);
                const logABI = loginFun.encodeABI();
                packSendMsg(addr, prikey, contractAddress, logABI).then(receipt => {                        
                    console.log("auth house rece", receipt);
                    let [flag, ctx] = decodeLog(contract, receipt, 'AuthHouse');
                    if (flag) {
                    	resolve({status:flag, data:ctx.transactionHash});
                    } else {
                    	resolve({status:false, err:"认证房屋失败，请稍后重新认证!"});
                    }             
                }).catch(err1 => {
                  console.log("Create user error");
                  reject({status:false, err:err1});
                });
            } else {
              resolve({status:false, err:"这个房屋已经被认证过！"});
           };
    	});
   });
}

function decodeLog(contract, receipt, eventName) {
	const eventJsonInterface = contract._jsonInterface.find(
      o => (o.name === eventName) && o.type === 'event');
    if (JSON.stringify(receipt.logs) != '[]') {
      const log = receipt.logs.find(
        l => l.topics.includes(eventJsonInterface.signature)
      );
      let decodeLog = Web3EthAbi.decodeLog(eventJsonInterface.inputs, log.data, log.topics.slice(1))
        console.log(decodeLog)
        return [true, receipt];
    } else {
      return [false, "Cannt find logs"];
    }
}
// Approve addr can visit approveAddr refer house
function approveVisit(contract, approveAddr, arpprovePrikey, addr) {
	return new Promise((resolve, reject) => {
		const loginFun = contract.methods.approveVisit(addr);
        const logABI = loginFun.encodeABI();
        packSendMsg(approveAddr, arpprovePrikey, contractAddress, logABI).then(receipt => {  
            console.log("Approve Vist callback: " ,receipt) 
			let [flag, ctx] = decodeLog(contract, receipt, 'ApproveVist');
            if (flag) {
            	resolve({status:flag, data:ctx.transactionHash});
            } else {
            	resolve({status:false, err:"授权失败，请稍后重新授权！"});
            }  
		}).catch(err => {
			console.log("授权访问失败，请检查是房屋是否已经认证！");
			reject({status:false, data: err});
		});
    });
}

function getHouseOwer(contract, addr) {
	return new Promise((resolve, reject) => {
		contract.methods.getHouseOwer().call().then(res => {
			resolve(res);
		}).catch(err => {
			reject({status:false, data: err});
		});
	})
}

function packSendMsg(formAddr, privateKey, toAddr, createABI) {
		let gas, nonce;
		return new Promise((resolve, reject) => {
			gas = 20000000000;
			web3.eth.getTransactionCount(formAddr, 'pending').then(_nonce => {
				if (nonceMap.has(_nonce)) {
					_nonce += 1
				}
				nonceMap.set(_nonce, true);
				nonce = _nonce.toString(16);
				const txParams = {
				  gasPrice: gas,
			      gasLimit: 2000000,
			      to: toAddr,
			      data: createABI,
			      from: formAddr,
			      chainId: 3,
			      nonce: '0x' + nonce
				}
				web3.eth.accounts.signTransaction(txParams, privateKey).then(signedTx => {
			 		web3.eth.sendSignedTransaction(signedTx.rawTransaction).then(receipt => {
			 			if (receipt.status) {
			 				console.log(receipt.transactionHash)
			 				resolve(receipt);
			 			} else {
			 				console.log("this user already regiester");
			 				reject("this user already regiester");
			 			}
			 		}).catch(err => {
			 			reject(err);
			 		});
				});
			});
		});	 	
}

module.exports = {
	initAuth,
	getIsAuth,
	getHouseIds,
	authHouse,
	approveVisit,
	getHouseOwer
}
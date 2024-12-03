const forge = require('node-forge');
const readlineSync = require('readline-sync');
const RSA = require('../../src/services/rsa');
const net = require('net');

const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair({ bits: 2048 });
const clientPublicKeyString = forge.pki.publicKeyToPem(publicKey);
let serverPublicKeyObj;
let username;

const client = net.createConnection({ port: 3000, host: 'localhost' });

client.on('connect', () => {
  console.log('Welcome to the ATM!');
  client.write(JSON.stringify({ type: 'clientPublicKey', publicKey: clientPublicKeyString }));
});

client.on('data', (data) => {
    const listen = false 
    const message = JSON.parse(data.toString());
    if(listen){
     handleCheckBalance(message.data);
     return
    }
  switch (message.type) {
    case 'serverPublicKey':
      handleServerPublicKey(message.publicKey);
      break;
    case 'authResult':
      handleAuthResult(message.result);
      break;
    case 'currentBalance':
      handleCheckBalance(message.data);

      break;
    case 'depositResult':
      handleDepositResult(message.message);
      break;
    case 'withdrawResult':
        handleWithdrawResult(message.message);
        listen = true
        break;
    case 'error':
      console.error('Server error:', message.message);
      client.end();
      break;
    default:
        console.error('Unknown message type:', message.type);
  }
});

function handleServerPublicKey(serverPublicKeyPem) {
    serverPublicKeyObj = RSA.toPublicKey(serverPublicKeyPem);
    console.log('Server Public Key', serverPublicKeyPem)
    username = readlineSync.question('Enter username: ');
    const password = readlineSync.question('Enter password: ');
    const encryptedMessage = RSA.encrypt(`LOGIN ${username} ${password}`, serverPublicKeyObj);
    client.write(JSON.stringify({ type: 'login', message: encryptedMessage }));
}

function handleAuthResult(result) {
  if (result === '1') {
    console.log('Authenticated successfully');
    mainMenu();
  } else {
    console.log('Authentication failed');
    client.end();
  }
}

function mainMenu() {
    while (true) {
        viewMenu();
        const selected = readlineSync.question("Choose an option (1-4): ");

        switch (selected) {
            case "1":
                deposit();
                break;

            case "2":
                withdraw();
                break;

            case "3":
              checkBalance();
                break;

            case "4":
                console.log("Exit");
                client.end();
                return;
            default:
                console.log("?????????? Invalid Input, try again ??????????");
        }
        if(selected === '3'){
            return
        }
    }
}

function deposit() {
  const amount = readlineSync.question('Enter amount: ');
  const encryptedMessage = RSA.encrypt(`Deposit ${username} ${amount}`, serverPublicKeyObj);
  client.write(JSON.stringify({ type: 'deposit', message: encryptedMessage }));
}

function withdraw() {
  const amount = readlineSync.question('Enter amount: ');
  const encryptedMessage = RSA.encrypt(`Withdraw ${username} ${amount}`, serverPublicKeyObj);
  client.write(JSON.stringify({ type: 'withdraw', message: encryptedMessage }));
}

function checkBalance() {
  const encryptedMessage = RSA.encrypt(`Check_Balance ${username}`, serverPublicKeyObj);
  client.write(JSON.stringify({ type: 'checkBalance', message: encryptedMessage }));
}

function handleCheckBalance(encryptedData) {
  const decryptedMessage = RSA.decrypt(encryptedData, privateKey);
  const [_, balance] = decryptedMessage.split(' ');
  console.log(`\n=============================\nBalance: ${balance}\n=============================\n`);
}

function handleDepositResult(message){
    console.log(message);
}

function handleWithdrawResult(message){
    console.log(message);
}


function viewMenu() {
  console.log("Choose from Menu:");
  console.log("1. Deposit");
  console.log("2. Withdraw");
  console.log("3. Check Balance");
  console.log("4. Exit");
}

client.on('close', () => {
  console.log('Disconnected from server');
});

client.on('error', (err) => {
  console.error('Client error:', err);
});
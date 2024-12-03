const net = require('net');
const forge = require('node-forge');
const mongoose = require('mongoose');
const User = require('./models/user'); // Path to your User model
const RSA = require('../../src/services/rsa');
const AES = require('../../src/services/aes');


mongoose.connect('mongodb://localhost:27017/atm-db')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('DB connection error:', err));

const serverKeyPair = forge.pki.rsa.generateKeyPair(2048);
const serverPrivateKey = serverKeyPair.privateKey;
const serverPublicKey = serverKeyPair.publicKey;
const serverPublicKeyPem = forge.pki.publicKeyToPem(serverPublicKey);

const server = net.createServer((socket) => {
  console.log('Client connected');
  let clientPublicKeyObj;

  socket.on('data', (data) => {
    try {
      const message = JSON.parse(data.toString());
      switch (message.type) {
        case 'clientPublicKey':
          clientPublicKeyObj = RSA.toPublicKey(message.publicKey);
          console.log('Received client public key:', message.publicKey);
          socket.write(JSON.stringify({ type: 'serverPublicKey', publicKey: serverPublicKeyPem }));
          break;
        case 'login':
          handleLogin(message.message, socket);
          break;
        case 'deposit':
          handleDeposit(message.message, socket);
          break;
        case 'withdraw':
          handleWithdraw(message.message, socket);
          break;
        case 'checkBalance':
          handleCheckBalance(message.message, socket, clientPublicKeyObj);
          break;
        default:
          socket.write(JSON.stringify({ type: 'error', message: 'Invalid request type' }));
      }
    } catch (error) {
      console.error('Error processing request:', error);
      socket.write(JSON.stringify({ type: 'error', message: 'Error processing request' }));
    }
  });

  socket.on('end', () => {
    console.log('Client disconnected');
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

async function handleLogin(encryptedMessage, socket) {
    try{
        const message = RSA.decrypt(encryptedMessage, serverPrivateKey);
        const [_, username, password] = message.split(' ');
        const user = await User.findOne({ username });
        const authResult = user && AES.decrypt('password', user.password) === password ? '1' : '0';
        socket.write(JSON.stringify({ type: 'authResult', result: authResult }));
    } catch(error){
        console.error("Login Error", error);
        socket.write(JSON.stringify({ type: 'authResult', result: '0' }));
    }
}

async function handleDeposit(encryptedMessage, socket) {
  try {
    const message = RSA.decrypt(encryptedMessage, serverPrivateKey);
    const [_, username, amount] = message.split(' ');
    const user = await User.findOne({ username });
    const decryptedBalance = AES.decrypt('balance', user.balance);
    const newBalance = parseFloat(decryptedBalance) + parseFloat(amount);
    const encryptedNewBalance = AES.encrypt('balance', `${newBalance}`);
    await User.findByIdAndUpdate(user._id, { balance: encryptedNewBalance });
    console.log(newBalance)
    socket.write(JSON.stringify({ type: 'depositResult', message: `Deposit successful. New balance: ${newBalance}` }));
  } catch (error) {
    console.error("Deposit Error:", error);
    socket.write(JSON.stringify({ type: 'error', message: 'Deposit failed' }));
  }
}


async function handleWithdraw(encryptedMessage, socket) {
  try {
    const message = RSA.decrypt(encryptedMessage, serverPrivateKey);
    const [_, username, amount] = message.split(' ');
    const user = await User.findOne({ username });
    const decryptedBalance = AES.decrypt('balance', user.balance);
    const newBalance = parseFloat(decryptedBalance) - parseFloat(amount);
    if (newBalance < 0) {
      socket.write(JSON.stringify({ type: 'error', message: 'Insufficient funds' }));
      return;
    }
    console.log(newBalance)
    const encryptedNewBalance = AES.encrypt('balance', `${newBalance}`);
    await User.findByIdAndUpdate(user._id, { balance: encryptedNewBalance });
    socket.write(JSON.stringify({ type: 'withdrawResult', message: `Withdrawal successful. New balance: ${newBalance}` }));
  } catch (error) {
    console.error("Withdrawal Error:", error);
    socket.write(JSON.stringify({ type: 'error', message: 'Withdrawal failed' }));
  }
}

async function handleCheckBalance(encryptedMessage, socket, clientPublicKeyObj) {
  try {
    const message = RSA.decrypt(encryptedMessage, serverPrivateKey);
    const [_, username] = message.split(' ');
    const user = await User.findOne({ username });
    const decryptedBalance = AES.decrypt('balance', user.balance);
    const encryptedBalance = RSA.encrypt(`Current_Balance ${decryptedBalance}`, clientPublicKeyObj);
    socket.write(JSON.stringify({ type: 'currentBalance', data: encryptedBalance }));
  } catch (error) {
    console.error("Check Balance Error:", error);
    socket.write(JSON.stringify({ type: 'error', message: 'Check balance failed' }));
  }
}

const port = 3000;
server.listen(port, () => console.log(`Server listening on port ${port}`));
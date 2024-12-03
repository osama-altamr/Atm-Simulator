      
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const forge = require('node-forge');
const mongoose = require('mongoose')
const User = require('./models/user')
const crypto = require('crypto')
const RSA = require('../../src/services/rsa');
const AES = require('../../src/services/aes');

mongoose.connect('mongodb://localhost:27017/atm-db')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('DB connection error:', err));

app.use(express.json());

const serverKeyPair = forge.pki.rsa.generateKeyPair(2048);
const serverPublicKeyPem = serverKeyPair.publicKey
const serverPrivateKey = serverKeyPair.privateKey
const publicKeyString = RSA.toStringPublicKey(serverPublicKeyPem)
let clientPublicKey

io.on('connection', (socket) => {
  
  socket.emit('Welcome', 'Welcome to The ATM');

  socket.on('clientPublicKey', (data) => {
    clientPublicKey = RSA.toPublicKey(data.publicKey);
    console.log(`Received client public key from ${socket.id}:`, data.publicKey);
    socket.emit('serverPublicKey', { publicKey: publicKeyString });
  });

  socket.on('login', async (data) => {
    const encryptedMessage = data.message 
    const message = RSA.decrypt(encryptedMessage, serverPrivateKey);
    const [_, username, password] = message.split(' ')
    // const encryptedPassword = AES.encrypt('password', password);
    // const encryptedAmount = AES.encrypt('balance', '0');
    // await User.create({
    //   username,
    //   password: encryptedPassword,
    //   balance: encryptedAmount,
    // })
    const user = await User.findOne({
      username
    })

    const decryptPass = AES.decrypt('password', user.password);

    if(decryptPass === password){
      socket.emit('authResult', '1')
    } else {
      socket.emit('authResult', '0')
    }
  });
  
  socket.on('deposit',async (data) => {
    const encryptedMessage = data
    const message = RSA.decrypt(encryptedMessage, serverPrivateKey);
    const [_, username, amount] = message.split(' ')
    const user = await User.findOne({
      username
    })
    const decryptedBalance = AES.decrypt('balance', user.balance)
    const newBalance = parseFloat(decryptedBalance.toString()) + parseFloat(amount.toString());
    const encryptedNewBalance = AES.encrypt('balance', `${newBalance}`);
    await User.findByIdAndUpdate(user._id, {
      balance: encryptedNewBalance
    })
    console.log(newBalance)
  });

  socket.on('withdraw', async (data) => {
    const encryptedMessage = data
    const message = RSA.decrypt(encryptedMessage, serverPrivateKey);
    const [_, username, amount] = message.split(' ')
    const user = await User.findOne({
      username
    })
    const decryptedBalance = AES.decrypt('balance', user.balance)
    const newBalance = parseFloat(decryptedBalance.toString()) - parseFloat(amount.toString());
    const encryptedNewBalance = AES.encrypt('balance', `${newBalance}`);
    await User.findByIdAndUpdate(user._id, {
      balance: encryptedNewBalance
    })
    console.log(newBalance)
  })

  socket.on('checkBalance', async (data) => {
    const encryptedMessage = data 
    const message = RSA.decrypt(encryptedMessage, serverPrivateKey);
    const [_, username] = message.split(' ')
    const user = await User.findOne({
      username
    })
    const decryptedBalance = AES.decrypt('balance', user.balance)
    const amount = decryptedBalance
    const encryptCheckBalanceRequest = RSA.encrypt(`Current_Balance ${amount}`, clientPublicKey);
    socket.emit('currentBalance', encryptCheckBalanceRequest)

  })
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  })
  
});

const port = process.env.PORT || 3000;
http.listen(port, () => console.log(`Server listening on port ${port}`));




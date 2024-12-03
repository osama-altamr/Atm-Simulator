const io = require('socket.io-client');
const forge = require('node-forge');
const socket = io('http://localhost:3000');
var readlineSync = require('readline-sync');
const RSA = require('../../src/services/rsa');

const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair({ bits: 2048 });
const clientPublicKeyString = forge.pki.publicKeyToPem(publicKey)

let serverPublicKey
socket.on('Welcome', (message) => {
    console.log('Server:', message);
});

socket.emit('clientPublicKey', { publicKey: clientPublicKeyString });

socket.on('connect', () => {
    console.log('Connected to server:', socket.id);
});

socket.on('serverPublicKey', (data) => {
    console.log('Received server public key:', data.publicKey);

    const username = readlineSync.question('Enter username: ');
    const password = readlineSync.question('Enter password: ');

    serverPublicKey = RSA.toPublicKey(data.publicKey);
    const encryptedMessage = RSA.encrypt("LOGIN " + username + " " + password, serverPublicKey);
    socket.emit('login', { message: encryptedMessage })
    socket.on('authResult', (message) => {
        console.log('Auth:', message === '1' ? 'Authenticated successfully': 'Authenticated Failure')
        if(message === '0'){
            process.exit(0);
        }
        if(message === '1')  {
            let listening = false
            socket.on('currentBalance', (data) => {
               const decryptedMessage = RSA.decrypt(data, privateKey);
               const [_, balance] = decryptedMessage.split(' ');
               console.log(`\n=============================\nBalance: ${balance}\n=============================\n`);
            })
            while (true)  {
                viewMenu();
                const selected = readlineSync.question("Choose an option (1-4): ");
    
                switch (selected) {
                    case "1":
                        const amount = readlineSync.question('Enter amount: ');
                        const encryptDepositRequest = RSA.encrypt("Deposit " + username + " " + amount, serverPublicKey);
                        socket.emit('deposit', encryptDepositRequest);
                        break;
    
                    case "2":
                        const withdrawAmount = readlineSync.question('Enter amount: ');
                        const encryptWithdrawRequest = RSA.encrypt(`Withdraw ${username} ${withdrawAmount}`, serverPublicKey);
                        socket.emit('withdraw', encryptWithdrawRequest);
                        break;
    
                    case "3":
                        const encryptCheckBalanceRequest = RSA.encrypt(`Check_Balance ${username}`, serverPublicKey);
                        socket.emit('checkBalance', encryptCheckBalanceRequest)
                        listening = true
                        break;
    
                    case "4":
                        console.log("Exit");
                        process.exit(0);
                    default:
                        console.log("?????????? Invalid Input, try again ??????????");
                        continue;
                }
                if(listening){
                    return
                }
            }
        }
    })
})

function viewMenu() {
    console.log("Choose from Menu:");
    console.log("1. Deposit");
    console.log("2. Withdraw");
    console.log("3. Check Balance");
    console.log("4. Exit");
}

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});


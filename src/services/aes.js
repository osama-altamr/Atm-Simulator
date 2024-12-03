const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class AES {
   static encrypt = (passphrase, message) => {
        const salt = crypto.randomBytes(32).toString('hex');
        const key = crypto.scryptSync(passphrase, salt, 32);
        const iv = crypto.randomBytes(16);
    
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(message, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return salt + ':' + iv.toString('hex') + ':' + encrypted
    }

    static decrypt = (passphrase, encryptedMessage) => {
        const [salt, ivHex, encryptedHex] = encryptedMessage.split(':'); //Retrieve salt, iv, and encrypted data
        const key = crypto.scryptSync(passphrase, salt, 32);
        const iv = Buffer.from(ivHex, 'hex');
        const encryptedText = Buffer.from(encryptedHex, 'hex');
    
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText, null, 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    };
}

module.exports = AES;

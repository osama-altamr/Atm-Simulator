
const forge = require('node-forge')

class RSA {
    static encrypt(message, publicKey) {
        try {
            const md = forge.md.sha256.create();
            const encrypted = publicKey.encrypt(message, 'RSA-OAEP', {
                md: md,
                mgf1: { md: md },
            });
            return forge.util.encode64(encrypted);
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    static decrypt(encryptedMessage, privateKey) {
        try {
            const decoded = forge.util.decode64(encryptedMessage)
            const decrypted = privateKey.decrypt(decoded, 'RSA-OAEP', {
                md: forge.md.sha256.create(),
                mgf1: { md: forge.md.sha256.create() },
            });
            return decrypted;
        } catch (error) {
            console.error('ERRRRRRR',error);
            return null;
        }
    }

    static toStringPublicKey(publicKey) {
        return forge.pki.publicKeyToPem(publicKey);
    }

    static toPublicKey(publicKeyString) {
        return forge.pki.publicKeyFromPem(publicKeyString);
    }

    static toPrivateKey(privateKeyString) {
        return forge.pki.privateKeyFromPem(privateKeyString);
    }
}

module.exports = RSA;
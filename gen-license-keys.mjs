// Генерирует пару ключей Ed25519 для подписи лицензий.
import crypto from 'node:crypto';
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
console.log('\nLICENSE_PRIVATE_KEY (в переменные окружения Netlify, НИКОМУ не показывать):\n' +
  privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'));
console.log('\nlicenseKey (в app/config.json, публичный):\n' +
  publicKey.export({ type: 'spki', format: 'der' }).toString('base64') + '\n');

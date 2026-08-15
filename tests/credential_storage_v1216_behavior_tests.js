'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const assert = require('assert');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'backend', 'engines', 'UsersEngine.js'),
  'utf8'
);

const props = new Map();
let uuidCounter = 0;
const context = {
  PropertiesService: {
    getScriptProperties() {
      return {
        getProperty: key => props.get(key) || null,
        setProperty: (key, value) => props.set(key, String(value))
      };
    }
  },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'sha256' },
    getUuid() {
      uuidCounter += 1;
      return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, '0')}`;
    },
    computeHmacSha256Signature(value, key) {
      return Array.from(crypto.createHmac('sha256', String(key)).update(String(value)).digest());
    },
    computeDigest(algorithm, value) {
      const alg = algorithm === 'sha256' ? 'sha256' : String(algorithm).toLowerCase();
      return Array.from(crypto.createHash(alg).update(String(value)).digest());
    },
    base64EncodeWebSafe(bytes) {
      return Buffer.from(bytes.map(v => (v < 0 ? v + 256 : v)))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    }
  },
  console
};
context.Utilities.DigestAlgorithm = { SHA_256: 'sha256' };
vm.createContext(context);
vm.runInContext(source, context);

const hashedPin = context.hashUserPinForStorage_('1234');
assert(hashedPin.startsWith('hmac-sha256-v1$'));
assert.strictEqual(context.verifyStoredUserPin_(hashedPin, '1234'), true);
assert.strictEqual(context.verifyStoredUserPin_(hashedPin, '9999'), false);
assert.strictEqual(context.verifyStoredUserPin_("'1234", '1234'), true, 'Legacy PIN compatibility must remain during migration.');
assert.strictEqual(context.isLegacyStoredUserPin_(hashedPin), false);
assert.strictEqual(context.isLegacyStoredUserPin_('1234'), true);
assert(props.get('AUTH_PIN_PEPPER_V1'), 'PIN pepper must be persisted outside the Users sheet.');

const rawSession = 'raw-browser-session-token';
const storedSession = context.hashSessionTokenForStorage_(rawSession);
assert(storedSession.startsWith('sha256$'));
assert.strictEqual(context.storedSessionTokenMatches_(storedSession, rawSession), true);
assert.strictEqual(context.storedSessionTokenMatches_(storedSession, 'wrong-token'), false);
assert.strictEqual(context.storedSessionTokenMatches_(rawSession, rawSession), true, 'Legacy raw session compatibility must remain during migration.');

console.log('Credential storage v1.2.16 behavior tests passed.');

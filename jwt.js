// jwt.js
import CryptoJS from 'crypto-js';
import { encode as btoa } from 'base-64';

function base64url(source) {
  // Convert WordArray to Base64 string
  let encodedSource = source.toString(CryptoJS.enc.Base64);
  // JWT Base64URL format
  encodedSource = encodedSource.replace(/=+$/, '');
  encodedSource = encodedSource.replace(/\+/g, '-');
  encodedSource = encodedSource.replace(/\//g, '_');
  return encodedSource;
}

export function signJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };

  const stringifiedHeader = CryptoJS.enc.Utf8.parse(JSON.stringify(header));
  const encodedHeader = base64url(stringifiedHeader);

  const stringifiedData = CryptoJS.enc.Utf8.parse(JSON.stringify(payload));
  const encodedPayload = base64url(stringifiedData);

  const token = `${encodedHeader}.${encodedPayload}`;

  // ✅ Use HMAC-SHA256 with secret key
  const signature = CryptoJS.HmacSHA256(token, secret);
  const encodedSignature = base64url(signature);

  return `${token}.${encodedSignature}`;
}

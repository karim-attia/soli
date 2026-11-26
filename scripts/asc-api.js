#!/usr/bin/env node
// Minimal App Store Connect API client for the TestFlight steps eas-cli cannot do
// (external group + beta review; see .agents/skills/soli-release/SKILL.md section 9).
// Usage: scripts/with-asc-key.sh node scripts/asc-api.js <GET|POST|PATCH> '/v1/...' ['<json body>']
// Prints the HTTP status, then the response body. No dependency: the JWT (ES256,
// max 20 min lifetime) is signed with node:crypto from the .p8 that
// scripts/with-asc-key.sh points to. Key ID / Issuer ID are the non-secret ids from eas.json.
const crypto = require('crypto')
const fs = require('fs')

const { ascApiKeyId: kid, ascApiKeyIssuerId: iss } = require('../eas.json').submit.production.ios
const key = fs.readFileSync(process.env.SOLI_ASC_API_KEY_PATH)
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const now = Math.floor(Date.now() / 1000)
const unsigned = `${b64({ alg: 'ES256', kid, typ: 'JWT' })}.${b64({ iss, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' })}`
const signature = crypto.sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')

const [, , method = 'GET', path, body] = process.argv
fetch(`https://api.appstoreconnect.apple.com${path}`, {
  method,
  headers: { Authorization: `Bearer ${unsigned}.${signature}`, 'Content-Type': 'application/json' },
  body,
}).then(async (response) => {
  console.log(response.status)
  console.log(await response.text())
  if (!response.ok) process.exitCode = 1
})

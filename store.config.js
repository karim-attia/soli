// EAS Metadata config for the App Store (`yarn metadata:push`, store-launch
// plan 2026-11-28). A GENERATOR, not a copy: the text comes from store/ios/*
// and store/release-notes/* (scripts/lib/store-listings.js) — never edit
// listing text here. Guide: docs/external-package-guides/eas-metadata.md.
//
// Left out on purpose (absent sections are skipped by metadata:push, so what is
// already right at Apple is not rewritten): `advisory` (schema 0 lacks Apple's
// newer age-rating questions → PATCH ageRatingDeclarations via
// scripts/asc-api.js), `categories` (GAMES, unchanged), `review` (the contact
// must not land in this public repo → copied at run time from
// betaAppReviewDetail), `screenshots` (a new version inherits the live English
// sets and every locale falls back to them).
const { appleInfo } = require('./scripts/lib/store-listings')
const { version } = require('./app.json').expo

const SOLI_URL = 'https://karimattia.ch/projects/soli'

module.exports = {
  configVersion: 0,
  apple: {
    version,
    copyright: '2026 Karim Attia',
    release: { automaticRelease: true, phasedRelease: true },
    info: appleInfo({ supportUrl: SOLI_URL, privacyPolicyUrl: SOLI_URL }),
  },
}

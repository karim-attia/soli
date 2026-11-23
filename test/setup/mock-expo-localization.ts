// Every unit test runs with one English (US) device locale, so `t()` returns the en.json
// text and the existing English assertions (a11y labels, HUD rows, bubbles) keep working.
jest.mock('expo-localization', () => ({
  getLocales: () => [
    { languageTag: 'en-US', languageCode: 'en', regionCode: 'US', textDirection: 'ltr' },
  ],
  getCalendars: () => [{ uses24hourClock: false }],
}))

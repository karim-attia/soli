import {
  resolveAppLanguage,
  SUPPORTED_LANGUAGES,
  type DeviceLocale,
} from '../../../src/i18n/resolveLanguage'

// "de-CH" / "zh-Hans-CN" → the fields expo-localization's getLocales() reports.
const device = (...tags: string[]): DeviceLocale[] =>
  tags.map((tag) => {
    const [languageCode, ...rest] = tag.split('-')
    const languageScriptCode = rest.find((part) => part.length === 4) ?? null
    const regionCode = rest.find((part) => part.length === 2) ?? null
    return { languageCode, languageScriptCode, regionCode }
  })

describe('resolveAppLanguage', () => {
  it.each([
    // German is Swiss-only: ONE `de` for every German-speaking region.
    [['de-CH'], 'de', 'de-CH'],
    [['de-DE'], 'de', 'de-DE'],
    [['de-AT'], 'de', 'de-AT'],
    // The first SUPPORTED device language wins, not the first device language.
    [['rm-CH', 'de-CH'], 'de', 'de-CH'],
    [['it-CH', 'de-CH'], 'it', 'it-CH'],
    [['fr-CA'], 'fr', 'fr-CA'],
    // Portuguese: Brazilian text for everyone, device region for formats.
    [['pt-PT'], 'pt-BR', 'pt-PT'],
    [['pt-BR'], 'pt-BR', 'pt-BR'],
    // Chinese: Simplified only; Traditional regions/scripts fall through.
    [['zh-Hans-CN'], 'zh-Hans', 'zh-Hans-CN'],
    [['zh-CN'], 'zh-Hans', 'zh-Hans-CN'],
    [['zh-SG'], 'zh-Hans', 'zh-Hans-SG'],
    [['zh-TW'], 'en', 'en-TW'],
    [['zh-Hant-HK'], 'en', 'en-HK'],
    [['zh-Hant-TW', 'ja-JP'], 'ja', 'ja-JP'],
    // Android's legacy Hebrew code.
    [['iw-IL'], 'he', 'he-IL'],
    [['he-IL'], 'he', 'he-IL'],
    // Unsupported → English with the device region.
    [['sv-SE'], 'en', 'en-SE'],
    [['en-GB'], 'en', 'en-GB'],
    [[], 'en', 'en'],
  ])('%j → %s (%s)', (tags, language, formatTag) => {
    expect(resolveAppLanguage(device(...tags))).toEqual({ language, formatTag })
  })

  it('skips languages that have no registered resource file yet', () => {
    expect(resolveAppLanguage(device('de-CH', 'fr-CH'), ['en', 'fr'])).toEqual({
      language: 'fr',
      formatTag: 'fr-CH',
    })
    expect(resolveAppLanguage(device('de-CH'), ['en'])).toEqual({
      language: 'en',
      formatTag: 'en-CH',
    })
  })

  it('tolerates locales without a language code', () => {
    expect(resolveAppLanguage([{ languageCode: null }])).toEqual({
      language: 'en',
      formatTag: 'en',
    })
  })

  it('lists exactly the languages app.json declares to the OS', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appJson = require('../../../app.json')
    const plugin = appJson.expo.plugins.find(
      (entry: unknown) => Array.isArray(entry) && entry[0] === 'expo-localization'
    )
    expect(plugin[1].supportedLocales.ios).toEqual([...SUPPORTED_LANGUAGES])
    expect(plugin[1].supportedLocales.android).toEqual([...SUPPORTED_LANGUAGES])
  })
})

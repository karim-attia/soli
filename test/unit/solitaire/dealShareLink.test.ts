import { createRandomExactDealId } from '../../../src/solitaire/dealIdentity'
import {
  buildDealSchemeUrl,
  buildDealShareUrl,
  isDealShareLink,
  parseDealShareUrl,
} from '../../../src/solitaire/dealShareLink'

describe('dealShareLink', () => {
  const exactId = createRandomExactDealId()

  it('builds the public https link and its scheme twin', () => {
    expect(buildDealShareUrl(exactId, 3)).toBe(
      `https://karimattia.ch/soli/deal/${exactId}?draw=3`
    )
    expect(buildDealSchemeUrl(exactId, 1)).toBe(`soli://soli/deal/${exactId}?draw=1`)
    expect(buildDealSchemeUrl(exactId)).toBe(`soli://soli/deal/${exactId}`)
  })

  it('round-trips both link forms', () => {
    expect(parseDealShareUrl(buildDealShareUrl(exactId, 3))).toEqual({ exactId, drawCount: 3 })
    expect(parseDealShareUrl(buildDealSchemeUrl(exactId, 1))).toEqual({
      exactId,
      drawCount: 1,
    })
    expect(parseDealShareUrl(`soli:///soli/deal/${exactId}`)).toEqual({
      exactId,
      drawCount: undefined,
    })
    expect(parseDealShareUrl(`https://www.karimattia.ch/soli/deal/${exactId}/`)).toEqual({
      exactId,
      drawCount: undefined,
    })
  })

  it('tolerates the deeplink wrapper retry nonce and other query params', () => {
    expect(
      parseDealShareUrl(`https://karimattia.ch/soli/deal/${exactId}?utm=x&draw=2#retry-123`)
    ).toEqual({ exactId, drawCount: 2 })
  })

  it('normalises an uppercase id to the canonical lowercase form', () => {
    expect(parseDealShareUrl(`soli://soli/deal/${exactId.toUpperCase()}`)).toEqual({
      exactId,
      drawCount: undefined,
    })
  })

  it('drops a missing or invalid draw count', () => {
    expect(parseDealShareUrl(`https://karimattia.ch/soli/deal/${exactId}?draw=9`)?.drawCount).toBe(
      undefined
    )
    expect(parseDealShareUrl(`https://karimattia.ch/soli/deal/${exactId}?draw=abc`)?.drawCount).toBe(
      undefined
    )
  })

  it('returns null for deal-shaped links with an invalid id but still recognises the shape', () => {
    const badPrefix = 'https://karimattia.ch/soli/deal/X9_abc'
    const outOfRange = `https://karimattia.ch/soli/deal/E1_${'z'.repeat(60)}`
    const notBase36 = 'https://karimattia.ch/soli/deal/E1_ab-cd'
    expect(parseDealShareUrl(badPrefix)).toBeNull()
    expect(parseDealShareUrl(outOfRange)).toBeNull()
    expect(parseDealShareUrl(notBase36)).toBeNull()
    expect(isDealShareLink(badPrefix)).toBe(true)
    expect(isDealShareLink(outOfRange)).toBe(true)
  })

  it('ignores unrelated links (dev deep links, other hosts, other paths)', () => {
    expect(parseDealShareUrl(`soli://?deal=${exactId}&draw=3`)).toBeNull()
    expect(isDealShareLink(`soli://?deal=${exactId}`)).toBe(false)
    expect(parseDealShareUrl(`https://example.com/soli/deal/${exactId}`)).toBeNull()
    expect(parseDealShareUrl('https://karimattia.ch/projects/soli')).toBeNull()
    expect(parseDealShareUrl('soli://demo-game')).toBeNull()
    expect(parseDealShareUrl('/')).toBeNull()
  })
})

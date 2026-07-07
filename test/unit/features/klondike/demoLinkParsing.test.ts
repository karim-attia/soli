import { parseSettingsLinkParam } from '../../../../src/features/klondike/hooks/useDemoGameLauncher'

// ?set=key:value[,key:value...] parsing (agent-testing-skill C1). The parser is
// pure; unknown keys/values land in ignoredPairs and the launcher applies the rest.
describe('parseSettingsLinkParam', () => {
  it('parses all three supported keys', () => {
    expect(parseSettingsLinkParam('drawCount:3,autoUp:off,solvableOnly:on')).toEqual({
      drawCount: 3,
      autoUp: false,
      solvableOnly: true,
      ignoredPairs: [],
    })
  })

  it('is case-insensitive for keys and accepts boolean aliases', () => {
    expect(parseSettingsLinkParam('DRAWCOUNT:1,AutoUp:true,solvableonly:0')).toEqual({
      drawCount: 1,
      autoUp: true,
      solvableOnly: false,
      ignoredPairs: [],
    })
  })

  it('ignores unknown keys but applies the rest', () => {
    expect(parseSettingsLinkParam('theme:dark,drawCount:2')).toEqual({
      drawCount: 2,
      ignoredPairs: ['theme:dark'],
    })
  })

  it('ignores invalid values but applies the rest', () => {
    expect(parseSettingsLinkParam('drawCount:9,autoUp:maybe,solvableOnly:off')).toEqual({
      solvableOnly: false,
      ignoredPairs: ['drawCount:9', 'autoUp:maybe'],
    })
  })

  it('ignores pairs without a value and empty segments', () => {
    expect(parseSettingsLinkParam('autoUp,,  ,drawCount:4')).toEqual({
      drawCount: 4,
      ignoredPairs: ['autoUp'],
    })
  })

  it('rejects non-integer draw counts', () => {
    expect(parseSettingsLinkParam('drawCount:2.5')).toEqual({
      ignoredPairs: ['drawCount:2.5'],
    })
  })

  it('tolerates whitespace around pairs and values', () => {
    expect(parseSettingsLinkParam(' drawCount : 5 , autoUp: on ')).toEqual({
      drawCount: 5,
      autoUp: true,
      ignoredPairs: [],
    })
  })
})

// Mock Expo winter runtime modules that Jest cannot load under PnP.
jest.mock('expo/winter', () => ({}), { virtual: true })
jest.mock('expo/winter/runtime', () => ({}), { virtual: true })
jest.mock('expo/winter/runtime.native', () => ({}), { virtual: true })
jest.mock('expo/src/winter/runtime', () => ({}), { virtual: true })
jest.mock('expo/src/winter/runtime.native', () => ({}), { virtual: true })

jest.mock('expo-crypto', () => {
  let counter = 0

  return {
    getRandomValues: (bytes: Uint8Array) => {
      counter += 1
      bytes.fill(0)
      bytes[bytes.length - 1] = counter % 251
      return bytes
    },
  }
})

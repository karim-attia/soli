// Mock Expo winter runtime modules that Jest cannot load under PnP.
jest.mock('expo/winter', () => ({}), { virtual: true })
jest.mock('expo/winter/runtime', () => ({}), { virtual: true })
jest.mock('expo/winter/runtime.native', () => ({}), { virtual: true })
jest.mock('expo/src/winter/runtime', () => ({}), { virtual: true })
jest.mock('expo/src/winter/runtime.native', () => ({}), { virtual: true })


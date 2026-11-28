import {
  clearPendingDealRequest,
  onPendingDealRequest,
  setPendingDealRequest,
} from '../../../../src/features/klondike/state/pendingDealRequestStore'

const request = { exactId: 'E1_8nk351v2ahh1oyr6mdo9nv3g6xi7nm5c6dfqpz6uc26r', drawCount: 3 } as const

describe('onPendingDealRequest', () => {
  afterEach(() => clearPendingDealRequest())

  it('fires synchronously when a request lands, not when it is cleared', () => {
    const listener = jest.fn()
    const unsubscribe = onPendingDealRequest(listener)

    setPendingDealRequest(request)
    expect(listener).toHaveBeenCalledTimes(1)

    // The game session clears the slot in the same tick it consumes it.
    clearPendingDealRequest()
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    setPendingDealRequest({ ...request })
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

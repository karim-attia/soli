import { computeDeckChecksum, encodeExactDealId, type DealCard } from './dealIdentity'

type DemoDealConfig = {
  tableau: Array<{
    down: DealCard[]
    up: DealCard[]
  }>
}

// Developer-mode demo data is hand-authored for the hidden auto-solve flow. It is
// internal-only, but still gets a stable exact-format deck ID so the live game
// model does not need nullable identity fields.
export const DEMO_DEAL_CONFIG: DemoDealConfig = {
  tableau: [
    {
      down: [{ suit: 'hearts', rank: 3 }],
      up: [
        { suit: 'hearts', rank: 2 },
        { suit: 'hearts', rank: 1 },
      ],
    },
    {
      down: [{ suit: 'diamonds', rank: 3 }],
      up: [
        { suit: 'diamonds', rank: 2 },
        { suit: 'diamonds', rank: 1 },
      ],
    },
    {
      down: [],
      up: [
        { suit: 'clubs', rank: 13 },
        { suit: 'clubs', rank: 12 },
        { suit: 'clubs', rank: 11 },
        { suit: 'clubs', rank: 10 },
        { suit: 'clubs', rank: 9 },
        { suit: 'clubs', rank: 8 },
        { suit: 'clubs', rank: 7 },
        { suit: 'clubs', rank: 6 },
        { suit: 'clubs', rank: 5 },
        { suit: 'clubs', rank: 4 },
        { suit: 'clubs', rank: 3 },
        { suit: 'clubs', rank: 2 },
        { suit: 'clubs', rank: 1 },
      ],
    },
    {
      down: [],
      up: [
        { suit: 'spades', rank: 13 },
        { suit: 'spades', rank: 12 },
        { suit: 'spades', rank: 11 },
        { suit: 'spades', rank: 10 },
        { suit: 'spades', rank: 9 },
        { suit: 'spades', rank: 8 },
        { suit: 'spades', rank: 7 },
        { suit: 'spades', rank: 6 },
        { suit: 'spades', rank: 5 },
        { suit: 'spades', rank: 4 },
        { suit: 'spades', rank: 3 },
        { suit: 'spades', rank: 2 },
        { suit: 'spades', rank: 1 },
      ],
    },
    {
      down: [],
      up: [
        { suit: 'hearts', rank: 8 },
        { suit: 'hearts', rank: 7 },
        { suit: 'hearts', rank: 6 },
        { suit: 'hearts', rank: 5 },
        { suit: 'hearts', rank: 4 },
      ],
    },
    {
      down: [],
      up: [
        { suit: 'diamonds', rank: 8 },
        { suit: 'diamonds', rank: 7 },
        { suit: 'diamonds', rank: 6 },
        { suit: 'diamonds', rank: 5 },
        { suit: 'diamonds', rank: 4 },
      ],
    },
    { down: [], up: [] },
  ],
}

// Stock order pairs with the tableau above so the demo auto-solve script can
// reveal one predictable waste card at a time in Draw 1.
export const DEMO_STOCK_ORDER: DealCard[] = [
  { suit: 'hearts', rank: 9 },
  { suit: 'hearts', rank: 10 },
  { suit: 'hearts', rank: 11 },
  { suit: 'hearts', rank: 12 },
  { suit: 'hearts', rank: 13 },
  { suit: 'diamonds', rank: 9 },
  { suit: 'diamonds', rank: 10 },
  { suit: 'diamonds', rank: 11 },
  { suit: 'diamonds', rank: 12 },
  { suit: 'diamonds', rank: 13 },
]

const DEMO_FULL_DECK: DealCard[] = [
  ...DEMO_DEAL_CONFIG.tableau.flatMap((column) => [...column.down, ...column.up]),
  ...DEMO_STOCK_ORDER,
]

export const DEMO_EXACT_DEAL_ID = encodeExactDealId(DEMO_FULL_DECK)
export const DEMO_DECK_CHECKSUM = computeDeckChecksum(DEMO_FULL_DECK)

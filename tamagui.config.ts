import { defaultConfig } from '@tamagui/config/v5'
import { animations as animationsCSS } from '@tamagui/config/v5-css'
import { animations as animationsReanimated } from '@tamagui/config/v5-reanimated'
import { createTamagui, isWeb } from 'tamagui'

export const config = createTamagui({
  ...defaultConfig,
  animations: isWeb ? animationsCSS : animationsReanimated,
})

export default config

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

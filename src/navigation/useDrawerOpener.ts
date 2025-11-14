import { useCallback } from 'react'
import {
  DrawerActions,
  type NavigationProp,
  type ParamListBase,
  useNavigation,
} from '@react-navigation/native'

type AnyNavigation = NavigationProp<ParamListBase>

export const openNavigationDrawer = (navigation: AnyNavigation) => {
  navigation.dispatch(DrawerActions.openDrawer())
}

export const useDrawerOpener = () => {
  const navigation = useNavigation<AnyNavigation>()
  return useCallback(() => {
    openNavigationDrawer(navigation)
  }, [navigation])
}


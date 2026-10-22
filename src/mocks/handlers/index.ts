import { realtimeHandlers } from '../realtime'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { checkoutHandlers } from './checkout'
import { devHandlers } from './dev'
import { favoriteHandlers } from './favorites'
import { nftHandlers } from './nfts'
import { walletHandlers } from './wallets'

export const handlers = [
  ...devHandlers,
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...checkoutHandlers,
  ...walletHandlers,
  ...realtimeHandlers,
]

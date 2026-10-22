import { realtimeHandlers } from '../realtime'
import { devHandlers } from './dev'
import { nftHandlers } from './nfts'

export const handlers = [...devHandlers, ...nftHandlers, ...realtimeHandlers]

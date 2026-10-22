import { queryOptions } from '@tanstack/react-query'
import { profileSchema, walletSchema, type Network, type WalletProvider } from './contracts'
import { parseResponse } from './errors'
import { http } from './http'

export const profileKeys = {
  detail: (userId: string) => ['profile', userId] as const,
}

export function profileQuery(userId: string) {
  return queryOptions({
    queryKey: profileKeys.detail(userId),
    queryFn: async ({ signal }) => {
      const { data } = await http.get('/profile', { signal })
      return parseResponse(profileSchema, data)
    },
  })
}

export type ProfileInput = {
  name: string
  username: string
  email: string
  ensName: string
  walletNickname: string
}

export async function updateProfile(input: ProfileInput) {
  const { data } = await http.patch('/profile', input)
  return parseResponse(profileSchema, data)
}

export async function uploadAvatar(dataUrl: string) {
  const { data } = await http.put('/profile/avatar', { dataUrl })
  return parseResponse(profileSchema, data)
}

export async function removeAvatar() {
  const { data } = await http.delete('/profile/avatar')
  return parseResponse(profileSchema, data)
}

export async function changePassword(input: { currentPassword: string; newPassword: string }) {
  await http.post('/profile/password', input)
}

export type WalletInput = {
  label: string
  provider: WalletProvider
  network: Network
  address: string
}

export async function saveWallet(role: 'primary' | 'secondary', input: WalletInput) {
  const { data } = await http.put(`/wallets/${role}`, input)
  return parseResponse(walletSchema, data)
}

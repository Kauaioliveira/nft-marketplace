export type UserRecord = {
  id: string
  name: string
  username: string
  email: string
  /** Data URL of an uploaded image (kept small by the API). */
  avatar: string | null
  ensName: string
  walletNickname: string
  /** sha256(`${salt}:${password}`). Plain passwords are never stored. */
  passwordHash: string
  salt: string
}

// Demo credentials (fictional): ana@example.com / Senha123! and bruno@example.com / Senha123!
export function createUserFixtures(): UserRecord[] {
  return [
    {
      id: 'user-ana',
      name: 'Ana Souza',
      username: 'ana.souza',
      email: 'ana@example.com',
      avatar: null,
      ensName: 'anasouza',
      walletNickname: 'Cofre da Ana',
      salt: 'ana-7f3a',
      passwordHash: 'ec02e69b8874e4301e81d947e5d5818316adbb51d6637467290a5f0071c1347f',
    },
    {
      id: 'user-bruno',
      name: 'Bruno Lima',
      username: 'bruno.lima',
      email: 'bruno@example.com',
      avatar: null,
      ensName: '',
      walletNickname: '',
      salt: 'bruno-91c2',
      passwordHash: '2d1b2fd13fe19e6e8c9ed0e976bfe32b5a853d08c3e6fd28f1230cf6ce15bf36',
    },
  ]
}

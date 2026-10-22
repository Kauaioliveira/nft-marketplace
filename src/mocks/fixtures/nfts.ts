import Big from 'big.js'
import type { Edition, Network, Nft, NftCategory } from '@/api/contracts'

type ArtKey = 'glasses' | 'bucket-hat' | 'turtleneck' | 'headphones'

type Seed = {
  name: string
  number: string
  price: string
  compareAt?: string
  art: ArtKey
  category: NftCategory
  network: Network
  rare?: boolean
  trending?: boolean
}

// The first eight entries mirror the cards drawn in the Figma file.
const seeds: Seed[] = [
  {
    name: 'Emerald Ape',
    number: '042',
    price: '1.19',
    art: 'glasses',
    category: 'digital-art',
    network: 'ethereum',
    trending: true,
  },
  {
    name: 'Sage Nomad',
    number: '009',
    price: '1.69',
    art: 'turtleneck',
    category: 'digital-art',
    network: 'ethereum',
  },
  {
    name: 'Neon Vessel',
    number: '552',
    price: '1.99',
    compareAt: '2.29',
    art: 'glasses',
    category: 'collectibles',
    network: 'polygon',
    rare: true,
    trending: true,
  },
  {
    name: 'Cosmic Bloom',
    number: '118',
    price: '1.29',
    art: 'bucket-hat',
    category: 'generative',
    network: 'ethereum',
  },
  {
    name: 'Violet Nomad',
    number: '314',
    price: '1.39',
    art: 'bucket-hat',
    category: 'photography',
    network: 'solana',
  },
  {
    name: 'Ivory Baron',
    number: '088',
    price: '1.79',
    art: 'turtleneck',
    category: '3d',
    network: 'ethereum',
    rare: true,
  },
  {
    name: 'Golden Beat',
    number: '207',
    price: '0.99',
    art: 'headphones',
    category: 'music',
    network: 'polygon',
    trending: true,
  },
  {
    name: 'Golden Signal',
    number: '160',
    price: '0.39',
    art: 'headphones',
    category: 'music',
    network: 'solana',
  },
]

const adjectives = [
  'Amber',
  'Velvet',
  'Copper',
  'Jade',
  'Rustic',
  'Lunar',
  'Solar',
  'Mossy',
  'Ochre',
  'Crimson',
  'Silent',
  'Wild',
  'Royal',
  'Misty',
  'Ancient',
  'Urban',
]
const nouns = [
  'Ape',
  'Nomad',
  'Baron',
  'Beat',
  'Signal',
  'Vessel',
  'Bloom',
  'Monk',
  'Scout',
  'Keeper',
  'Rider',
  'Oracle',
]
const arts: ArtKey[] = ['glasses', 'bucket-hat', 'turtleneck', 'headphones']
const categories: NftCategory[] = [
  'digital-art',
  'photography',
  'music',
  '3d',
  'collectibles',
  'generative',
  'gaming',
  'subscriptions',
  'utility',
]
const networkList: Network[] = ['ethereum', 'polygon', 'solana']
const prices = ['0.02', '0.15', '0.45', '0.75', '1.05', '2.4', '3.2', '4.75', '6.5', '12.3']

// 32 generated entries so filters and pagination have enough variety (40 NFTs in total).
for (let index = 0; seeds.length < 40; index += 1) {
  seeds.push({
    name: `${adjectives[index % adjectives.length]} ${nouns[(index * 5) % nouns.length]}`,
    number: String(300 + index * 17).padStart(3, '0'),
    price: prices[index % prices.length] ?? '1',
    art: arts[index % arts.length] ?? 'glasses',
    category: categories[(index * 2) % categories.length] ?? 'digital-art',
    network: networkList[index % networkList.length] ?? 'ethereum',
    rare: index % 6 === 0,
    trending: index % 4 === 1,
  })
}

const attributesByArt: Record<ArtKey, string[]> = {
  glasses: ['Óculos', 'Esmeralda', 'Jaqueta college'],
  'bucket-hat': ['Chapéu bucket', 'Moletom', 'Calmo'],
  turtleneck: ['Gola alta', 'Brinco', 'Elegante'],
  headphones: ['Fones', 'Jaqueta bomber', 'Ritmo'],
}

const creators = ['Nova Sato', 'Lia Ferraz', 'Davi Monteiro']

function editionsFor(index: number, basePrice: string): Edition[] {
  const id = `nft-${index + 1}`
  const base = new Big(basePrice)
  // Some editions start sold out so "edição indisponível" can be exercised.
  return [
    {
      id: `${id}-1-1`,
      label: '1/1',
      priceEth: base.times(3).toFixed(),
      supply: 1,
      available: index % 9 === 4 ? 0 : 1,
    },
    {
      id: `${id}-1-10`,
      label: '1/10',
      priceEth: base.times('1.5').toFixed(),
      supply: 10,
      available: 3 + (index % 7),
    },
    {
      id: `${id}-1-50`,
      label: '1/50',
      priceEth: base.toFixed(),
      supply: 50,
      available: index % 11 === 10 ? 0 : 8 + (index % 13),
    },
    {
      id: `${id}-open`,
      label: 'Aberta',
      priceEth: base.times('0.5').toFixed(),
      supply: 999,
      available: 999,
    },
  ]
}

export function createNftFixtures(): Nft[] {
  return seeds.map((seed, index) => {
    const art = `/assets/nfts/ape-${seed.art}.webp`
    const name = `${seed.name} #${seed.number}`
    return {
      id: `nft-${index + 1}`,
      tokenId: `#${seed.number.padStart(4, '0')}`,
      name,
      description: `${name} é uma obra digital finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e a procedência é registrada na rede.`,
      collection: 'Kurio Apes',
      creator: creators[index % creators.length] ?? 'Nova Sato',
      category: seed.category,
      network: seed.network,
      images: [art, art, art, art],
      priceEth: seed.price,
      compareAtPriceEth: seed.compareAt ?? null,
      rare: seed.rare ?? false,
      trending: seed.trending ?? false,
      attributes: attributesByArt[seed.art],
      rating: { average: 4 + (index % 10) / 10, count: 5 + ((index * 7) % 30) },
      editions: editionsFor(index, seed.price),
      // nft-1 is the most recent listing. Fixed dates keep sorting deterministic.
      createdAt: new Date(Date.UTC(2026, 9, 20) - index * 86_400_000).toISOString(),
      version: 1,
    }
  })
}

import Big from 'big.js'
import type { Edition, Nft, NftCategory } from '@/api/contracts'

const names = [
  'Macaco Explorador',
  'Guardião Dourado',
  'Sonho de Neon',
  'Primata Zen',
  'Rei da Selva',
  'Capitão Cacau',
  'Eco Tropical',
  'Mestre do Tempo',
  'Viajante Lunar',
  'Coroa de Âmbar',
  'Silêncio Verde',
  'Pixel Ancestral',
  'Batida Selvagem',
  'Retrato Noturno',
  'Folha Digital',
  'Olhar de Cobre',
  'Raiz Eterna',
  'Sinfonia Ocre',
  'Arena Perdida',
  'Mapa do Tesouro',
  'Chama Antiga',
  'Ritmo da Mata',
  'Bruma Dourada',
  'Totem Moderno',
  'Lenda Urbana',
  'Galho Cósmico',
  'Fruto Proibido',
  'Trilha Sonora',
  'Horizonte Cobre',
  'Espírito Livre',
  'Máscara Ritual',
  'Cripta Âmbar',
  'Brilho Fóssil',
  'Vulto da Mata',
  'Selo Real',
  'Neblina Ocre',
  'Cântico Antigo',
  'Fera Gentil',
  'Último Guardião',
  'Semente Rara',
]

const collections = ['Kurio Apes', 'Jungle Club', 'Amber Relics', 'Neon Canopy']
const creators = [
  { name: 'Lia Ferraz', avatar: '/assets/avatars/creator-1.svg' },
  { name: 'Davi Monteiro', avatar: '/assets/avatars/creator-2.svg' },
  { name: 'Iara Lopes', avatar: '/assets/avatars/creator-3.svg' },
]
const categories: NftCategory[] = ['art', 'collectibles', 'gaming', 'music', 'photography', 'pfp']

// Prices are hand-picked decimal strings so sorting and totals are easy to assert in tests.
const basePrices = ['0.12', '0.45', '1.2', '0.08', '2.5', '0.333', '0.9', '1.75', '0.05', '3.1']

function editionsFor(index: number, basePrice: string): Edition[] {
  const supply = 5 + (index % 4) * 5
  const standard: Edition = {
    id: `nft-${index + 1}-standard`,
    name: 'Padrão',
    priceEth: basePrice,
    supply,
    // Every 7th NFT is sold out on the standard edition to exercise "edição indisponível".
    available: index % 7 === 6 ? 0 : Math.max(1, supply - (index % 5)),
  }
  if (index % 3 !== 0) return [standard]
  return [
    standard,
    {
      id: `nft-${index + 1}-gold`,
      name: 'Dourada',
      priceEth: new Big(basePrice).times(2).toFixed(),
      supply: 3,
      available: index % 2 === 0 ? 1 : 3,
    },
  ]
}

export function createNftFixtures(): Nft[] {
  return names.map((name, index) => {
    const priceEth = basePrices[index % basePrices.length] ?? '1'
    const imageIndex = (index % 8) + 1
    return {
      id: `nft-${index + 1}`,
      name,
      description: `${name} faz parte da coleção ${collections[index % collections.length]}. Arte digital autenticada, com edições limitadas e histórico de propriedade simulado.`,
      collection: collections[index % collections.length] ?? 'Kurio Apes',
      creator: creators[index % creators.length] ?? creators[0]!,
      category: categories[index % categories.length] ?? 'art',
      images: [
        `/assets/nfts/nft-${imageIndex}.svg`,
        `/assets/nfts/nft-${(imageIndex % 8) + 1}.svg`,
        `/assets/nfts/nft-${((imageIndex + 1) % 8) + 1}.svg`,
      ],
      priceEth,
      editions: editionsFor(index, priceEth),
      featured: index < 4,
      // Fixed dates keep "mais recentes" deterministic.
      createdAt: new Date(Date.UTC(2026, 8, 1 + index)).toISOString(),
      version: 1,
    }
  })
}

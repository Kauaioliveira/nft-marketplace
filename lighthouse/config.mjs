// Audit plan: pages × form factors × runs. The median of the runs is reported per category.
export const baseUrl = process.env.LIGHTHOUSE_URL ?? 'http://localhost:4173'

export const pages = [
  { id: 'inicio', path: '/' },
  { id: 'detalhe', path: '/nfts/nft-1' },
]

export const runs = 3

export const categories = ['performance', 'accessibility', 'best-practices', 'seo']

/** Lighthouse defaults: mobile = Moto G Power emulation with simulated slow 4G; desktop = desktop preset. */
export const profiles = {
  mobile: {
    extends: 'lighthouse:default',
    settings: { onlyCategories: categories, formFactor: 'mobile' },
  },
  desktop: {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: categories,
      formFactor: 'desktop',
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      },
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0,
      },
    },
  },
}

export const targets = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }

import Big from 'big.js'

/** Formats a decimal ETH string without going through `number`. */
export function formatEth(value: string, decimals = 4) {
  const trimmed = new Big(value).round(decimals, Big.roundHalfUp).toFixed()
  return `${trimmed} ETH`
}

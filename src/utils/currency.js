// Supported display currencies with their default rates vs USD
export const CURRENCIES = {
  USD: { symbol: '$',  name: 'US Dollar',         rate: 1       },
  EUR: { symbol: '€',  name: 'Euro',               rate: 0.92    },
  GBP: { symbol: '£',  name: 'British Pound',      rate: 0.79    },
  ARS: { symbol: '$',  name: 'Argentine Peso',     rate: 870     },
  MXN: { symbol: '$',  name: 'Mexican Peso',       rate: 17.2    },
  BRL: { symbol: 'R$', name: 'Brazilian Real',     rate: 4.97    },
  CAD: { symbol: '$',  name: 'Canadian Dollar',    rate: 1.36    },
  JPY: { symbol: '¥',  name: 'Japanese Yen',       rate: 149.5   },
  CLP: { symbol: '$',  name: 'Chilean Peso',       rate: 890     },
  COP: { symbol: '$',  name: 'Colombian Peso',     rate: 3900    },
  UYU: { symbol: '$',  name: 'Uruguayan Peso',     rate: 39.5    },
}

export const CURRENCY_KEYS = Object.keys(CURRENCIES)

// Convert a USD-base amount to display currency
export const toDisplay = (usdAmount, currencyCode, customRates = {}) => {
  const rate = customRates[currencyCode] ?? CURRENCIES[currencyCode]?.rate ?? 1
  return usdAmount * rate
}

// Format an amount in the display currency
export const formatInCurrency = (usdAmount, currencyCode, customRates = {}) => {
  const display = toDisplay(usdAmount, currencyCode, customRates)
  const sym = CURRENCIES[currencyCode]?.symbol ?? '$'
  const abs = Math.abs(display)
  const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs)
  return `${display < 0 ? '-' : ''}${sym}${formatted}`
}

const localKey = (userId) => `spendledger-currency-${userId}`
export const loadCurrencySettings = (userId) => {
  try {
    const r = localStorage.getItem(localKey(userId))
    return r ? JSON.parse(r) : { code: 'USD', customRates: {} }
  } catch { return { code: 'USD', customRates: {} } }
}
export const saveCurrencySettings = (userId, settings) => {
  try { localStorage.setItem(localKey(userId), JSON.stringify(settings)) } catch {}
}

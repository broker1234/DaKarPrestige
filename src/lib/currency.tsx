import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Currency = 'FCFA' | 'EUR' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (price: number) => string;
  convertPrice: (price: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Static exchange rates (approximate)
const EXCHANGE_RATES = {
  FCFA: 1,
  EUR: 1 / 655.957,
  USD: 1 / 600,
};

const CURRENCY_SYMBOLS = {
  FCFA: 'FCFA',
  EUR: '€',
  USD: '$',
};

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>('FCFA');

  const convertPrice = (price: number) => {
    return price * EXCHANGE_RATES[currency];
  };

  const formatPrice = (price: number) => {
    const converted = convertPrice(price);
    const symbol = CURRENCY_SYMBOLS[currency];
    
    if (currency === 'FCFA') {
      return `${Math.round(converted).toLocaleString()} ${symbol}`;
    }
    
    return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, convertPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

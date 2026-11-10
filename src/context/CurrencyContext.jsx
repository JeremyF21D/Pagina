import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { fetchLiveExchangeRates, getCachedExchangeRates, formatVES } from '../services/exchangeRatesService';
import { formatUSD } from '../utils/formatters';

const CurrencyContext = createContext(null);

const STORAGE_KEY_CURRENCY_PREF = 'JF_CURRENCY_PREF';

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENCY_PREF);
      if (saved && ['USD', 'VES_BINANCE', 'VES_BCV'].includes(saved)) return saved;
    }
    return 'USD';
  });

  const [rates, setRates] = useState(() => getCachedExchangeRates() || {
    binance: 1067.45,
    binanceBuy: 1067.45,
    binanceSell: 1068.05,
    bcv: 899.27,
    spreadPct: 18.65,
    lastUpdated: 'Consultando...',
    source: 'Cargando API...'
  });

  const [isLoadingRates, setIsLoadingRates] = useState(false);

  const refreshRates = async () => {
    setIsLoadingRates(true);
    try {
      const data = await fetchLiveExchangeRates();
      if (data && data.success) {
        setRates(data);
      }
    } finally {
      setIsLoadingRates(false);
    }
  };

  useEffect(() => {
    refreshRates();
    const interval = setInterval(refreshRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const setCurrency = (newCurr) => {
    setCurrencyState(newCurr);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_CURRENCY_PREF, newCurr);
      } catch (e) {}
    }
  };

  // Convertidor de USD a VES
  const convertUSDToVES = (usdAmount, target = 'binance') => {
    const num = Number(usdAmount || 0);
    const rate = target === 'bcv' ? (rates.bcv || 0) : (rates.binance || 0);
    return num * rate;
  };

  // Retorna precio primario y secundario para cualquier tarjeta
  const formatDualPrice = useMemo(() => {
    return (usdAmount) => {
      const num = Number(usdAmount || 0);
      const binanceVES = num * (rates.binance || 0);
      const bcvVES = num * (rates.bcv || 0);

      if (currency === 'VES_BINANCE') {
        return {
          primary: formatVES(binanceVES),
          secondary: `${formatUSD(num)} USD`,
          label: 'Tasa Binance P2P',
          rate: rates.binance
        };
      } else if (currency === 'VES_BCV') {
        return {
          primary: formatVES(bcvVES),
          secondary: `${formatUSD(num)} USD`,
          label: 'Tasa Oficial BCV',
          rate: rates.bcv
        };
      } else {
        // Modo USD por defecto
        return {
          primary: formatUSD(num),
          secondary: `≈ ${formatVES(binanceVES)} (Binance)`,
          bcvAlternative: `≈ ${formatVES(bcvVES)} (BCV)`,
          label: 'Dólares Americanos',
          rate: rates.binance
        };
      }
    };
  }, [currency, rates]);

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      rates,
      isLoadingRates,
      refreshRates,
      convertUSDToVES,
      formatDualPrice,
      formatVES,
      formatUSD
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}

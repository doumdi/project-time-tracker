import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

// Common currencies with their symbols
const availableCurrencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' }
];

export const SettingsProvider = ({ children }) => {
  const [hourlyRate, setHourlyRate] = useState(0);
  const [currency, setCurrency] = useState('USD');

  // Load saved settings from localStorage
  useEffect(() => {
    const savedHourlyRate = localStorage.getItem('timetracker-hourly-rate');
    const savedCurrency = localStorage.getItem('timetracker-currency');
    
    if (savedHourlyRate) {
      setHourlyRate(parseFloat(savedHourlyRate));
    }
    
    if (savedCurrency && availableCurrencies.find(c => c.code === savedCurrency)) {
      setCurrency(savedCurrency);
    }
  }, []);

  // Save hourly rate to localStorage
  const updateHourlyRate = (rate) => {
    const numericRate = parseFloat(rate) || 0;
    setHourlyRate(numericRate);
    localStorage.setItem('timetracker-hourly-rate', numericRate.toString());
  };

  // Save currency to localStorage
  const updateCurrency = (currencyCode) => {
    if (availableCurrencies.find(c => c.code === currencyCode)) {
      setCurrency(currencyCode);
      localStorage.setItem('timetracker-currency', currencyCode);
    }
  };

  // Get currency symbol
  const getCurrencySymbol = (currencyCode = currency) => {
    const curr = availableCurrencies.find(c => c.code === currencyCode);
    return curr ? curr.symbol : '$';
  };

  // Format monetary value
  const formatMoney = (amount, currencyCode = currency) => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${amount.toFixed(2)}`;
  };

  // Calculate earnings from minutes
  const calculateEarnings = (minutes) => {
    const hours = minutes / 60;
    return hours * hourlyRate;
  };

  const value = {
    hourlyRate,
    currency,
    availableCurrencies,
    updateHourlyRate,
    updateCurrency,
    getCurrencySymbol,
    formatMoney,
    calculateEarnings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
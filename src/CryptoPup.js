import React, { useState, useEffect, useRef } from 'react';

const COINS = {
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
  dogecoin: 'Dogecoin'
};

const PERIODS = {
    '24h': 'price_change_percentage_24h_in_currency',
    '7d': 'price_change_percentage_7d_in_currency',
    '30d': 'price_change_percentage_30d_in_currency'
  };

const CACHE_DURATION = 60000; // 60 seconds

const CryptoPup = () => {
  const [coin, setCoin] = useState('bitcoin');
  const [period, setPeriod] = useState('24h');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // in-memory cache { bitcoin: { data: ..., timestamp: ... }, ... }
  const cacheRef = useRef({});

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const fetchCoinData = async () => {
      console.log(`Selected coin: ${coin}`);
      setLoading(true);

      const now = Date.now();
      const cached = cacheRef.current[coin];

      if (cached && now - cached.timestamp < CACHE_DURATION) {
        console.log('✅ Using cached data for', coin);
        setData(cached.data);
        setLoading(false);
        return;
      }

      console.log('🆕 Fetching new data for', coin);
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin}&price_change_percentage=24h,7d,30d`
        );
        const json = await res.json();

        console.log('📦 Received data:', json[0]);

        setData(json[0]);
        cacheRef.current[coin] = {
          data: json[0],
          timestamp: now
        };
      } catch (err) {
        console.error('❌ Error fetching data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCoinData();
  }, [coin]);

  const getChange = () => {
    if (!data) return null;
    return data[PERIODS[period]];
  };

  const getMoodImage = (change) => {
    return change >= 0 ? '/happy-dog.webp' : '/sad-dog.webp';
  };

  const getCaption = (change) => {
    return change >= 0 ? 'Crypto Pup is happy!' : 'Crypto Pup is sad.';
  };

  const change = getChange();

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} transition-colors`}>
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center space-y-4 min-h-[400px] transition-all">
  {/* Toggle Button */}
  <div className="flex justify-end">
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="text-sm border px-2 py-1 rounded dark:text-white"
    >
      {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
    </button>
  </div>

  <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Crypto Pup</h1>

  {/* Dropdowns */}
  <div className="space-y-2">
    <select
      value={coin}
      onChange={(e) => setCoin(e.target.value)}
      className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white"
    >
      {Object.entries(COINS).map(([key, label]) => (
        <option key={key} value={key}>{label}</option>
      ))}
    </select>

    <select
      value={period}
      onChange={(e) => setPeriod(e.target.value)}
      className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white"
    >
      {Object.keys(PERIODS).map((p) => (
        <option key={p} value={p}>{p}</option>
      ))}
    </select>
  </div>

  {/* Content */}
  {loading ? (
    <div className="flex flex-col items-center space-y-2 pt-4 animate-pulse text-gray-400 dark:text-gray-500">
      <div className="h-6 w-32 bg-gray-300 dark:bg-gray-600 rounded" />
      <div className="h-4 w-48 bg-gray-300 dark:bg-gray-600 rounded" />
      <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded" />
      <div className="h-52 w-52 bg-gray-300 dark:bg-gray-600 rounded" />
      <div className="h-4 w-40 bg-gray-300 dark:bg-gray-600 rounded" />
    </div>
  ) : data ? (
    <>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{data.name}</h2>
      <p className="text-gray-600 dark:text-gray-300">
        Current Price: ${data.current_price.toLocaleString()}
      </p>
      <p className={`font-medium ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        Change ({period}): {change.toFixed(2)}%
      </p>

      <div className="h-52 w-52 mx-auto overflow-hidden rounded flex items-center justify-center">
        <img
          src={change >= 0 ? '/happy-dog.webp' : '/sad-dog.webp'}
          alt="Crypto pup mood"
          className="max-h-full max-w-full object-contain transition-opacity duration-300"
        />
      </div>

      <p className="font-semibold text-gray-800 dark:text-gray-100">
        {change >= 0 ? 'Crypto Pup is happy!' : 'Crypto Pup is sad.'}
      </p>
    </>
  ) : (
    <p className="text-gray-500 dark:text-gray-400">No data available.</p>
  )}
</div>
    </div>
  );
};

export default CryptoPup;

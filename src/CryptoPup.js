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

  // in-memory cache { bitcoin: { data: ..., timestamp: ... }, ... }
  const cacheRef = useRef({});

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
    <div style={{ textAlign: 'center', fontFamily: 'Arial' }}>
      <h1>Crypto Pup</h1>

      <select
        value={coin}
        onChange={(e) => {
          console.log('🔁 Coin changed to', e.target.value);
          setCoin(e.target.value);
        }}
      >
        {Object.keys(COINS).map((key) => (
          <option key={key} value={key}>
            {COINS[key]}
          </option>
        ))}
      </select>

      <select
        value={period}
        onChange={(e) => {
          console.log('📆 Period changed to', e.target.value);
          setPeriod(e.target.value);
        }}
      >
        {Object.keys(PERIODS).map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      {loading ? (
        <p>Loading...</p>
      ) : data ? (
        <>
          <h2>{data.name}</h2>
          <p>Current Price: ${data.current_price.toLocaleString()}</p>
          <p>Change ({period}): {change?.toFixed(2)}%</p>
          <img
            src={getMoodImage(change)}
            alt="crypto pup mood"
            style={{ maxWidth: '200px' }}
          />
          <p><strong>{getCaption(change)}</strong></p>
        </>
      ) : (
        <p>No data yet.</p>
      )}
    </div>
  );
};

export default CryptoPup;

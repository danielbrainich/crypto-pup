import React, { useState, useEffect, useRef } from "react";
import { Info, ArrowLeft } from 'lucide-react';

const COINS = {
    bitcoin: "Bitcoin",
    ethereum: "Ethereum",
    dogecoin: "Dogecoin",
};

const PERIODS = {
    "24h": "price_change_percentage_24h_in_currency",
    "7d": "price_change_percentage_7d_in_currency",
    "30d": "price_change_percentage_30d_in_currency",
};

const CACHE_DURATION = 60000; // 60 seconds

const CryptoPup = () => {
    const [coin, setCoin] = useState("bitcoin");
    const [period, setPeriod] = useState("24h");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [flipped, setFlipped] = useState(false);
    const [retryToken, setRetryToken] = useState(0);

    // in-memory cache { bitcoin: { data: ..., timestamp: ... }, ... }
    const cacheRef = useRef({});

    useEffect(() => {
        document.documentElement.classList.toggle("dark", darkMode);
    }, [darkMode]);

    useEffect(() => {
        const controller = new AbortController();
        let cancelled = false;

        // Retries once on transient failures (network blips, rate limits, bad
        // response bodies) before giving up and surfacing an error to the user.
        const fetchWithRetry = async (attempt) => {
            try {
                const res = await fetch(
                    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin}&price_change_percentage=24h,7d,30d`,
                    { signal: controller.signal }
                );

                if (!res.ok) {
                    throw new Error(`CoinGecko request failed with status ${res.status}`);
                }

                const json = await res.json();
                const coinData = json[0];

                if (!coinData) {
                    throw new Error("No data returned for this coin");
                }

                if (cancelled) return;
                console.log("📦 Received data:", coinData);
                setData(coinData);
                setError(null);
                cacheRef.current[coin] = { data: coinData, timestamp: Date.now() };
            } catch (err) {
                if (err.name === "AbortError" || cancelled) return;

                if (attempt < 1) {
                    console.warn(`⚠️ Fetch attempt ${attempt + 1} failed, retrying…`, err);
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    if (!cancelled) await fetchWithRetry(attempt + 1);
                    return;
                }

                console.error("❌ Error fetching data", err);
                setError("Couldn't load data. Please try again.");
            }
        };

        const fetchCoinData = async () => {
            console.log(`Selected coin: ${coin}`);
            setLoading(true);
            setError(null);

            const now = Date.now();
            const cached = cacheRef.current[coin];

            if (cached && now - cached.timestamp < CACHE_DURATION) {
                console.log("✅ Using cached data for", coin);
                setData(cached.data);
                setLoading(false);
                return;
            }

            console.log("🆕 Fetching new data for", coin);
            await fetchWithRetry(0);
            if (!cancelled) setLoading(false);
        };

        fetchCoinData();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [coin, retryToken]);

    const handleRetry = () => setRetryToken((t) => t + 1);

    const getChange = () => {
        if (!data) return null;
        return data[PERIODS[period]];
    };

    const getMoodImage = (change) => {
        return change >= 0 ? "/happy-dog.webp" : "/sad-dog.webp";
    };

    const getCaption = (change) => {
        return change >= 0
            ? `${data.name} us up. Uzi is happy!`
            : `${data.name} us down. Uzi is sad.`;
    };

    const change = getChange();

    return (
        <div
            className={`min-h-screen flex items-center justify-center ${
                darkMode ? "bg-gray-900" : "bg-gray-100"
            } transition-colors`}
        >
            <div className="perspective w-full max-w-md relative">
                <div
                    className={`relative w-full h-[640px] transition-transform duration-500 transform-style-preserve-3d ${
                        flipped ? "rotate-y-180" : ""
                    }`}
                >
                    {/* FRONT SIDE */}
                    <div className="absolute w-full h-full backface-hidden p-6 bg-white dark:bg-gray-800 rounded-xl text-center space-y-4 min-h-[400px]">
                    <div className="">

                        {/* I Button */}
                        <button
                            onClick={() => setFlipped(true)}
                            className="absolute top-5 left-4 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white text-xl"
                            aria-label="Show Info"
                        >
                            <Info size={28} strokeWidth={2} />
                        </button>

                        {/* Dark mode toggle */}
                        <div className="flex justify-end">
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className={`relative w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
                                    darkMode ? "bg-yellow-400" : "bg-gray-400"
                                }`}
                                aria-label="Toggle dark mode"
                            >
                                <span
                                    className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                                        darkMode
                                            ? "translate-x-6"
                                            : "translate-x-0"
                                    }`}
                                />
                            </button>
                        </div>

                        </div>

                        <h1 className="text-2xl font-bold font-jet text-gray-800 dark:text-gray-100">
                            CryptoPup
                        </h1>

                        {/* Dropdowns */}
                        <div className="space-y-2">
                            <select
                                value={coin}
                                onChange={(e) => setCoin(e.target.value)}
                                className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-0 font-jet"
                            >
                                {Object.entries(COINS).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="w-full p-2 rounded border dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-0 font-jet"
                            >
                                {Object.keys(PERIODS).map((p) => (
                                    <option key={p} value={p}>
                                        {p}
                                    </option>
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
                        ) : error ? (
                            <div className="flex flex-col items-center space-y-3 pt-4">
                                <p className="text-red-500 dark:text-red-400 font-jet">
                                    {error}
                                </p>
                                <button
                                    onClick={handleRetry}
                                    className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 font-jet"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : data ? (
                            <>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 font-jet">
                                    {data.name}
                                </h2>
                                <div className="space-y-0">
                                    <p className="text-gray-800 dark:text-gray-300 font-jet">
                                        Current Price: $
                                        {data.current_price.toLocaleString()}
                                    </p>
                                    <p
                                        className={`font-medium ${
                                            change >= 0
                                                ? "text-green-500"
                                                : "text-red-500"
                                        } font-jet`}
                                    >
                                        Change ({period}): {change.toFixed(2)}%
                                    </p>
                                </div>
                                <div className="h-52 w-52 mx-auto overflow-hidden rounded flex items-center justify-center">
                                    <img
                                        src={getMoodImage(change)}
                                        alt="Crypto pup mood"
                                        className="max-h-full max-w-full object-contain transition-opacity duration-300"
                                    />
                                </div>
                                <p className="font-medium text-gray-800 dark:text-gray-100 font-jet">
                                    {getCaption(change)}
                                </p>
                            </>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400">
                                No data available.
                            </p>
                        )}
                    </div>

                    {/* BACK SIDE */}
                    <div className="absolute w-full h-full rotate-y-180 backface-hidden p-6 bg-white dark:bg-gray-800 rounded-xl text-center min-h-[400px] flex flex-col justify-center">
                        <button
                            onClick={() => setFlipped(false)}
                            className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white text-xl"
                            aria-label="Back to main"
                        >
                            <ArrowLeft size={28} />
                        </button>

                        <div className="flex-1 flex flex-col justify-center items-center px-4">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white font-jet">
                                About CryptoPup
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 mt-4 text-sm font-jet leading-relaxed">
                            My dog Uzi sold his treats 🍗 and went all in on crypto.
                            <br /><br />
                            Now you can watch price movements and chase gains 🚀 with him.

                                <br /><br />
                                Built with React + Tailwind. 💻
                            </p><br />
                            🐕
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-jet">
                            © 2025 Daniel Brainich 
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CryptoPup;

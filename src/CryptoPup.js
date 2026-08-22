import React, { useState, useEffect, useRef, useCallback } from "react";
import { Info, ArrowLeft } from 'lucide-react';
import Sparkline from "./Sparkline";
import { readEntry, writeEntry } from "./persistentCache";

const COIN_ID = "bitcoin";

const TREND_LABELS = {
    "24h": "Last 24 hours",
    "1w": "Last 7 days",
    "1m": "Last 30 days",
};

// A Netlify scheduled function refreshes this coin's price + 30-day chart
// every 15 minutes and caches it in Netlify Blobs (see netlify/functions).
// The client only ever talks to this same-origin endpoint, never to
// CoinGecko directly, so no visitor is exposed to CoinGecko's rate limits.
const CRYPTO_DATA_URL = "/api/crypto-data";

// One 30-day hourly series per coin, sliced client-side per period. The %
// change shown for each period is derived from this same series (first
// point vs. last), not CoinGecko's price_change_percentage field, for
// consistency across all three periods from a single fetch.
const SLICE_POINTS = {
    "24h": 24,
    "1w": 24 * 7,
    "1m": Infinity,
};

const sliceChartData = (prices, periodKey) => {
    if (!prices) return null;
    const n = SLICE_POINTS[periodKey];
    return Number.isFinite(n) ? prices.slice(-n) : prices;
};

// The server-side cache only turns over every 15 minutes, so there's no
// benefit to the client re-fetching more often than that.
const CACHE_DURATION = 5 * 60 * 1000;

const fetchJson = async (url) => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
    }
    return res.json();
};

// Retries once on a transient network blip.
const withRetry = async (task, attempt = 0) => {
    try {
        return await task();
    } catch (err) {
        if (attempt < 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return withRetry(task, attempt + 1);
        }
        throw err;
    }
};

const CryptoPup = () => {
    const [period, setPeriod] = useState("24h");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [flipped, setFlipped] = useState(false);
    const [retryToken, setRetryToken] = useState(0);
    const [chartRawData, setChartRawData] = useState(null);

    // in-memory cache { bitcoin: { data: { price, prices }, timestamp: ... }, ... }
    const cacheRef = useRef({});
    // in-flight promise, keyed the same way, so concurrent callers for the
    // same coin share one request instead of firing twice.
    const pendingRef = useRef({});

    // Checks the in-memory cache first, then falls back to the localStorage
    // mirror — populated by an earlier load in this tab, a reload, or
    // another tab entirely — before deciding a fetch is actually needed.
    const freshEntry = (coinId) => {
        const inMemory = cacheRef.current[coinId];
        if (inMemory && Date.now() - inMemory.timestamp < CACHE_DURATION) {
            return inMemory;
        }
        const persisted = readEntry("crypto", coinId);
        if (persisted && Date.now() - persisted.timestamp < CACHE_DURATION) {
            cacheRef.current[coinId] = persisted;
            return persisted;
        }
        return null;
    };

    const getOrFetchCryptoData = useCallback((coinId) => {
        const cached = freshEntry(coinId);
        if (cached) {
            return Promise.resolve(cached.data);
        }
        if (pendingRef.current[coinId]) {
            return pendingRef.current[coinId];
        }

        const request = withRetry(async () => {
            const json = await fetchJson(`${CRYPTO_DATA_URL}?coin=${coinId}`);
            if (!json.price || !json.prices || json.prices.length < 2) {
                throw new Error("Incomplete data returned");
            }
            const timestamp = Date.now();
            cacheRef.current[coinId] = { data: json, timestamp };
            writeEntry("crypto", coinId, json, timestamp);
            return json;
        }).finally(() => {
            delete pendingRef.current[coinId];
        });

        pendingRef.current[coinId] = request;
        return request;
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle("dark", darkMode);
    }, [darkMode]);

    useEffect(() => {
        let cancelled = false;
        if (!freshEntry(COIN_ID)) {
            setLoading(true);
        }
        setError(null);

        getOrFetchCryptoData(COIN_ID)
            .then((json) => {
                if (cancelled) return;
                setData(json.price);
                setChartRawData(json.prices);
                setError(null);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("❌ Error fetching data", err);
                setError("Couldn't load data. Please try again.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [retryToken, getOrFetchCryptoData]);

    const handleRetry = () => setRetryToken((t) => t + 1);

    const getMoodImage = (change) => {
        return change >= 0 ? "/happy-dog.webp" : "/sad-dog.webp";
    };

    const chartData = sliceChartData(chartRawData, period);
    const change =
        chartData && chartData.length >= 2 && chartData[0][1]
            ? ((chartData[chartData.length - 1][1] - chartData[0][1]) / chartData[0][1]) * 100
            : null;

    return (
        <div
            className={`min-h-dvh flex items-center justify-center ${
                darkMode ? "bg-gray-900" : "bg-gray-100"
            } transition-colors`}
        >
            <div className="w-full sm:max-w-md relative sm:[perspective:1000px]">
                <div
                    className={`relative w-full h-dvh sm:h-[600px] overflow-hidden sm:overflow-visible transition-transform duration-500 ease-in-out sm:[transform-style:preserve-3d] ${
                        flipped ? "sm:[transform:rotateY(180deg)]" : ""
                    }`}
                >
                <div
                    className={`flex w-[200%] h-full transition-transform duration-500 ease-in-out sm:contents ${
                        flipped ? "-translate-x-1/2" : "translate-x-0"
                    }`}
                >
                    {/* FRONT SIDE */}
                    <div className="w-1/2 h-full shrink-0 sm:w-full sm:h-full sm:absolute sm:inset-0 sm:[backface-visibility:hidden] pt-[calc(env(safe-area-inset-top)+clamp(0.75rem,4dvh,2.5rem))] px-6 pb-[calc(env(safe-area-inset-bottom)+clamp(0.75rem,2.5dvh,1.5rem))] bg-gray-100 dark:bg-gray-900 sm:bg-white sm:dark:bg-gray-800 rounded-none sm:rounded-xl text-center flex flex-col gap-[clamp(0.5rem,2dvh,1.25rem)] sm:gap-3 sm:pt-7 sm:pb-4 min-h-[400px]">
                    <div className="flex items-center">
                        {/* I Button */}
                        <div className="flex-1 flex justify-start">
                            <button
                                onClick={() => setFlipped(true)}
                                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white"
                                aria-label="Show Info"
                            >
                                <Info size={24} strokeWidth={2} />
                            </button>
                        </div>

                        <h1 className="text-2xl sm:text-xl font-bold font-jet text-gray-800 dark:text-gray-100 whitespace-nowrap">
                            CryptoPup
                        </h1>

                        {/* Dark mode toggle */}
                        <div className="flex-1 flex justify-end">
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

                        {/* Period selector */}
                        <div
                            className="relative grid rounded-full bg-gray-200 dark:bg-gray-700 px-[5px] py-1 w-fit mx-auto mt-[clamp(0.5rem,2dvh,1rem)]"
                            style={{
                                gridTemplateColumns: `repeat(${Object.keys(SLICE_POINTS).length}, 1fr)`,
                            }}
                        >
                            <div
                                className="absolute left-[5px] top-1 bottom-1 rounded-full bg-white dark:bg-gray-500 shadow transition-transform duration-300 ease-out"
                                style={{
                                    width: `calc((100% - 10px) / ${Object.keys(SLICE_POINTS).length})`,
                                    transform: `translateX(${
                                        Object.keys(SLICE_POINTS).indexOf(period) * 100
                                    }%)`,
                                }}
                            />
                            {Object.keys(SLICE_POINTS).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`relative z-10 px-4 py-1 text-sm rounded-full font-jet transition-colors ${
                                        period === p
                                            ? "text-gray-800 dark:text-gray-100"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    }`}
                                >
                                    {p.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        {loading ? (
                            <div className="flex flex-col items-center space-y-2 pt-2 animate-pulse text-gray-400 dark:text-gray-500">
                                <div className="h-4 w-40 bg-gray-300 dark:bg-gray-600 rounded" />
                                <div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded" />
                                <div className="h-[clamp(6rem,22dvh,14rem)] w-[clamp(6rem,22dvh,14rem)] sm:h-44 sm:w-44 bg-gray-300 dark:bg-gray-600 rounded" />
                                <div className="h-4 w-36 bg-gray-300 dark:bg-gray-600 rounded" />
                                <div className="h-[clamp(4rem,16dvh,10rem)] sm:h-24 w-full bg-gray-300 dark:bg-gray-600 rounded" />
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
                                <div className="space-y-0.5 sm:space-y-0 text-base sm:text-sm mt-auto">
                                    <p className="text-gray-800 dark:text-gray-300 font-jet">
                                        {data.name} Price: $
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
                                <div className="h-[clamp(6rem,22dvh,14rem)] w-[clamp(6rem,22dvh,14rem)] sm:h-44 sm:w-44 mx-auto overflow-hidden rounded flex items-center justify-center">
                                    <img
                                        src={getMoodImage(change)}
                                        alt="Crypto pup mood"
                                        className="max-h-full max-w-full object-contain transition-opacity duration-300"
                                    />
                                </div>
                                <div className="w-full px-2 pt-4 mt-auto">
                                    <Sparkline
                                        prices={chartData}
                                        period={period}
                                        positive={change >= 0}
                                        darkMode={darkMode}
                                    />
                                    <p className="text-sm sm:text-xs text-gray-400 dark:text-gray-500 font-jet mt-1 text-left">
                                        {TREND_LABELS[period]}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400">
                                No data available.
                            </p>
                        )}
                    </div>

                    {/* BACK SIDE */}
                    <div className="relative w-1/2 h-full shrink-0 sm:w-full sm:h-full sm:absolute sm:inset-0 sm:[backface-visibility:hidden] sm:[transform:rotateY(180deg)] pt-[calc(env(safe-area-inset-top)+clamp(0.75rem,4dvh,2.5rem))] px-6 pb-[calc(env(safe-area-inset-bottom)+clamp(0.75rem,2.5dvh,1.5rem))] sm:p-6 bg-gray-100 dark:bg-gray-900 sm:bg-white sm:dark:bg-gray-800 rounded-none sm:rounded-xl text-center min-h-[400px] flex flex-col sm:justify-center">
                        <div className="flex items-center h-8 sm:hidden">
                            <button
                                onClick={() => setFlipped(false)}
                                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white"
                                aria-label="Back to main"
                            >
                                <ArrowLeft size={24} strokeWidth={2} />
                            </button>
                        </div>
                        <button
                            onClick={() => setFlipped(false)}
                            className="hidden sm:block absolute top-4 left-4 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white text-xl"
                            aria-label="Back to main"
                        >
                            <ArrowLeft size={28} />
                        </button>

                        <div className="flex-1 flex flex-col justify-center items-center px-4">
                            <h2 className="text-2xl sm:text-xl font-bold text-gray-800 dark:text-white font-jet">
                                About CryptoPup
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 mt-4 text-base sm:text-sm font-jet leading-relaxed">
                            My dog Uzi sold his treats 🍗 and went all in on crypto.
                            <br /><br />
                            Now you can watch price movements and chase gains 🚀 with him.

                                <br /><br />
                                Built with React + Tailwind. 💻
                            </p><br />
                            🐕
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-jet">
                            © 2026 Daniel Brainich
                        </p>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
};

export default CryptoPup;

const COIN_ID = "bitcoin";
// 90 is the top of CoinGecko's hourly-granularity window (above that it
// drops to daily candles), so this is the longest range we can offer
// without changing how the chart data looks.
const CHART_DAYS = 90;

const PRICE_URL = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COIN_ID}`;
const CHART_URL = `https://api.coingecko.com/api/v3/coins/${COIN_ID}/market_chart?vs_currency=usd&days=${CHART_DAYS}`;

// Single source of truth for talking to CoinGecko, shared by the scheduled
// refresh function and the on-demand read function's cold-start fallback.
export const fetchCryptoData = async () => {
    const [priceRes, chartRes] = await Promise.all([
        fetch(PRICE_URL),
        fetch(CHART_URL),
    ]);

    if (!priceRes.ok || !chartRes.ok) {
        throw new Error(
            `CoinGecko request failed (price ${priceRes.status}, chart ${chartRes.status})`
        );
    }

    const [priceJson, chartJson] = await Promise.all([
        priceRes.json(),
        chartRes.json(),
    ]);

    const price = priceJson[0];
    const prices = chartJson.prices;

    if (!price || !prices || prices.length < 2) {
        throw new Error("Incomplete data returned from CoinGecko");
    }

    return { price, prices, fetchedAt: Date.now() };
};

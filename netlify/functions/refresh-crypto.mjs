import { getStore } from "@netlify/blobs";
import { fetchCryptoData } from "./lib/fetch-crypto-data.mjs";

// Runs on Netlify's own schedule (not triggered by visitors), so this is the
// only thing that ever calls CoinGecko. At every 15 minutes that's ~5,760
// CoinGecko calls/month (2 calls/run), comfortably under the ~10k/month free
// quota regardless of how much traffic the site gets.
export default async () => {
    const store = getStore("crypto-cache");
    const data = await fetchCryptoData();
    await store.setJSON("bitcoin", data);
};

export const config = {
    schedule: "*/15 * * * *",
};

import { getStore } from "@netlify/blobs";
import { fetchCryptoData } from "./lib/fetch-crypto-data.mjs";

// What the client actually calls. Just reads the blob the scheduled
// function keeps warm — never talks to CoinGecko itself, except once on a
// cold start (first deploy, before the schedule has ticked yet) so the app
// isn't stuck waiting up to 15 minutes for its first byte of data.
export default async () => {
    const store = getStore("crypto-cache");
    let data = await store.get("bitcoin", { type: "json" });

    if (!data) {
        data = await fetchCryptoData();
        await store.setJSON("bitcoin", data);
    }

    return new Response(JSON.stringify(data), {
        headers: {
            "content-type": "application/json",
            // Lets Netlify's CDN absorb bursts of visitors between refreshes
            // instead of every request reaching this function.
            "cache-control": "public, max-age=60, stale-while-revalidate=840",
        },
    });
};

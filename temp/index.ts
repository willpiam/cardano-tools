import { BlockFrostAPI } from 'npm:@blockfrost/blockfrost-js';

const CONCH_NFT = Deno.env.get("CONCH_NFT");
const MAIN_ADDRESS = Deno.env.get("MAIN_ADDRESS");
const BLOCKFROST_PROJECT_ID = Deno.env.get("BLOCKFROST_PROJECT_ID");

console.log(CONCH_NFT, MAIN_ADDRESS, BLOCKFROST_PROJECT_ID);

if (!CONCH_NFT || !MAIN_ADDRESS || !BLOCKFROST_PROJECT_ID) {
    throw new Error("Missing environment variables");
}

const hasCip20Metadata = (tx: any) => {
    const metadata = tx.metadata

    if (metadata.length === 0) {
        return false;
    }

    const labels = metadata.map((m) => m.label);
    return labels.includes("674");
}

const collectTransactionMetadata = async (API: BlockFrostAPI, history: any[]) => {
    return await Promise.all(history.map(async (tx) => {
        const metadata = await API.txsMetadata(tx.tx_hash);
        return {
            tx: tx.tx_hash,
            metadata
        };
    }));
}

const formatCip20Message = (jsonMetadata: any) => {
    // CIP-20 metadata is usually { msg: string | string[] }, but some txs store the message directly.
    const payload = jsonMetadata?.msg ?? jsonMetadata;

    if (typeof payload === "string") {
        return payload;
    }

    if (Array.isArray(payload)) {
        return payload.join("");
    }

    return "";
}

const buildFormatedMessages = (messageTxs: any[], history: any[]) => {
    return messageTxs.map((tx) => {
        const messageMetadata = tx.metadata.find((m) => m.label === "674")?.json_metadata;
        const timestamp = history.find((h) => h.tx_hash === tx.tx)?.block_time ?? 0;

        return {
            tx: tx.tx,
            url: `https://cexplorer.io/tx/${tx.tx}`,
            timestamp: new Date(timestamp * 1000).toLocaleString(),
            message: formatCip20Message(messageMetadata)
        }
    });
}

const buildHistory = async (API: BlockFrostAPI, request: any, amount: number) => {
    if (amount <= 100) // handle easy case
        return await request({
            count: amount,
            page: 1,
            order: 'asc',
        });

    const pages = Math.ceil(amount / 100);
    const requests = Array.from({ length: pages }, (_, i) => i + 1).map((page) => request({
        count: 100,
        page: page,
        order: 'asc',
    }));

    const history = await Promise.all(requests);

    return history.flat();
}

const getAddressTransactionCount = async (API: BlockFrostAPI, address: string) => {
    const addressDetails = await API.addressesTotal(address);
    return addressDetails.tx_count;
}

export async function getNFTCip20History(API: BlockFrostAPI, policyId: string, amount: number) {

    try {
        const assets = await API.assetsPolicyById(policyId);

        const { asset, quantity } = assets[0];
        const assetHistory = await buildHistory(API, (a: any) => API.assetsTransactions(asset, a), amount);

        const metadata = await collectTransactionMetadata(API, assetHistory);
        const messageTxs = metadata.filter(hasCip20Metadata);

        const messageList = buildFormatedMessages(messageTxs, assetHistory);
        return messageList;
    } catch (err) {
        console.log("error", err);
        return []
    }
}

export async function getAddressMetadataHistory(API: BlockFrostAPI, address: string, _amount: number = 0) {
    const amount = _amount > 0 ? _amount : await getAddressTransactionCount(API, address);
    try {
        const addressHistory = await buildHistory(API, (a: any) => API.addressesTransactions(address, a), amount);
        const metadata = await collectTransactionMetadata(API, addressHistory);
        const txsWithMetadata = metadata.filter((tx) => tx.metadata.length > 0);
        return txsWithMetadata.map((tx) => {
            const timestamp = addressHistory.find((h: any) => h.tx_hash === tx.tx)?.block_time ?? 0;
            return {
                tx: tx.tx,
                url: `https://cexplorer.io/tx/${tx.tx}`,
                timestamp: new Date(timestamp * 1000).toLocaleString(),
                metadata: tx.metadata,
            };
        });
    } catch (err) {
        console.log("error", err);
        return [];
    }
}

export async function getAddressCip20History(API: BlockFrostAPI, address: string, _amount: number = 0) {
    const amount = _amount > 0 ? _amount : await getAddressTransactionCount(API, address);
    try {
        const addressHistory = await buildHistory(API, (a: any) => API.addressesTransactions(address, a), amount);
        const metadata = await collectTransactionMetadata(API, addressHistory);
        const messageTxs = metadata.filter(hasCip20Metadata);
        const messageList = buildFormatedMessages(messageTxs, addressHistory);
        return messageList;
    } catch (err) {
        console.log("error", err);
        return []
    }
}


async function getAndDisplayConchMessages(API: BlockFrostAPI) {
    const timestampedMessages = await getNFTCip20History(API, CONCH_NFT, 40);

    timestampedMessages.forEach((msg, index) => {
        // console.table(msg)
        console.log(`${index}. `, msg)
    })

    return
}

async function getAndDisplayAddressCip20History(API: BlockFrostAPI) {
    console.log(`Collecting Messages From Address`)
    const timestampedMessages2 = await getAddressCip20History(API, MAIN_ADDRESS);

    timestampedMessages2.forEach((msg) => {
        console.table(msg)
    })

    return
}

async function main() {

    const API = new BlockFrostAPI({
        projectId: BLOCKFROST_PROJECT_ID,
    });

    await getAndDisplayConchMessages(API)        // conch
}

if (import.meta.main) {
    main();
}

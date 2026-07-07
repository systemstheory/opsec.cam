import { createPublicClient, createWalletClient, custom, http, toHex, type Abi } from 'viem';
import { PUBLIC_OPSEC_CAMERA_ADDRESS, PUBLIC_NETWORK } from '$env/static/public';
import abiJSON from '$lib/abi/OpsecCamera.json';

const abi = abiJSON as Abi;
const contractAddress = PUBLIC_OPSEC_CAMERA_ADDRESS as `0x${string}`;

export type NFTMetadata = {
	tokenId: bigint;
	owner: `0x${string}`;
	uri: string;
};

export async function connectWallet(): Promise<`0x${string}`> {
	const walletClient = createWalletClient({
		chain: PUBLIC_NETWORK,
		transport: custom((window as any).ethereum)
	});
	const [account] = await walletClient.requestAddresses();
	return account;
}

export async function advertise(
	account: `0x${string}`,
	proof: Uint8Array,
	instances: bigint[]
): Promise<`0x${string}`> {
	const walletClient = createWalletClient({
		chain: PUBLIC_NETWORK,
		transport: custom((window as any).ethereum)
	});

	const publicClient = createPublicClient({
		chain: PUBLIC_NETWORK,
		transport: http()
	});

	const { request } = await publicClient.simulateContract({
		address: contractAddress,
		abi,
		functionName: 'mint',
		args: [toHex(proof), instances],
		account
	});

	return walletClient.writeContract(request);
}

export async function fetch(cursor: [start: number, end: number]): Promise<NFTMetadata[]> {
	const [start, end] = cursor;
	const publicClient = createPublicClient({ chain: PUBLIC_NETWORK, transport: http() });

	const tokenIds = (
		await publicClient.multicall({
			contracts: Array.from({ length: end - start }, (_, i) => ({
				address: contractAddress,
				abi,
				functionName: 'tokenByIndex',
				args: [BigInt(start + i)]
			}))
		})
	).map((r) => r.result as bigint);

	const meta = await publicClient.multicall({
		contracts: tokenIds.flatMap((tokenId) => [
			{ address: contractAddress, abi, functionName: 'ownerOf', args: [tokenId] },
			{ address: contractAddress, abi, functionName: 'tokenURI', args: [tokenId] }
		])
	});

	return tokenIds.map((tokenId, i) => ({
		tokenId,
		owner: meta[i * 2].result as `0x${string}`,
		uri: meta[i * 2 + 1].result as string
	}));
}

export function shortenAddress(address: Address): string {
	return `${address.slice(0, 5)}...${address.slice(-3, 0)}`;
}

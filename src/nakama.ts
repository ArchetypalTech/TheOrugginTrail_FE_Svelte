import { Client, Session } from "@heroiclabs/nakama-js";
import { generateUUID } from "three/src/math/MathUtils.js";
import { updateScene } from "./three";

const serverkey = "defaultkey";
const ipLocal = "127.0.0.1";
const ip = "16.16.204.57";
const port = "7350";
const port2 = "7348";
const key = "@MyApp:deviceKey";

const useSSL = true; // Enable if server is run with an SSL certificate.
const client = new Client(serverkey, ip, port2, useSSL, 100000, true);

const socket = client.createSocket(useSSL);
let session: Session | null = null;
let account: any | null = null;

// NO LONGER IN USE AS THIS WAS CALLED ON MOUNT
export async function authenticateUser(username: string, roomNumber: number) {
	let deviceId: string | null = null;
	// If the user's device ID is already stored, grab that - alternatively get the System's unique device identifier.
	const value = localStorage.getItem(key);
	if (value !== null) {
		deviceId = value;
	} else {
		deviceId = generateUUID();
		// Save the user's device ID so it can be retrieved during a later play session for re-authenticating.
		localStorage.setItem(key, deviceId);
	}

	// Authenticate with the Nakama server using Device Authentication.
	const create = true;
	session = await client.authenticateDevice(deviceId, create, username);
	
	let appearOnline = true;
	await socket.connect(session, appearOnline);

	setInterval(async () => {
		if (session?.isexpired(Date.now()) || session?.isexpired(Date.now() + 1)) {
			try {
				// Attempt to refresh the existing session.
				session = await client.sessionRefresh(session);
			} catch (error) {
				if (deviceId === null) {
					return;
				}
				// Couldn't refresh the session so reauthenticate.
				session = await client.authenticateDevice(deviceId);
				const refreshToken = session.refresh_token;
			}
			const authToken = session.token;
		}
	}, 1);

	window.addEventListener("beforeunload", async () => {
		await socket.disconnect(true);
		if (session) {
			await client.sessionLogout(session, session.token, session.refresh_token);
		}
	});

	account = await client.getAccount(session);

	const response = await client
		.rpc(session, "nakama/claim-persona", { personaTag: account.user?.username })
		.catch((error) => {
			console.error("claim persona error: ", error);
		});
	console.log("claim persona response: ", response);
	
	
	await socket
		.rpc("tx/game/create-player", JSON.stringify({ PlayerName: account.user?.username, RoomID: 0 }))
		.catch((error) => {
			console.error("create player error: ", error);
		})
		.then((response) => {
			console.log("create persona response: ", response);
		});
	
	// return response.payload;
}


let createPlayersResolves: Record<string, (value: string | PromiseLike<string>) => void> = {};
let playerNameL: string;

export async function createPlayer(
	playerName: string,
	room : number,
	resolve: (value: string | PromiseLike<string>) => void) 
	{
		playerNameL = playerName
		
	let deviceId: string | null = null;
	// If the user's device ID is already stored, grab that - alternatively get the System's unique device identifier.
	const value = localStorage.getItem(key);
	if (value !== null) {
		deviceId = value;
	} else {
		deviceId = generateUUID();
		// Save the user's device ID so it can be retrieved during a later play session for re-authenticating.
		localStorage.setItem(key, deviceId);
	}

	// Authenticate with the Nakama server using Device Authentication.
	const create = true;
	session = await client.authenticateDevice(deviceId, create, playerNameL);

	let appearOnline = true;
	await socket.connect(session, appearOnline);

	setInterval(async () => {
		if (session?.isexpired(Date.now()) || session?.isexpired(Date.now() + 1)) {
			try {
				// Attempt to refresh the existing session.
				session = await client.sessionRefresh(session);
			} catch (error) {
				if (deviceId === null) {
					return;
				}
				// Couldn't refresh the session so reauthenticate.
				session = await client.authenticateDevice(deviceId);
				const refreshToken = session.refresh_token;
			}
			const authToken = session.token;
		}
	}, 1);

	window.addEventListener("beforeunload", async () => {
		await socket.disconnect(true);
		if (session) {
			await client.sessionLogout(session, session.token, session.refresh_token);
		}
	});

	account = await client.getAccount(session);

	
	const response = await client
		.rpc(session, "nakama/claim-persona", { personaTag: playerNameL })
		.catch((error) => {
			console.error("claim persona error: ", error);
		});
	console.log("claim persona response: ", response);

	const responseSocket = await socket
		.rpc("tx/game/create-player", JSON.stringify({ PlayerName: playerNameL, RoomID: room }))
		createPlayersResolves[JSON.parse(responseSocket.payload as any).TxHash] = resolve;
}

export async function logout() {
	await socket.disconnect(true);
	if (session) {
		await client.sessionLogout(session, session.token, session.refresh_token);
	}
	localStorage.removeItem("@MyApp:deviceKey");
	localStorage.removeItem("username");
}

let commandProcessResolves: Record<string, (value: string | PromiseLike<string>) => void> = {};

export async function processCommand(
	command: string,
	resolve: (value: string | PromiseLike<string>) => void
) {
	const data = { PlayerName: playerNameL, Tokens: command.split(" ") };
	const responseSocket = await socket.rpc("tx/game/process-commands", JSON.stringify(data));
	// map the hash to the resolve of the promise, so it can be called in socket.onnotification
	commandProcessResolves[JSON.parse(responseSocket.payload as any).TxHash] = resolve;
}

socket.onnotification = (matchData) => {
	// grab the hash and check if a resolve exists for it
	const hash = (matchData.content as any).txHash;
	// add further if statements to check for other transactions in the future
	if (createPlayersResolves[hash]) {
		const response = (matchData.content as any).result.RoomDescription;
		updateScene(response);
		createPlayersResolves[hash](response);
		delete createPlayersResolves[hash];
	}

	if (commandProcessResolves[hash]) {
		const response = (matchData.content as any).result.Result;
		updateScene(response);
		commandProcessResolves[hash](response);
		delete commandProcessResolves[hash];
	}
};

import { Client, Session } from "@heroiclabs/nakama-js";
import { generateUUID } from "three/src/math/MathUtils.js";

const serverkey = "defaultkey";
const username = "mycustomusername";
const ip = "127.0.0.1";
const port = "7350";
const key = "@MyApp:deviceKey";

const client = new Client(serverkey, ip, port, undefined, 10000);

const socket = client.createSocket();
let session: Session | null = null;

export async function authenticateUser() {
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

	const account = await client.getAccount(session);

	await client.rpc(session, "nakama/claim-persona", { personaTag: account.user?.username });
	await socket.rpc(
		"tx/game/create-player",
		JSON.stringify({ PlayerName: account.user?.username, RoomID: "0" })
	);
}

export async function processCommand(command: string) {
	const responseSocket = await socket.rpc(
		"tx/game/process-command",
		JSON.stringify({ Command: command })
	);
	return responseSocket.payload;
}
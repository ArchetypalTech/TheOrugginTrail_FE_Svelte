import { processCommand } from "../nakama";

export function sendCommand(command: string): Promise<string> {
	return new Promise(async (resolve, reject) => {
		await processCommand(command, resolve); // promise is resolved in socket.onnotification
	});
}

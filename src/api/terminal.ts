import { processCommand } from "../nakama";
import { updateScene } from "../three";

export function sendCommand(command: string): Promise<string> {
	return new Promise(async (resolve, reject) => {
		const response = (await processCommand(command)) || "No response";
		updateScene(response);
		resolve(response);
	});
}

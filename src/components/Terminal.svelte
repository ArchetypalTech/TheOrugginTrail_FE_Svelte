<script lang="ts">
	import { onMount, tick } from "svelte";
	import { sendCommand } from "../api/terminal";
	import { sendCreatePlayer } from "../api/terminal";
	import { authenticateUser, logout } from "../nakama";
	import { int, string } from "three/examples/jsm/nodes/Nodes.js";

	let headerText = [
		"Archetypal Tech welcomes you to DEATH",
		"well possibly...",
		"\n",
		"The O'Ruggin Trail, no:23",
		"from the good folk at",
	];
	let inputValue = "";
	let originalInputValue = "";
	let terminalContent: string[] = [];
	let inputHistory: string[] = [];
	let inputHistoryIndex = 0;
	let terminalForm: HTMLFormElement;
	let terminalInput: HTMLInputElement;


	let step = 0;
  	let username = "";
  	let roomID = 0;

	// let isLoggedIn = false;

	// onMount(async () => {
	// 	if (!isLoggedIn) {
	// 		if (localStorage.getItem("@MyApp:deviceKey") != null) {
	// 			await authenticateUser(localStorage.getItem("@MyApp:deviceKey")!, 0); // room number does not matter on login, only on creation.
	// 			isLoggedIn = true;
	// 			terminalContent = [
	// 				...terminalContent,
	// 				"You have been logged in as " + localStorage.getItem("username") + "!",
	// 			];
	// 			return;
	// 		}
	// 	}
	// 	terminalContent = [...terminalContent, "Please enter your username to login."];
	// });

	function handleKeyDown(e: KeyboardEvent) {
		// up down cycle through prevInputs or back to originalInputValue
		if (e.key === "ArrowUp") {
			e.preventDefault();
			if (inputHistoryIndex === 0) {
				originalInputValue = inputValue;
			}
			if (inputHistoryIndex < inputHistory.length) {
				inputHistoryIndex++;
				inputValue = inputHistory[inputHistory.length - inputHistoryIndex];
			}
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			if (inputHistoryIndex > 0) {
				inputHistoryIndex--;
				if (inputHistoryIndex === 0) {
					inputValue = originalInputValue;
				} else {
					inputValue = inputHistory[inputHistory.length - inputHistoryIndex];
				}
			}
		}
	}

	async function submitForm(e: SubmitEvent) {
		e.preventDefault();
		const command = inputValue;
		inputHistoryIndex = 0;
		if (command === "") return;
		
		// Handle Create Player sequence
		if (command === "Create Player") {
			terminalContent = [...terminalContent, "How will you be known as MORTAL?"];
			step = 1;
		} else if (step === 1) {
			username = command;
			terminalContent = [...terminalContent, `You are now ${username}`];
			terminalContent = [...terminalContent, "Where will you be summoned? 1, 2, or 3?"];
			step = 2;
		} else if (step === 2) {
			roomID = Number(command);
			if ([0, 1, 2].includes(roomID)) {
				terminalContent = [...terminalContent, `You are entering room ${roomID}. I hope that you don't die soon MORTAL!`];
				step = 3;
				try {
					const response = await sendCreatePlayer(username, roomID);
					terminalContent = [...terminalContent, response];
				} catch (e) {
					console.error(e);
				}
				inputValue = "";
				await tick();
				terminalForm.scrollTo({ left: 0, top: terminalForm.scrollHeight, behavior: "smooth" });
				return; // Exit early to prevent further command processing
			} else {
				terminalContent = [...terminalContent, "Invalid room ID. Please enter 1, 2, or 3."];
			}
			
		}

		inputValue = "";
		await tick();

		// Handle clear command
		if (command === "clear") {
			terminalContent = [];
			inputValue = "";
			return;
		}
		
		// Regular command execution
		if (step === 3) {
			inputHistory = [...inputHistory, command];
			terminalContent = [...terminalContent, command];
			try {
				const response = await sendCommand(command);
				terminalContent = [...terminalContent, response];
			} catch (e) {
				console.error(e);
			}
		} 

		inputValue = "";
		await tick();
		terminalForm.scrollTo({ left: 0, top: terminalForm.scrollHeight, behavior: "smooth" });
	}

</script>

<form
	bind:this={terminalForm}
	on:submit={async (e) => {
		terminalInput.disabled = true;
		await submitForm(e);
		terminalInput.disabled = false;
		terminalInput.focus();
	}}
	on:click={(e) => terminalInput.focus()}
	on:keydown={(e) => terminalInput.focus()}
	aria-label="Terminal"
	role=""
	class="font-mono overflow-y-auto h-full bg-black text-green-500 border border-green-500 rounded-md p-4"
>
	<div class="text-center">
		{#each headerText as headerLine}
			<div class="min-h-6">{headerLine}</div>
		{/each}
		<div class="bastard">
			<b>B</b>est <b>A</b>rchetypal <b>S</b>ystem <b>T</b>erminals <b>A</b>nd <b>R</b>etrograde
			<b>D</b>evices
		</div>
	</div>
	<br />
	<ul class="w-full">
		{#each terminalContent as content}
			<li class="break-words">{content}</li>
		{/each}
	</ul>
	<div class="w-full flex flex-row gap-2">
		<span>&#x3e;</span><input
			class="bg-black text-green-700 w-full"
			type="text"
			bind:value={inputValue}
			bind:this={terminalInput}
			on:keydown={(e) => handleKeyDown(e)}
		/>
	</div>
</form>

<style>
	input {
		outline: none;
	}
</style>

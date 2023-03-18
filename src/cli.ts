import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { log } from "@stefanprobst/log";
import parseArgs from "mri";

import generate from "./index.js";

function formatFileSize(size: number) {
	if (size < 1024) {
		return `${size} bytes`;
	}
	return `${(size / 1024).toFixed(0)} kB`;
}

function getOptions() {
	const args = parseArgs(process.argv.slice(2), {
		alias: {
			input: "i",
			output: "o",
			name: "n",
			short: "s",
			color: "c",
			url: "u",
			maskable: "m",
			help: "h",
		},
	});
	return {
		input: args["input"],
		output: args["output"],
		name: args["name"],
		shortName: args["short"],
		color: args["color"],
		startUrl: args["url"],
		maskable: args["maskable"],
		help: args["help"],
	};
}

async function run() {
	const { input, output, name, shortName, color, maskable, startUrl, help } = getOptions();

	if (help || !input || !output || typeof input !== "string" || typeof output !== "string") {
		showHelpMessage();
		return;
	}

	const inputFilePath = join(process.cwd(), input);
	const outputFolder = join(process.cwd(), output);

	if (!existsSync(inputFilePath)) {
		log.error("Input file not found.");
		return;
	}

	if (!existsSync(outputFolder)) {
		try {
			mkdirSync(outputFolder);
		} catch (error) {
			log.error("Unable to create output folder.");
			return;
		}
	}

	try {
		const stats = await generate({
			inputFilePath,
			outputFolder,
			name,
			shortName,
			color,
			maskable,
			startUrl,
		});

		log.success(
			[
				"Successfully generated favicons!",
				...stats.images.map(({ fileName, size }) => {
					return `${fileName}: ${formatFileSize(size)}`;
				}),
			].join("\n"),
		);
	} catch (error) {
		log.error(String(error));
		return;
	}
}

function showHelpMessage() {
	console.log(
		[
			"Usage: create-favicons -i [FILE] -o [FOLDER] [...OPTIONS]\n",
			"Options:\n",
			"  -i, --input\t\tpath to input file",
			"  -o, --output\t\tpath to output folder",
			"  -n, --name\t\tname for webmanifest (optional)",
			"  -s, --short\t\tshort name for webmanifest (optional)",
			"  -c, --color\t\ttheme color for webmanifest (optional)",
			"  -m, --maskable\tmark images as maskable (optional)",
			"  -u, --url\t\tset the start_url path (optional)",
			"  -h, --help\t\tshow this help message\n",
		].join("\n"),
	);
}

run().catch(log.error);

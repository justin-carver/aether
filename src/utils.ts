import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import {
	initializeCardDatabase,
	insertCardData,
	queryCardByName,
	readJsonData,
} from './database';

// import Chain, { chain } from 'stream-chain';

// import { argv } from 'bun';
// import { ignore } from 'stream-json/filters/Ignore';
// import { parser } from 'stream-json';
// import { pick } from 'stream-json/filters/Pick';
// import { streamArray } from 'stream-json/streamers/StreamArray';

// import { streamValues } from 'stream-json/streamers/StreamValues';

dotenv.config();

export const logger = require('pino')(require('pino-pretty')());

const jsonData = readJsonData(); // Read the JSON data
initializeCardDatabase(); // Initialize the database

jsonData.data.forEach((card: any) => {
	insertCardData(card); // Insert each card into the database
});

console.log('Data successfully imported into the database!');

queryCardByName('Rayquaza');

// For parsing large JSON files.
// ? This may not be needed, since the database will do most of the parsing.
// function createJSONPipeline(jsonFilepath: string): Chain {
// 	return chain([
// 		fs.createReadStream(jsonFilepath),
// 		parser(),
// 		pick({ filter: 'data' }), // Dependent on data set
// 		streamArray(), // This will process each object in the array individually
// 	]);
// }

// let pokemonFound = 0;
// let allCardData = createJSONPipeline(
// 	path.resolve(__dirname, 'data/pokemon_tcg_all_cards.json')
// )
// 	.on('data', (data: any) => {
// 		const object = data.value;
// 		const targetField = 'name'; // Replace 'desiredField' with the actual field name you're looking for
// 		const pokemonName = 'Rayquaza';
// 		if (object.hasOwnProperty(targetField) && object.name == pokemonName) {
// 			pokemonFound++;
// 			console.log(object);
// 		}
// 	})
// 	.on('end', (end: any) => {
// 		console.log(`Finished processing the ${argv[0]} object.`);
// 		console.log(`${pokemonFound} cards found.`);
// 	});

// allCardData.on('error', (err) => {
// 	console.error('An error occurred:', err);
// });

// https://docs.pokemontcg.io/
export async function fetchPokemonTCG<T>(url: string): Promise<T> {
	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'X-Api-Key': process.env.POKE_API_KEY || '',
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = (await response.json()) as T;
		return data;
	} catch (error) {
		logger.error('Fetch error:', error);
		throw error;
	}
}

async function saveJsonToFile(filename: string, jsonData: any): Promise<void> {
	try {
		const directoryPath = path.resolve(__dirname, 'data');
		const filePath = path.join(directoryPath, filename);
		const dataString = JSON.stringify(jsonData, null, 2); // 2 spaces for readability

		// Ensure the directory exists
		await fs.promises.mkdir(directoryPath, { recursive: true });

		// Write the JSON string to the file within the data folder
		await fs.promises.writeFile(filePath, dataString, 'utf8');

		logger.info(`Data successfully written to ${filePath}`);
	} catch (error) {
		logger.error('Error writing JSON to file:', error);
		throw error; // Rethrow if needed
	}
}

// Function to auto-paginate and fetch all data from the cards endpoint
async function fetchAllCards(endpoint: string, filename: string) {
	let allData: any[] = [];
	let totalCount = 0;
	let page = 1;
	const pageSize = 250; // Default page size

	try {
		while (true) {
			const url = `${endpoint}?page=${page}&pageSize=${pageSize}`;
			const response = await fetchPokemonTCG<any>(url);

			// Append the 'data' array from the current page to the accumulated data
			allData = allData.concat(response.data);
			logger.info(
				`Combining data from Page ${page}! Moving onto next page... [${page}/${Math.floor(
					totalCount / 250
				)}]`
			);

			// Set totalCount from the first page
			if (page === 1) {
				totalCount = response.totalCount;
			}

			// Check if we have fetched all pages
			if (allData.length >= totalCount) {
				break;
			}

			page++;
		}

		// Create final JSON object to be saved
		const finalData = {
			totalCount,
			data: allData,
		};

		// Save the aggregated data to the file
		await saveJsonToFile(filename, finalData);
	} catch (error) {
		logger.error('Error during fetching and saving cards data:', error);
	}
}

function fetchAndSaveData(url: string, filename: string): void {
	if (url.includes('/cards')) {
		// Special case for cards endpoint
		fetchAllCards(url, filename);
	} else {
		// Potentially expand this later
		// General case for other endpoints
		fetchPokemonTCG(url)
			.then((data: any) => {
				// We only want raw card data
				if (data.page) delete data.page;
				if (data.pageSize) delete data.pageSize;
				if (data.count) delete data.count;

				logger.info(`Fetched data from ${url}`);
				return saveJsonToFile(filename, data);
			})
			.catch((error) => {
				logger.error(`Fetch error from ${url}:`, error);
				throw new Error(
					`Could not reach endpoint ${url} due to ${error}. Check if API end up online?`
				);
			});
	}
}

function checkFileExistsSync(filePath: string): boolean {
	return fs.existsSync(path.resolve(__dirname, `data/${filePath}`));
}

// Example usage - Iterating over various endpoints
const endpoints = [
	{
		url: 'https://api.pokemontcg.io/v2/sets',
		filename: 'pokemon_tcg_sets.json',
	},
	{
		url: 'https://api.pokemontcg.io/v2/cards',
		filename: 'pokemon_tcg_all_cards.json',
	},
	// Add more endpoints as needed
];

export function checkAPIEndpoints() {
	logger.info('Initializing local data...');
	endpoints.forEach((endpoint) => {
		logger.info(`Checking file: ${endpoint.filename}`);
		if (!checkFileExistsSync(endpoint.filename)) {
			// File does not exist, so we fetch and save data
			logger.info(`${endpoint.filename} not found, fetching data.`);
			fetchAndSaveData(endpoint.url, endpoint.filename);
		} else {
			// File exists, so we skip fetching
			logger.info(
				`${endpoint.filename} found in /data, skipping endpoint.`
			);
		}
	});
	logger.info(); // line break
}

checkAPIEndpoints();

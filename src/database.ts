import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Database file path
const dbPath = path.resolve(__dirname, 'pokemon_tcg.db');
const db = new Database(dbPath);

// JSON file path
const jsonFilePath = path.resolve(__dirname, 'pokemon_tcg_all_cards.json');

// Function to read the JSON data
export function readJsonData() {
	return JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
}

export function initializeCardDatabase() {
	db.exec(`DROP TABLE IF EXISTS cards`);
	db.exec(`DROP TABLE IF EXISTS subtypes`);
	db.exec(`DROP TABLE IF EXISTS types`);
	db.exec(`DROP TABLE IF EXISTS attacks`);
	db.exec(`DROP TABLE IF EXISTS weaknesses`);
	db.exec(`DROP TABLE IF EXISTS resistances`);
	db.exec(`DROP TABLE IF EXISTS retreat_costs`);
	db.exec(`DROP TABLE IF EXISTS tcgplayer_prices`);
	db.exec(`DROP TABLE IF EXISTS cardmarket_prices`);

	db.exec(`
        CREATE TABLE IF NOT EXISTS cards (
            id TEXT PRIMARY KEY,
            name TEXT,
            supertype TEXT,
            hp INTEGER,
            evolves_from TEXT,
            rarity TEXT,
            flavor_text TEXT,
            artist TEXT,
            national_pokedex_numbers INTEGER,
            converted_retreat_cost INTEGER,
            set_id TEXT,
            set_name TEXT,
            series TEXT,
            printed_total INTEGER,
            total INTEGER,
            legalities_unlimited TEXT,
            release_date TEXT,
            image_small TEXT,
            image_large TEXT,
            tcgplayer_url TEXT,
            tcgplayer_updated_at TEXT,
            cardmarket_url TEXT,
            cardmarket_updated_at TEXT
        )
    `);

	db.exec(`
        CREATE TABLE IF NOT EXISTS subtypes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id TEXT,
            subtype TEXT,
            FOREIGN KEY (card_id) REFERENCES cards (id)
        )
    `);

	db.exec(`
        CREATE TABLE IF NOT EXISTS types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id TEXT,
            type TEXT,
            FOREIGN KEY (card_id) REFERENCES cards (id)
        )
    `);

	db.exec(`
        CREATE TABLE IF NOT EXISTS attacks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id TEXT,
            name TEXT,
            cost TEXT,
            converted_energy_cost INTEGER,
            damage TEXT,
            text TEXT,
            FOREIGN KEY (card_id) REFERENCES cards (id)
        )
    `);

	db.exec(`
        CREATE TABLE IF NOT EXISTS weaknesses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id TEXT,
            type TEXT,
            value TEXT,
            FOREIGN KEY (card_id) REFERENCES cards (id)
        )
    `);

	db.exec(`
        CREATE TABLE IF NOT EXISTS resistances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id TEXT,
            type TEXT,
            value TEXT,
            FOREIGN KEY (card_id) REFERENCES cards (id)
        )
    `);

	db.exec(`
        CREATE TABLE IF NOT EXISTS retreat_costs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id TEXT,
            cost TEXT,
            FOREIGN KEY (card_id) REFERENCES cards (id)
        )
    `);

	db.exec(`
        CREATE TABLE IF NOT EXISTS tcgplayer_prices (
            card_id TEXT PRIMARY KEY,
            holofoil_low REAL,
            holofoil_mid REAL,
            holofoil_high REAL,
            holofoil_market REAL,
            holofoil_direct_low REAL,
            reverse_holofoil_low REAL,
            reverse_holofoil_mid REAL,
            reverse_holofoil_high REAL,
            reverse_holofoil_market REAL,
            reverse_holofoil_direct_low REAL,
            FOREIGN KEY (card_id) REFERENCES cards (id)
        )
    `);

	db.exec(`
        CREATE TABLE IF NOT EXISTS cardmarket_prices (
            card_id TEXT PRIMARY KEY,
            average_sell_price REAL,
            low_price REAL,
            trend_price REAL,
            german_pro_low REAL,
            suggested_price REAL,
            reverse_holo_sell REAL,
            reverse_holo_low REAL,
            reverse_holo_trend REAL,
            low_price_ex_plus REAL,
            avg1 REAL,
            avg7 REAL,
            avg30 REAL,
            reverse_holo_avg1 REAL,
            reverse_holo_avg7 REAL,
            reverse_holo_avg30 REAL,
            FOREIGN KEY (card_id) REFERENCES cards (id)
        )
    `);
}

export function insertCardData(card: any) {
	const insertCardStmt = db.prepare(`
        INSERT INTO cards (id, name, supertype, hp, evolves_from, rarity, flavor_text, artist, national_pokedex_numbers, converted_retreat_cost, set_id, set_name, series, printed_total, total, legalities_unlimited, release_date, image_small, image_large, tcgplayer_url, tcgplayer_updated_at, cardmarket_url, cardmarket_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

	insertCardStmt.run(
		card.id,
		card.name,
		card.supertype,
		card.hp,
		card.evolvesFrom,
		card.rarity,
		card.flavorText,
		card.artist,
		card.nationalPokedexNumbers?.[0],
		card.convertedRetreatCost,
		card.set.id,
		card.set.name,
		card.set.series,
		card.set.printedTotal,
		card.set.total,
		card.set.legalities?.unlimited,
		card.set.releaseDate,
		card.images.small,
		card.images.large,
		card.tcgplayer.url,
		card.tcgplayer.updatedAt,
		card.cardmarket.url,
		card.cardmarket.updatedAt
	);

	const insertSubtypeStmt = db.prepare(`
        INSERT INTO subtypes (card_id, subtype) VALUES (?, ?)
    `);
	card.subtypes?.forEach((subtype: string) => {
		insertSubtypeStmt.run(card.id, subtype);
	});

	const insertTypeStmt = db.prepare(`
        INSERT INTO types (card_id, type) VALUES (?, ?)
    `);
	card.types?.forEach((type: string) => {
		insertTypeStmt.run(card.id, type);
	});

	const insertAttackStmt = db.prepare(`
        INSERT INTO attacks (card_id, name, cost, converted_energy_cost, damage, text) VALUES (?, ?, ?, ?, ?, ?)
    `);
	card.attacks?.forEach((attack: any) => {
		insertAttackStmt.run(
			card.id,
			attack.name,
			attack.cost.join(','),
			attack.convertedEnergyCost,
			attack.damage,
			attack.text
		);
	});

	const insertWeaknessStmt = db.prepare(`
        INSERT INTO weaknesses (card_id, type, value) VALUES (?, ?, ?)
    `);
	card.weaknesses?.forEach((weakness: any) => {
		insertWeaknessStmt.run(card.id, weakness.type, weakness.value);
	});

	const insertResistanceStmt = db.prepare(`
        INSERT INTO resistances (card_id, type, value) VALUES (?, ?, ?)
    `);
	card.resistances?.forEach((resistance: any) => {
		insertResistanceStmt.run(card.id, resistance.type, resistance.value);
	});

	const insertRetreatCostStmt = db.prepare(`
        INSERT INTO retreat_costs (card_id, cost) VALUES (?, ?)
    `);
	card.retreatCost?.forEach((cost: string) => {
		insertRetreatCostStmt.run(card.id, cost);
	});

	if (card.tcgplayer && card.tcgplayer.prices) {
		const insertTcgPlayerPriceStmt = db.prepare(`
            INSERT INTO tcgplayer_prices (card_id, holofoil_low, holofoil_mid, holofoil_high, holofoil_market, holofoil_direct_low, reverse_holofoil_low, reverse_holofoil_mid, reverse_holofoil_high, reverse_holofoil_market, reverse_holofoil_direct_low)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
		insertTcgPlayerPriceStmt.run(
			card.id,
			card.tcgplayer.prices.holofoil?.low,
			card.tcgplayer.prices.holofoil?.mid,
			card.tcgplayer.prices.holofoil?.high,
			card.tcgplayer.prices.holofoil?.market,
			card.tcgplayer.prices.holofoil?.directLow,
			card.tcgplayer.prices.reverseHolofoil?.low,
			card.tcgplayer.prices.reverseHolofoil?.mid,
			card.tcgplayer.prices.reverseHolofoil?.high,
			card.tcgplayer.prices.reverseHolofoil?.market,
			card.tcgplayer.prices.reverseHolofoil?.directLow
		);
	}

	if (card.cardmarket && card.cardmarket.prices) {
		const insertCardMarketPriceStmt = db.prepare(`
            INSERT INTO cardmarket_prices (card_id, average_sell_price, low_price, trend_price, german_pro_low, suggested_price, reverse_holo_sell, reverse_holo_low, reverse_holo_trend, low_price_ex_plus, avg1, avg7, avg30, reverse_holo_avg1, reverse_holo_avg7, reverse_holo_avg30)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
		insertCardMarketPriceStmt.run(
			card.id,
			card.cardmarket.prices.averageSellPrice,
			card.cardmarket.prices.lowPrice,
			card.cardmarket.prices.trendPrice,
			card.cardmarket.prices.germanProLow,
			card.cardmarket.prices.suggestedPrice,
			card.cardmarket.prices.reverseHoloSell,
			card.cardmarket.prices.reverseHoloLow,
			card.cardmarket.prices.reverseHoloTrend,
			card.cardmarket.prices.lowPriceExPlus,
			card.cardmarket.prices.avg1,
			card.cardmarket.prices.avg7,
			card.cardmarket.prices.avg30,
			card.cardmarket.prices.reverseHoloAvg1,
			card.cardmarket.prices.reverseHoloAvg7,
			card.cardmarket.prices.reverseHoloAvg30
		);
	}
}

// Queries
// Query: Get All Cards by Type
export function queryCardsByType(type: string) {
	const rows = db
		.prepare(
			`
        SELECT cards.id, cards.name, cards.hp, types.type
        FROM cards
        JOIN types ON cards.id = types.card_id
        WHERE types.type = ?
    `
		)
		.all(type);

	rows.forEach((row: any) => {
		console.log(`${row.name} (HP: ${row.hp}) - Type: ${row.type}`);
	});
}

// Query: Get a Card by Name
export function queryCardByName(name: string) {
	const rows = db
		.prepare(
			`
        SELECT * FROM cards
        WHERE name LIKE ?
    `
		)
		.all(`%${name}%`);

	rows.forEach((row: any) => {
		console.log(
			`ID: ${row.id}, Name: ${row.name}, HP: ${row.hp}, Rarity: ${row.rarity}`
		);
	});
}

// Query: Get Cards by Weakness
export function queryCardsByWeakness(weakness: string) {
	const rows = db
		.prepare(
			`
        SELECT cards.id, cards.name, weaknesses.type AS weakness_type
        FROM cards
        JOIN weaknesses ON cards.id = weaknesses.card_id
        WHERE weaknesses.type = ?
    `
		)
		.all(weakness);

	rows.forEach((row: any) => {
		console.log(`${row.name} - Weakness: ${row.weakness_type}`);
	});
}

// Query: Get All Cards by Rarity
export function queryCardsByRarity(rarity: string) {
	const rows = db
		.prepare(
			`
        SELECT * FROM cards
        WHERE rarity = ?
    `
		)
		.all(rarity);

	rows.forEach((row: any) => {
		console.log(`ID: ${row.id}, Name: ${row.name}, Rarity: ${row.rarity}`);
	});
}

// Query: Count the Number of Cards by Type
export function countCardsByType() {
	const rows = db
		.prepare(
			`
        SELECT types.type, COUNT(cards.id) AS card_count
        FROM cards
        JOIN types ON cards.id = types.card_id
        GROUP BY types.type
    `
		)
		.all();

	rows.forEach((row: any) => {
		console.log(`Type: ${row.type}, Number of Cards: ${row.card_count}`);
	});
}

// Query: Get All Cards by HP Range
export function queryCardsByHpRange(minHp: number, maxHp: number) {
	const rows = db
		.prepare(
			`
        SELECT id, name, hp
        FROM cards
        WHERE hp BETWEEN ? AND ?
    `
		)
		.all(minHp, maxHp);

	rows.forEach((row: any) => {
		console.log(`ID: ${row.id}, Name: ${row.name}, HP: ${row.hp}`);
	});
}

// Query: Get All Cards by Set Name
export function queryCardsBySetName(setName: string) {
	const rows = db
		.prepare(
			`
        SELECT * FROM cards
        WHERE set_name = ?
    `
		)
		.all(setName);

	rows.forEach((row: any) => {
		console.log(`ID: ${row.id}, Name: ${row.name}, Set: ${row.set_name}`);
	});
}

// Query: Get All Cards with a Specific Attack
export function queryCardsByAttackName(attackName: string) {
	const rows = db
		.prepare(
			`
        SELECT cards.id, cards.name, attacks.name AS attack_name
        FROM cards
        JOIN attacks ON cards.id = attacks.card_id
        WHERE attacks.name LIKE ?
    `
		)
		.all(`%${attackName}%`);

	rows.forEach((row: any) => {
		console.log(
			`ID: ${row.id}, Name: ${row.name}, Attack: ${row.attack_name}`
		);
	});
}

// Query: Get All Cards Released After a Specific Date
export function queryCardsByReleaseDate(date: string) {
	const rows = db
		.prepare(
			`
        SELECT id, name, release_date
        FROM cards
        WHERE release_date > ?
    `
		)
		.all(date);

	rows.forEach((row: any) => {
		console.log(
			`ID: ${row.id}, Name: ${row.name}, Release Date: ${row.release_date}`
		);
	});
}

// Query: Get All Cards with Prices Below a Certain Value
export function queryCardsByPrice(maxPrice: number) {
	const rows = db
		.prepare(
			`
        SELECT cards.id, cards.name, tcgplayer_prices.holofoil_low
        FROM cards
        JOIN tcgplayer_prices ON cards.id = tcgplayer_prices.card_id
        WHERE tcgplayer_prices.holofoil_low < ?
    `
		)
		.all(maxPrice);

	rows.forEach((row: any) => {
		console.log(
			`ID: ${row.id}, Name: ${row.name}, Price: ${row.holofoil_low}`
		);
	});
}

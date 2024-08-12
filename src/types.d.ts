export interface Player {
	username: string;
	hand: Card[];
	activePokemon: PokemonCard;
	benchedPokemon: PokemonCard[];
	discardPile: Card[];
	energy: EnergyCard[];
	energyAttachedThisTurn: boolean;
	prizeCards: number;
}

export interface Card {
	id: string;
	name: string;
	type: 'Pokemon' | 'Energy' | 'Trainer';
	// Add other existing properties as needed
}

export interface PokemonCard extends Card {
	currentHp: number;
	maxHp: number;
	moves: Move[];
	attachedEnergy: EnergyCard[];
}

export interface EnergyCard extends Card {
	energyType: string;
}

export interface Move {
	name: string;
	damage: number;
	energyCost: EnergyCard[];
	effect?: string; // e.g., "Paralyze", "Burn"
}

export interface Action {
	type: string; // e.g., "Attack", "PlayCard", "Retreat"
	cardId: string;
	move?: string;
}

export interface GameState {
	activePlayer: number;
	players: Player[];
	turn: number;
	lastAction: Action;
	// Add other necessary fields like turn number, active Pokémon, benched Pokémon, etc.
}

interface MCTSNode {
	state: GameState;
	parent?: MCTSNode;
	children: MCTSNode[];
	wins: number;
	visits: number;
	untriedActions: Action[];
	player: number;
	action?: Action; // The action that led to this node
}

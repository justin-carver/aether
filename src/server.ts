import { type GameState } from './types';
import { MCTS } from './MCTS';

class PokemonGame {
	private currentState: GameState;

	constructor() {
		this.currentState = this.setupInitialState();
		this.runTurnCycle();
	}

	private setupInitialState(): GameState {
		return {
			activePlayer: 0,
			players: [
				{
					username: 'Zezima',
					hand: [
						{ id: 'card_001', name: 'Charmander', type: 'Pokemon' },
						{ id: 'card_002', name: 'Fire Energy', type: 'Energy' },
						{ id: 'card_003', name: 'Fire Energy', type: 'Energy' },
						{
							id: 'card_004',
							name: 'Super Potion',
							type: 'Trainer',
						},
						{ id: 'card_005', name: 'Potion', type: 'Trainer' },
					],
					activePokemon: {
						id: 'card_004',
						name: 'Charmeleon',
						type: 'Pokemon',
						currentHp: 80,
						maxHp: 80,
						moves: [
							{
								name: 'Slash',
								damage: 30,
								energyCost: [
									{
										id: 'card_002',
										name: 'Fire Energy',
										type: 'Energy',
										energyType: 'Fire',
									},
								],
							},
							{
								name: 'Flamethrower',
								damage: 50,
								energyCost: [
									{
										id: 'card_002',
										name: 'Fire Energy',
										type: 'Energy',
										energyType: 'Fire',
									},
								],
							},
						],
						attachedEnergy: [],
					},
					benchedPokemon: [],
					discardPile: [],
					energy: [],
					energyAttachedThisTurn: false,
					prizeCards: 6,
				},
				{
					username: 'WoolooHero',
					hand: [
						{ id: 'card_005', name: 'Squirtle', type: 'Pokemon' },
						{
							id: 'card_006',
							name: 'Water Energy',
							type: 'Energy',
						},
						{
							id: 'card_007',
							name: 'Super Potion',
							type: 'Trainer',
						},
					],
					activePokemon: {
						id: 'card_008',
						name: 'Wartortle',
						type: 'Pokemon',
						currentHp: 90,
						maxHp: 90,
						moves: [
							{
								name: 'Water Gun',
								damage: 40,
								energyCost: [
									{
										id: 'card_006',
										name: 'Water Energy',
										type: 'Energy',
										energyType: 'Water',
									},
								],
							},
							{
								name: 'Bite',
								damage: 30,
								energyCost: [
									{
										id: 'card_006',
										name: 'Water Energy',
										type: 'Energy',
										energyType: 'Water',
									},
								],
							},
						],
						attachedEnergy: [],
					},
					benchedPokemon: [],
					discardPile: [],
					energy: [],
					energyAttachedThisTurn: false,
					prizeCards: 6,
				},
			],
			lastAction: { cardId: '000', type: 'setup' },
			turn: 0, // configure bench
		};
	}

	private runTurnCycle() {
		while (!this.isGameOver()) {
			this.runTurn();
			this.endTurn();
			this.switchPlayer();
		}
	}

	private runTurn() {
		const mcts = new MCTS(this.currentState);
		const bestAction = mcts.runSearch(1000); // Run 1000 iterations
		console.log(
			`Best action chosen by Player ${
				this.currentState.activePlayer + 1
			}:`,
			bestAction
		);

		// Apply the best action to the game state
		this.currentState = mcts.executeAction(this.currentState, bestAction);
		console.log(
			'New game state after applying the best action:',
			this.currentState
		);
	}

	private endTurn() {
		console.log(
			`Player ${this.currentState.activePlayer + 1}'s turn has ended.`
		);
		// Implement any end-of-turn logic here (e.g., status effects, drawing cards, etc.)
	}

	private switchPlayer() {
		this.currentState.turn++;
		this.currentState.activePlayer = 1 - this.currentState.activePlayer;
		console.log(`--- [ Turn: ${this.currentState.turn} ] ---`);
		console.log(
			`It's now Player ${this.currentState.activePlayer + 1}'s turn.`
		);
	}

	private isGameOver(): boolean {
		// Implement logic to check if the game is over (e.g., all prize cards taken, no Pokémon left, etc.)
		// For now, let's assume the game ends after a fixed number of turns
		const MAX_TURNS = 10;
		return false; // Placeholder logic for game over condition
	}
}

new PokemonGame();

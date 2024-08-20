import { logger } from './utils';

import {
	type MCTSNode,
	type GameState,
	type Action,
	type Move,
	type PokemonCard,
	type EnergyCard,
	type Player,
	type Card,
} from './types';

export class MCTS {
	private root: MCTSNode;

	constructor(initialState: GameState) {
		this.root = this.createNode(initialState, null);
	}

	private createNode(state: GameState, parent: MCTSNode | null): MCTSNode {
		const actions = this.getPossibleActions(state);
		// TODO: Create node object?
		return {
			state: state,
			parent: parent || undefined,
			children: [],
			wins: 0,
			visits: 0,
			untriedActions: actions,
			player: state.activePlayer,
		};
	}

	private canUseMove(move: Move, pokemon: PokemonCard): boolean {
		// Check if the Pokémon has enough energy attached to use the move
		return move.energyCost.every((cost) => {
			return pokemon.attachedEnergy.some(
				(energy) => energy.energyType === cost.energyType
			);
		});
	}

	private canRetreat(
		activePokemon: PokemonCard,
		benchedPokemon: PokemonCard
	): boolean {
		// Example logic: Ensure the active Pokémon has enough energy to retreat (optional rule)
		// You may also want to implement a retreat cost mechanism here.
		return activePokemon.attachedEnergy.length >= 1; // Simplified example
	}

	private simulateGame(state: GameState): number {
		let simulatedState = { ...state };

		// Reset turn-specific state for the active player
		simulatedState.players[
			simulatedState.activePlayer
		].energyAttachedThisTurn = false;

		// Simulate until a prize card is taken or no valid actions are left
		while (!this.isPrizeCardTaken(simulatedState)) {
			const possibleActions = this.getPossibleActions(simulatedState);
			if (possibleActions.length === 0) break;

			// Choose the best action based on a heuristic evaluation
			const action = this.chooseBestAction(
				simulatedState,
				possibleActions
			);

			// Apply the chosen action
			simulatedState = this.applyAction(simulatedState, action);

			// Switch to the other player after a full turn is completed
			if (this.isTurnComplete(simulatedState)) {
				simulatedState.activePlayer = 1 - simulatedState.activePlayer;
				simulatedState.players[
					simulatedState.activePlayer
				].energyAttachedThisTurn = false; // Reset for the next player
			}
		}

		// Return the index of the player who took the prize card
		return this.getWinner(simulatedState);
	}

	private getPossibleActions(state: GameState): Action[] {
		const actions: Action[] = [];
		const player = state.players[state.activePlayer];

		// Attack actions
		player.activePokemon.moves.forEach((move) => {
			if (this.canUseMove(move, player.activePokemon)) {
				actions.push({
					type: 'Attack',
					cardId: player.activePokemon.id,
					move: move.name,
				});
			}
		});

		// Attach Energy actions: Only allow if no energy has been attached this turn
		if (!player.energyAttachedThisTurn) {
			player.hand.forEach((card) => {
				if (card.type === 'Energy') {
					actions.push({ type: 'AttachEnergy', cardId: card.id });
				}
			});
		}

		// Play Trainer Card actions: Play a Trainer card from the hand
		player.hand.forEach((card) => {
			if (card.type === 'Trainer') {
				actions.push({
					type: 'PlayCard',
					cardId: card.id,
				});
			}
		});

		// Retreat actions: Allow the player to switch the active Pokémon with a benched Pokémon
		player.benchedPokemon.forEach((benchedPokemon) => {
			if (this.canRetreat(player.activePokemon, benchedPokemon)) {
				actions.push({
					type: 'Retreat',
					cardId: benchedPokemon.id,
				});
			}
		});

		return actions;
	}

	private isTurnComplete(state: GameState): boolean {
		// Define when a turn is complete: after an attack or other terminal action
		const lastAction = state.lastAction;
		return (
			lastAction &&
			(lastAction.type === 'Attack' || lastAction.type === 'Retreat')
		);
	}

	private chooseBestAction(state: GameState, actions: Action[]): Action {
		// Heuristic to choose the best action based on the current game state
		let bestAction = actions[0];
		let bestScore = -Infinity;

		actions.forEach((action) => {
			let score = 0;

			switch (action.type) {
				case 'Attack':
					// Score based on damage dealt to the opponent's active Pokémon
					const move = state.players[
						state.activePlayer
					].activePokemon.moves.find((m) => m.name === action.move);
					if (move) {
						score = move.damage; // Higher damage is better
					}
					break;

				case 'AttachEnergy':
					// Prioritize attaching energy that allows powerful moves
					score = this.evaluateEnergyAttachment(state, action.cardId);
					break;

				case 'PlayCard':
					// Evaluate the impact of playing a Trainer card
					const card = state.players[state.activePlayer].hand.find(
						(c) => c.id === action.cardId
					);
					if (card) {
						score = this.evaluateTrainerCardEffect(card, state);
					}
					break;

				case 'Retreat':
					// Score based on the strategic benefit of retreating
					score = this.evaluateRetreat(state, action.cardId);
					break;

				default:
					score = 0;
					break;
			}

			if (score > bestScore) {
				bestScore = score;
				bestAction = action;
			}
		});

		return bestAction;
	}

	private evaluateEnergyAttachment(state: GameState, cardId: string): number {
		const player = state.players[state.activePlayer];
		const energyCard = player.hand.find(
			(card) => card.id === cardId
		) as EnergyCard;

		// Check if an energy has already been attached this turn
		if (player.energyAttachedThisTurn) {
			return 0; // If an energy card has already been attached this turn, return 0
		}

		if (!energyCard) return 0;

		// Simple heuristic: Prioritize attaching energy that allows powerful moves
		const moveAvailable = player.activePokemon.moves.some((move) =>
			this.canUseMove(move, {
				...player.activePokemon,
				attachedEnergy: [
					...player.activePokemon.attachedEnergy,
					energyCard,
				],
			})
		);

		return moveAvailable ? 10 : 1;
	}

	private evaluateTrainerCardEffect(card: Card, state: GameState): number {
		const player = state.players[state.activePlayer];
		let score = 0;

		switch (card.name) {
			case 'Potion':
				// Only heal if the Pokémon has lost health
				if (
					player.activePokemon.currentHp < player.activePokemon.maxHp
				) {
					score =
						player.activePokemon.maxHp -
						player.activePokemon.currentHp; // Higher score for more healing
				} else {
					score = 0; // No benefit if Pokémon is at full health
				}
				break;

			case 'Super Potion':
				// Only heal if the Pokémon has lost significant health
				if (
					player.activePokemon.currentHp < player.activePokemon.maxHp
				) {
					score =
						player.activePokemon.maxHp -
						player.activePokemon.currentHp +
						10; // Higher base score for Super Potion
				} else {
					score = 0; // No benefit if Pokémon is at full health
				}
				break;

			// Add more cases for different Trainer cards and assign scores based on their impact

			default:
				score = 1; // Neutral score for cards not specifically handled
				break;
		}

		return score;
	}

	private evaluateRetreat(state: GameState, cardId: string): number {
		const player = state.players[state.activePlayer];
		const benchedPokemon = player.benchedPokemon.find(
			(pokemon) => pokemon.id === cardId
		);

		if (!benchedPokemon) return 0;

		// Simple heuristic: Retreat if the active Pokémon is low on HP and benched Pokémon is stronger
		const activePokemon = player.activePokemon;
		return activePokemon.currentHp < benchedPokemon.currentHp ? 10 : 1;
	}

	private isPrizeCardTaken(state: GameState): boolean {
		// Check if either player has taken a prize card by knocking out a Pokémon
		return state.players.some(
			(player) => player.activePokemon.currentHp <= 0
		);
	}

	private getWinner(state: GameState): number {
		// The winner is the player who took a prize card
		return state.players[0].activePokemon.currentHp <= 0 ? 1 : 0;
	}

	private expandNode(node: MCTSNode): MCTSNode {
		const action = node.untriedActions.pop(); // Pop should remove the action
		if (!action) {
			logger.info('No more untried actions available for expansion.');
			return node;
		}

		// Apply the action and create a new state
		const newState = this.applyAction(node.state, action);

		// Create a new node with the new state and add it as a child
		const childNode = this.createNode(newState, node);
		childNode.action = action; // Store the action that led to this node
		node.children.push(childNode);
		return childNode;
	}

	public runSearch(iterations: number): Action {
		for (let i = 0; i < iterations; i++) {
			let node = this.root;

			// Selection
			while (
				node.untriedActions.length === 0 &&
				node.children.length > 0
			) {
				node = this.selectPromisingNode(node);
			}

			// Expansion
			if (node.untriedActions.length > 0) {
				node = this.expandNode(node);
			}

			// Simulation
			const winner = this.simulateGame(node.state);

			// Backpropagation
			this.backpropagate(node, winner);
		}

		// If no children, this means no valid actions were found
		if (this.root.children.length === 0) {
			logger.error('No valid actions found.');
			this.quitGame();
		}

		let bestChild: MCTSNode = <MCTSNode>{};
		if (this.root.children) {
			// Choose the action that led to the most visited child
			bestChild = this.root.children.reduce((best, child) => {
				return child.visits > best.visits ? child : best;
			});
		}

		// Return the action that led to the best child node
		if (!bestChild || !bestChild.action) {
			logger.error('Best action could not be determined. 😔');
			// throw new Error('Best action could not be determined.');
		}

		return bestChild.action!;
	}

	private applyAction(state: GameState, action: Action): GameState {
		const newState = { ...state };
		const player = newState.players[newState.activePlayer];

		switch (action.type) {
			case 'AttachEnergy': {
				if (!player.energyAttachedThisTurn) {
					// Attach an energy card to the active Pokémon
					const energyCardIndex = player.hand.findIndex(
						(card) => card.id === action.cardId
					);
					if (energyCardIndex >= 0) {
						const energyCard = player.hand.splice(
							energyCardIndex,
							1
						)[0] as EnergyCard;
						player.activePokemon.attachedEnergy.push(energyCard);
						player.energyAttachedThisTurn = true;
						logger.info(
							`Attached ${energyCard.name} to ${player.activePokemon.name}`
						);
					}
				}
				break;
			}

			case 'Attack': {
				// Execute an attack by the active Pokémon
				const move = player.activePokemon.moves.find(
					(move) => move.name === action.move
				);
				if (move) {
					const opponent =
						newState.players[1 - newState.activePlayer];
					opponent.activePokemon.currentHp -= move.damage;
					logger.info(
						`${player.activePokemon.name} used ${move.name} and dealt ${move.damage} damage to ${opponent.activePokemon.name}`
					);

					if (opponent.activePokemon.currentHp <= 0) {
						opponent.activePokemon.currentHp = 0;
						logger.info(
							`${opponent.activePokemon.name} is knocked out!`
						);
					}
				}
				break;
			}

			case 'PlayCard': {
				// Play a Trainer card from the hand
				const cardIndex = player.hand.findIndex(
					(card) => card.id === action.cardId
				);
				if (cardIndex >= 0) {
					const trainerCard = player.hand.splice(cardIndex, 1)[0];
					player.discardPile.push(trainerCard);
					logger.info(
						`${player.username} played ${trainerCard.name}`
					);

					// Apply the specific effects of the Trainer card
					this.applyTrainerCardEffect(trainerCard, player, newState);
				}
				break;
			}

			case 'Retreat': {
				// Retreat the active Pokémon
				const benchedPokemonIndex = player.benchedPokemon.findIndex(
					(pokemon) => pokemon.id === action.cardId
				);
				if (benchedPokemonIndex >= 0) {
					const benchedPokemon = player.benchedPokemon.splice(
						benchedPokemonIndex,
						1
					)[0];
					player.benchedPokemon.push(player.activePokemon);
					player.activePokemon = benchedPokemon;
					logger.info(
						`${player.username} retreated ${benchedPokemon.name}`
					);
				}
				break;
			}

			// TODO: Handle additional action types as needed

			default:
				logger.info(`Unknown action type: ${action.type}`);
		}

		// Update the last action performed
		newState.lastAction = action;

		return newState;
	}

	private applyTrainerCardEffect(
		trainerCard: Card,
		player: Player,
		state: GameState
	): void {
		switch (trainerCard.name) {
			case 'Potion': {
				player.activePokemon.currentHp += 20;
				if (
					player.activePokemon.currentHp > player.activePokemon.maxHp
				) {
					player.activePokemon.currentHp = player.activePokemon.maxHp;
				}
				logger.info(`${player.activePokemon.name} healed 20 HP!`);
				break;
			}

			case 'Super Potion': {
				player.activePokemon.currentHp += 50;
				if (
					player.activePokemon.currentHp > player.activePokemon.maxHp
				) {
					player.activePokemon.currentHp = player.activePokemon.maxHp;
				}
				break;
			}

			// Add more cases for different Trainer cards with their specific effects

			default:
				logger.info(
					`No specific effect for Trainer card: ${trainerCard.name}`
				);
		}

		// Additional logic to optimize the player's bench could be added here.
		// For example, cards that allow drawing more Pokémon, rearranging the bench, etc.
	}

	private backpropagate(node: MCTSNode, winner: number): void {
		let currentNode: MCTSNode | undefined = node;
		while (currentNode) {
			currentNode.visits++;

			// If the current node's player is the winner, increase the win count
			if (currentNode.player === winner) {
				// Increase the win count more significantly if a prize card was taken
				currentNode.wins += this.didTakePrizeCard(
					currentNode.state,
					currentNode.player
				)
					? 2
					: 1;
			}

			currentNode = currentNode.parent;
		}
	}

	private didTakePrizeCard(state: GameState, player: number): boolean {
		// Check if the player knocked out the opponent's Pokémon and took a prize card
		const opponent = state.players[1 - player];
		return opponent.activePokemon.currentHp <= 0;
	}

	private selectPromisingNode(node: MCTSNode): MCTSNode {
		let bestNode = node;
		let bestUCTValue = -Infinity;

		node.children.forEach((child) => {
			const uctValue = this.uctValue(child);
			if (uctValue > bestUCTValue) {
				bestUCTValue = uctValue;
				bestNode = child;
			}
		});

		return bestNode;
	}

	private uctValue(node: MCTSNode): number {
		const exploitation = node.wins / node.visits;
		const exploration = Math.sqrt(
			Math.log(node.parent!.visits) / node.visits
		);
		const explorationParam = 1.41; // Tunable parameter

		return exploitation + explorationParam * exploration;
	}

	// Public wrapper method
	public executeAction(state: GameState, action: Action): GameState {
		return this.applyAction(state, action);
	}

	// Should this be in server.ts?
	public quitGame(): void {
		// Exits the current running session
		logger.info(this.root, 'Exiting Game! Final Results:');
		this.root = null as any;
	}
}

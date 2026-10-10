// The list of games the shell offers. Adding a game is one import and one
// entry here.
export interface GameEntry {
  id: string;
  name: string;
}

export const games: GameEntry[] = [];

// How to play each game, in plain words, once per language. Shown from the
// "?" button on the play screen, and by itself the first time a game is opened.
//
// Each has the goal in one sentence, then the rules, then how to work the screen.

import type { Language } from './strings';

export interface Rules {
  goal: string;
  rules: string[];
  how: string[];
}

export const rules: Record<string, Record<Language, Rules>> = {
  sudoku: {
    en: {
      goal: 'Fill every empty cell with a number from 1 to 9.',
      rules: [
        'Each row must hold every number from 1 to 9 once.',
        'Each column must hold every number from 1 to 9 once.',
        'Each of the nine 3 by 3 boxes must hold every number from 1 to 9 once.',
      ],
      how: [
        'Tap a cell, then tap a number below to put it in.',
        'Notes lets you pencil small numbers into a cell while you are still deciding.',
        'A number turns red when the same number is already in its row, column or box.',
        'Hint points at a cell you can work out; tap Hint again to fill it in.',
      ],
    },
    af: {
      goal: 'Vul elke leë blokkie met ’n nommer van 1 tot 9.',
      rules: [
        'Elke ry moet elke nommer van 1 tot 9 een keer bevat.',
        'Elke kolom moet elke nommer van 1 tot 9 een keer bevat.',
        'Elkeen van die nege 3 by 3-blokke moet elke nommer van 1 tot 9 een keer bevat.',
      ],
      how: [
        'Tik op ’n blokkie, en dan op ’n nommer onderaan om dit in te vul.',
        'Notas laat jou klein nommers in ’n blokkie potlood terwyl jy nog besluit.',
        '’n Nommer word rooi as dieselfde nommer reeds in sy ry, kolom of blok is.',
        'Wenk wys ’n blokkie wat jy kan uitwerk; tik weer op Wenk om dit in te vul.',
      ],
    },
  },

  killer: {
    en: {
      goal: 'Fill every cell with a number from 1 to 9. No numbers are given: the totals are the clues.',
      rules: [
        'Each row, each column and each 3 by 3 box must hold every number from 1 to 9 once, as in sudoku.',
        'The grid is divided into coloured cages. The small number in a cage is its total.',
        'The numbers in a cage must add up to its total.',
        'A number may not appear twice in the same cage.',
      ],
      how: [
        'Tap a cell, then tap a number below. The line under the grid tells you that cage’s total and how much is still to place.',
        'Start with small cages: a cage of two cells that adds up to 3 can only be 1 and 2.',
        'Every row, column and box adds up to 45, which helps when cages fit neatly inside one.',
        'Notes lets you pencil in the numbers a cell could be.',
      ],
    },
    af: {
      goal: 'Vul elke blokkie met ’n nommer van 1 tot 9. Geen nommers word gegee nie: die totale is die leidrade.',
      rules: [
        'Elke ry, elke kolom en elke 3 by 3-blok moet elke nommer van 1 tot 9 een keer bevat, soos in sudoku.',
        'Die rooster is in gekleurde hokke verdeel. Die klein nommer in ’n hok is sy totaal.',
        'Die nommers in ’n hok moet optel tot sy totaal.',
        '’n Nommer mag nie twee keer in dieselfde hok voorkom nie.',
      ],
      how: [
        'Tik op ’n blokkie, en dan op ’n nommer onderaan. Die reël onder die rooster sê wat daardie hok se totaal is en hoeveel nog geplaas moet word.',
        'Begin met klein hokke: ’n hok van twee blokkies wat tot 3 optel, kan net 1 en 2 wees.',
        'Elke ry, kolom en blok tel op tot 45, wat help wanneer hokke netjies binne een pas.',
        'Notas laat jou die nommers potlood wat ’n blokkie kan wees.',
      ],
    },
  },

  kakuro: {
    en: {
      goal: 'Fill every white cell with a number from 1 to 9 so that each run adds up to its clue.',
      rules: [
        'A run is a row of white cells side by side, or a column of them one above another, between dark cells.',
        'The clue for a run across is in the dark cell to its left, in the top right corner.',
        'The clue for a run down is in the dark cell above it, in the bottom left corner.',
        'The numbers in a run must add up to its clue.',
        'A number may not appear twice in the same run.',
      ],
      how: [
        'Tap a white cell, then tap a number below. The line under the grid reads out that cell’s two clues.',
        'Start where a clue leaves little choice: 3 in two cells can only be 1 and 2; 17 in two cells can only be 8 and 9.',
        'Notes lets you pencil in the numbers a cell could be.',
      ],
    },
    af: {
      goal: 'Vul elke wit blokkie met ’n nommer van 1 tot 9 sodat elke reeks optel tot sy leidraad.',
      rules: [
        '’n Reeks is ’n ry wit blokkies langs mekaar, of ’n kolom van hulle onder mekaar, tussen donker blokkies.',
        'Die leidraad vir ’n reeks dwars is in die donker blokkie links daarvan, in die boonste regterhoek.',
        'Die leidraad vir ’n reeks af is in die donker blokkie bo dit, in die onderste linkerhoek.',
        'Die nommers in ’n reeks moet optel tot sy leidraad.',
        '’n Nommer mag nie twee keer in dieselfde reeks voorkom nie.',
      ],
      how: [
        'Tik op ’n wit blokkie, en dan op ’n nommer onderaan. Die reël onder die rooster lees daardie blokkie se twee leidrade.',
        'Begin waar ’n leidraad min keuse laat: 3 in twee blokkies kan net 1 en 2 wees; 17 in twee blokkies kan net 8 en 9 wees.',
        'Notas laat jou die nommers potlood wat ’n blokkie kan wees.',
      ],
    },
  },

  nonogram: {
    en: {
      goal: 'Fill in the right squares to match the numbers beside every row and above every column.',
      rules: [
        'Each number is a run of filled squares in that row or column: "3 1" means a run of three, then a run of one.',
        'The runs come in the order written, left to right or top to bottom.',
        'There is at least one empty square between two runs.',
      ],
      how: [
        'With Fill chosen, tap or drag across squares to fill them. Tap a filled square to empty it.',
        'With Cross chosen, mark squares you know are empty. Crosses are only for you; they are not needed to finish.',
        'A clue fades when its line is complete, and turns red when its line can no longer work.',
        'On big grids, pinch with two fingers to zoom in and drag with two fingers to move about.',
        'Hint lights up a row or column where something can be worked out.',
      ],
    },
    af: {
      goal: 'Vul die regte blokkies in om by die nommers langs elke ry en bo elke kolom te pas.',
      rules: [
        'Elke nommer is ’n reeks gevulde blokkies in daardie ry of kolom: "3 1" beteken ’n reeks van drie, dan ’n reeks van een.',
        'Die reekse kom in die volgorde soos geskryf, van links na regs of van bo na onder.',
        'Daar is ten minste een leë blokkie tussen twee reekse.',
      ],
      how: [
        'Met Vul gekies, tik of sleep oor blokkies om hulle te vul. Tik op ’n gevulde blokkie om dit leeg te maak.',
        'Met Kruis gekies, merk blokkies wat jy weet leeg is. Kruise is net vir jou; hulle is nie nodig om klaar te maak nie.',
        '’n Leidraad verdof wanneer sy lyn klaar is, en word rooi wanneer sy lyn nie meer kan werk nie.',
        'Op groot roosters, knyp met twee vingers om in te zoem en sleep met twee vingers om rond te beweeg.',
        'Wenk verlig ’n ry of kolom waar iets uitgewerk kan word.',
      ],
    },
  },

  gridlock: {
    en: {
      goal: 'Get the red car out through the gap on the right.',
      rules: [
        'Every car and lorry can only slide forwards and backwards along its own length.',
        'Nothing can jump over or pass through anything else.',
        'Only the red car can leave, and only through the gap in the right-hand wall.',
      ],
      how: [
        'Drag a car or lorry to slide it. It stops when it meets another one or the wall.',
        'The number at the top right is the fewest slides the puzzle can be done in. Yours are counted beside it.',
        'There is no hint in this game. Undo takes back your last slide.',
      ],
    },
    af: {
      goal: 'Kry die rooi kar uit deur die gaping aan die regterkant.',
      rules: [
        'Elke kar en vragmotor kan net vorentoe en agtertoe langs sy eie lengte skuif.',
        'Niks kan oor of deur enigiets anders gaan nie.',
        'Net die rooi kar kan uitgaan, en net deur die gaping in die regtermuur.',
      ],
      how: [
        'Sleep ’n kar of vragmotor om dit te skuif. Dit stop wanneer dit ’n ander een of die muur tref.',
        'Die nommer regs bo is die minste skuiwe waarin die raaisel gedoen kan word. Joune word langsaan getel.',
        'Daar is geen wenk in hierdie speletjie nie. Ontdoen neem jou laaste skuif terug.',
      ],
    },
  },

  pour: {
    en: {
      goal: 'Sort the liquids so that every vial holds a single colour, or is empty.',
      rules: [
        'You pour from the top of one vial into another.',
        'You can only pour onto the same colour, or into an empty vial.',
        'A vial holds four layers. If there is not room for all of a colour, only what fits is poured.',
      ],
      how: [
        'Tap a vial to pick it up, then tap the vial to pour into. Tap the same vial again to put it down.',
        'Keep an empty vial free for as long as you can: once both are in use it is easy to get stuck.',
        'Undo takes back your last pour. Restart starts the puzzle again.',
      ],
    },
    af: {
      goal: 'Sorteer die vloeistowwe sodat elke buisie net een kleur bevat, of leeg is.',
      rules: [
        'Jy gooi van die bokant van een buisie in ’n ander.',
        'Jy kan net op dieselfde kleur gooi, of in ’n leë buisie.',
        '’n Buisie hou vier lae. As daar nie plek vir al die kleur is nie, word net soveel gegooi as wat pas.',
      ],
      how: [
        'Tik op ’n buisie om dit op te tel, en dan op die buisie waarin jy wil gooi. Tik weer op dieselfde buisie om dit neer te sit.',
        'Hou ’n leë buisie oop so lank jy kan: sodra albei in gebruik is, sit jy maklik vas.',
        'Ontdoen neem jou laaste gooi terug. Begin oor begin die raaisel van voor af.',
      ],
    },
  },

  stack: {
    en: {
      goal: 'Clear rows to score points, and keep the stack from reaching the top.',
      rules: [
        'Each round you may slide one block sideways, as far as it can go.',
        'A block with nothing under it falls.',
        'A row filled from wall to wall disappears and scores points.',
        'Then the pale blocks shown above the well drop in, and the next round begins.',
        'The game ends when a block has no room to drop.',
      ],
      how: [
        'Drag a block left or right. You get one slide a round, so choose it well.',
        'When a cleared row lets blocks fall and complete another row, that is a chain, and each link scores more.',
        '"Leave it and drop" skips your slide.',
        'There is no undo in this game. Your best score at each difficulty is kept.',
      ],
    },
    af: {
      goal: 'Maak rye skoon om punte te kry, en keer dat die stapel die bokant bereik.',
      rules: [
        'Elke rondte mag jy een blok sywaarts skuif, so ver as wat dit kan gaan.',
        '’n Blok met niks onder hom nie, val.',
        '’n Ry wat van muur tot muur gevul is, verdwyn en tel punte.',
        'Dan val die dowwe blokke wat bo die put gewys word in, en die volgende rondte begin.',
        'Die spel eindig wanneer ’n blok nie plek het om te val nie.',
      ],
      how: [
        'Sleep ’n blok links of regs. Jy kry een skuif per rondte, so kies dit goed.',
        'Wanneer ’n skoongemaakte ry blokke laat val en nog ’n ry voltooi, is dit ’n ketting, en elke skakel tel meer.',
        '"Los dit en laat val" slaan jou skuif oor.',
        'Daar is geen ontdoen in hierdie speletjie nie. Jou beste telling by elke moeilikheid word gehou.',
      ],
    },
  },

  bridges: {
    en: {
      goal: 'Join all the islands into one group with bridges, giving each island exactly the number of bridges written on it.',
      rules: [
        'A bridge runs straight across or straight up and down between two islands, with no island in between.',
        'Two islands can be joined by one bridge or by two, never more.',
        'Bridges may not cross each other.',
        'When you finish, it must be possible to walk from any island to any other.',
      ],
      how: [
        'Tap the water between two islands, or drag from one island to the next: once for one bridge, again for two, a third time to remove them.',
        'An island fades when it has the right number of bridges, and changes colour when it has too many.',
        'Start with islands that have no choice: an 8 needs two bridges every way; a 1 in a corner with one neighbour has only one place to go.',
      ],
    },
    af: {
      goal: 'Verbind al die eilande in een groep met brûe, en gee elke eiland presies die getal brûe wat daarop geskryf is.',
      rules: [
        '’n Brug loop reguit dwars of reguit op en af tussen twee eilande, met geen eiland tussenin nie.',
        'Twee eilande kan deur een brug of deur twee verbind word, nooit meer nie.',
        'Brûe mag nie mekaar kruis nie.',
        'Wanneer jy klaar is, moet dit moontlik wees om van enige eiland na enige ander te loop.',
      ],
      how: [
        'Tik op die water tussen twee eilande, of sleep van een eiland na die volgende: een keer vir een brug, weer vir twee, ’n derde keer om hulle te verwyder.',
        '’n Eiland verdof wanneer dit die regte getal brûe het, en verander van kleur wanneer dit te veel het.',
        'Begin met eilande wat geen keuse het nie: ’n 8 het twee brûe in elke rigting nodig; ’n 1 in ’n hoek met een buurman het net een plek om heen te gaan.',
      ],
    },
  },

  binairo: {
    en: {
      goal: 'Fill every cell with a dark circle or a light circle.',
      rules: [
        'Never three of the same kind next to each other, across or down.',
        'Every row has as many dark circles as light ones, and so does every column.',
        'No two rows are exactly the same, and no two columns are exactly the same.',
      ],
      how: [
        'Tap a cell: once for dark, again for light, a third time to clear it. The circles on shaded cells are given and cannot change.',
        'Look for two of a kind side by side: the cells at each end must be the other kind.',
        'Look for two of a kind with a gap between: the gap must be the other kind.',
        'Cells are marked when a rule is visibly broken.',
      ],
    },
    af: {
      goal: 'Vul elke blokkie met ’n donker sirkel of ’n ligte sirkel.',
      rules: [
        'Nooit drie van dieselfde soort langs mekaar nie, dwars of af.',
        'Elke ry het net soveel donker sirkels as ligtes, en so ook elke kolom.',
        'Geen twee rye is presies dieselfde nie, en geen twee kolomme is presies dieselfde nie.',
      ],
      how: [
        'Tik op ’n blokkie: een keer vir donker, weer vir lig, ’n derde keer om dit skoon te maak. Die sirkels op geskakeerde blokkies is gegee en kan nie verander nie.',
        'Soek twee van ’n soort langs mekaar: die blokkies aan elke kant moet die ander soort wees.',
        'Soek twee van ’n soort met ’n gaping tussenin: die gaping moet die ander soort wees.',
        'Blokkies word gemerk wanneer ’n reël sigbaar gebreek is.',
      ],
    },
  },

  tents: {
    en: {
      goal: 'Give every tree a tent of its own.',
      rules: [
        'Each tent stands in a square directly beside its tree: above, below, left or right, not diagonally.',
        'Each tree has exactly one tent, and each tent belongs to exactly one tree.',
        'Tents never touch each other, not even at a corner.',
        'The numbers beside the rows and above the columns say how many tents are in that line.',
      ],
      how: [
        'Tap a square: once for a tent, again for grass (meaning "no tent here"), a third time to clear it.',
        'Drag across squares to mark several as grass in one go.',
        'A number fades when its line has the right count of tents, and turns red when it cannot work.',
        'Start by marking as grass every square that is not beside a tree, and every square in a line marked 0.',
      ],
    },
    af: {
      goal: 'Gee elke boom sy eie tent.',
      rules: [
        'Elke tent staan in ’n blokkie direk langs sy boom: bo, onder, links of regs, nie skuins nie.',
        'Elke boom het presies een tent, en elke tent behoort aan presies een boom.',
        'Tente raak nooit aan mekaar nie, nie eens by ’n hoek nie.',
        'Die nommers langs die rye en bo die kolomme sê hoeveel tente in daardie lyn is.',
      ],
      how: [
        'Tik op ’n blokkie: een keer vir ’n tent, weer vir gras (dit beteken "geen tent hier nie"), ’n derde keer om dit skoon te maak.',
        'Sleep oor blokkies om ’n paar gelyk as gras te merk.',
        '’n Nommer verdof wanneer sy lyn die regte getal tente het, en word rooi wanneer dit nie kan werk nie.',
        'Begin deur elke blokkie wat nie langs ’n boom is nie as gras te merk, en elke blokkie in ’n lyn gemerk 0.',
      ],
    },
  },
};

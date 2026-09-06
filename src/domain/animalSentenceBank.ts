export interface AnimalSentenceEntry {
  id: string
  /** Full spoken English riddle — hand-authored, one distinguishing clue per animal so the
   * answer is unambiguous even before seeing the choices. */
  question: string
  /** wordId of the correct answer, from wordBank's 'animal' category. */
  animalId: string
}

/** Hand-picked animal riddles — each clue names a feature/behavior unique enough among
 * wordBank's animals that the sentence has exactly one right answer. Reuses existing
 * animal photos entirely (see colorSentenceBank.ts for the same "existing art only"
 * reasoning), so this needs zero new illustration work. */
export const animalSentenceBank: AnimalSentenceEntry[] = [
  { id: 'kangaroo', question: 'What animal has a pocket on its belly?', animalId: 'kangaroo' },
  { id: 'giraffe', question: 'What animal has a very long neck?', animalId: 'giraffe' },
  { id: 'zebra', question: 'What animal has black and white stripes?', animalId: 'zebra' },
  { id: 'elephant', question: 'What animal has a long trunk?', animalId: 'elephant' },
  { id: 'camel', question: 'What animal has a hump on its back?', animalId: 'camel' },
  { id: 'chameleon', question: 'What animal can change its color?', animalId: 'chameleon' },
  { id: 'turtle', question: 'What animal has a hard shell on its back?', animalId: 'turtle' },
  { id: 'snail', question: 'What animal carries its house on its back?', animalId: 'snail' },
  { id: 'spider', question: 'What animal has eight legs and spins a web?', animalId: 'spider' },
  { id: 'octopus', question: 'What animal has eight arms and squirts ink?', animalId: 'octopus' },
  { id: 'crab', question: 'What animal has pincers and walks sideways?', animalId: 'crab' },
  { id: 'squirrel', question: 'What animal has a bushy tail and collects nuts?', animalId: 'squirrel' },
  { id: 'rabbit', question: 'What animal has long ears and hops?', animalId: 'rabbit' },
  { id: 'raccoon', question: 'What animal has a mask-like face and comes out at night?', animalId: 'raccoon' },
  { id: 'ladybug', question: 'What animal has a red shell with black spots?', animalId: 'ladybug' },
  { id: 'bee', question: 'What animal makes honey?', animalId: 'bee' },
  { id: 'penguin', question: 'What animal cannot fly but swims well in cold water?', animalId: 'penguin' },
  { id: 'anteater', question: 'What animal has a long snout and eats ants?', animalId: 'anteater' },
  { id: 'hedgehog', question: 'What animal is covered in sharp spikes?', animalId: 'hedgehog' },
  { id: 'beaver', question: 'What animal has a flat tail and builds dams?', animalId: 'beaver' },
]

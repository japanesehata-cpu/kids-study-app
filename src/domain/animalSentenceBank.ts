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
  { id: 'lion', question: 'What animal has a big furry mane and roars loudly?', animalId: 'lion' },
  { id: 'tiger', question: 'What animal has orange fur with black stripes?', animalId: 'tiger' },
  { id: 'monkey', question: 'What animal loves bananas and swings from trees?', animalId: 'monkey' },
  { id: 'koala', question: 'What animal sleeps in trees and eats eucalyptus leaves?', animalId: 'koala' },
  { id: 'panda', question: 'What animal is black and white and eats bamboo?', animalId: 'panda' },
  { id: 'fox', question: 'What animal has orange-red fur, a pointed face, and big ears?', animalId: 'fox' },
  { id: 'owl', question: "What animal is awake at night and says 'hoot'?", animalId: 'owl' },
  { id: 'butterfly', question: 'What animal starts as a caterpillar and grows colorful wings?', animalId: 'butterfly' },
  { id: 'deer', question: 'What animal has antlers and lives in the forest?', animalId: 'deer' },
  { id: 'sloth', question: 'What animal moves very slowly and hangs upside down in trees?', animalId: 'sloth' },
  { id: 'macaw', question: 'What animal is a colorful parrot with a very long tail?', animalId: 'macaw' },
  { id: 'platypus', question: "What animal has a duck's bill and lays eggs but is a mammal?", animalId: 'platypus' },
  { id: 'ostrich', question: 'What animal is the biggest bird but cannot fly?', animalId: 'ostrich' },
  { id: 'hippopotamus', question: 'What animal has a huge mouth and lives in rivers in Africa?', animalId: 'hippopotamus' },
  { id: 'rhinoceros', question: 'What animal has a horn on its nose and thick gray skin?', animalId: 'rhinoceros' },
  { id: 'jellyfish', question: 'What animal has no bones and can sting you in the ocean?', animalId: 'jellyfish' },
  { id: 'flamingo', question: 'What animal stands on one leg and is pink?', animalId: 'flamingo' },
  { id: 'otter', question: 'What animal floats on its back and uses a rock to open shells?', animalId: 'otter' },
  { id: 'walrus', question: 'What animal has two long tusks and lives in the cold ocean?', animalId: 'walrus' },
  { id: 'porcupine', question: 'What animal is covered in sharp quills?', animalId: 'porcupine' },
  { id: 'chimpanzee', question: 'What animal is a great ape that uses tools?', animalId: 'chimpanzee' },
  { id: 'gorilla', question: 'What animal is a huge, strong ape that beats its chest?', animalId: 'gorilla' },
  { id: 'cheetah', question: 'What animal is the fastest animal on land?', animalId: 'cheetah' },
  { id: 'leopard', question: 'What animal has yellow fur with black spots and climbs trees?', animalId: 'leopard' },
  { id: 'crocodile', question: 'What animal has a long snout full of teeth and lives in rivers?', animalId: 'crocodile' },
  { id: 'scorpion', question: 'What animal has a stinger on its tail and pincers like a crab?', animalId: 'scorpion' },
  { id: 'dragonfly', question: 'What animal has two pairs of wings and hovers over ponds?', animalId: 'dragonfly' },
  { id: 'firefly', question: 'What animal glows in the dark at night?', animalId: 'firefly' },
  { id: 'caterpillar', question: 'What animal turns into a butterfly?', animalId: 'caterpillar' },
  { id: 'squid', question: 'What animal has ten arms and lives in the ocean?', animalId: 'squid' },
  { id: 'starfish', question: 'What animal has five arms and lives in the sea?', animalId: 'starfish' },
  { id: 'seahorse', question: 'What animal looks like a tiny horse but lives in the ocean?', animalId: 'seahorse' },
  { id: 'eagle', question: 'What animal is a powerful bird that hunts from the sky?', animalId: 'eagle' },
]

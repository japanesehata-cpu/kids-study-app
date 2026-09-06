import type { WordEntry } from './wordBank'

export interface MiscSentenceEntry {
  id: string
  /** Full spoken English riddle — hand-authored, one distinguishing clue per item so the
   * answer is unambiguous even before seeing the choices. Phrasing varies by category
   * ("What vehicle...", "What do you wear...", "What tool...") rather than one rigid
   * template, matching how naturally a question about that category would actually be
   * asked. */
  question: string
  /** wordId of the correct answer. */
  wordId: string
  /** wordBank category the answer belongs to — distractors are drawn from this same
   * category (see questionGenerators/englishSentence.ts's pickCategoryDistractors),
   * mirroring how animalSentenceBank.ts's riddles draw from the 'animal' category. */
  category: WordEntry['category']
}

/** Extends englishSentence beyond color/animal riddles into every other wordBank category
 * — vehicles, food, shapes, clothing, household items, school supplies, weather, body
 * parts, sports, instruments, toys, and nature. Reuses existing word-bank photos entirely,
 * so this needs zero new illustration work (same reasoning as colorSentenceBank.ts /
 * animalSentenceBank.ts). Skips 'place' (too few eligible entries to riddle well) and
 * anything sensitive or ambiguous. */
export const miscSentenceBank: MiscSentenceEntry[] = [
  // vehicle
  { id: 'airplane', question: 'What vehicle flies in the sky and has wings?', wordId: 'airplane', category: 'vehicle' },
  { id: 'bicycle', question: 'What vehicle has two wheels and no engine, you pedal it?', wordId: 'bicycle', category: 'vehicle' },
  { id: 'helicopter', question: 'What vehicle has spinning blades on top and can hover in the air?', wordId: 'helicopter', category: 'vehicle' },
  { id: 'firetruck', question: 'What vehicle is red and used to put out fires?', wordId: 'firetruck', category: 'vehicle' },
  { id: 'rocket', question: 'What vehicle flies into space?', wordId: 'rocket', category: 'vehicle' },
  { id: 'train', question: 'What vehicle has many cars connected together and runs on tracks?', wordId: 'train', category: 'vehicle' },

  // food
  { id: 'pizza', question: 'What food is round, flat, and has cheese on top?', wordId: 'pizza', category: 'food' },
  { id: 'icecream', question: 'What food is cold and sweet, and melts in the sun?', wordId: 'icecream', category: 'food' },
  { id: 'watermelon', question: 'What food is green outside and red inside, with black seeds?', wordId: 'watermelon', category: 'food' },
  { id: 'egg', question: 'What food comes from a chicken and has a shell?', wordId: 'egg', category: 'food' },
  { id: 'honey', question: 'What food is sweet and made by bees?', wordId: 'honey', category: 'food' },
  { id: 'popcorn', question: 'What food pops when you heat it, and you eat it at the movies?', wordId: 'popcorn', category: 'food' },

  // shape (all 5)
  { id: 'circle', question: 'What shape is round with no corners?', wordId: 'circle', category: 'shape' },
  { id: 'triangle', question: 'What shape has three sides?', wordId: 'triangle', category: 'shape' },
  { id: 'hexagon', question: 'What shape has six sides?', wordId: 'hexagon', category: 'shape' },
  { id: 'cube', question: 'What shape has six flat square sides, like a dice?', wordId: 'cube', category: 'shape' },
  { id: 'sphere', question: 'What shape is round like a ball?', wordId: 'sphere', category: 'shape' },

  // clothing
  { id: 'hat', question: 'What do you wear on your head to keep the sun off?', wordId: 'hat', category: 'clothing' },
  { id: 'gloves', question: 'What do you wear on your hands to keep them warm?', wordId: 'gloves', category: 'clothing' },
  { id: 'boots', question: 'What do you wear on your feet in the rain or snow?', wordId: 'boots', category: 'clothing' },
  { id: 'sunglasses', question: 'What do you wear over your eyes on a sunny day?', wordId: 'sunglasses', category: 'clothing' },
  { id: 'scarf', question: 'What do you wear around your neck to stay warm?', wordId: 'scarf', category: 'clothing' },

  // household
  { id: 'refrigerator', question: 'What keeps your food cold in the kitchen?', wordId: 'refrigerator', category: 'household' },
  { id: 'toothbrush', question: 'What do you use to clean your teeth?', wordId: 'toothbrush', category: 'household' },
  { id: 'broom', question: 'What do you use to sweep the floor?', wordId: 'broom', category: 'household' },
  { id: 'pillow', question: 'What is soft, and you put your head on it to sleep?', wordId: 'pillow', category: 'household' },
  { id: 'vacuum', question: 'What machine do you use to clean the carpet?', wordId: 'vacuum', category: 'household' },

  // school
  { id: 'scissors', question: 'What tool do you use to cut paper?', wordId: 'scissors', category: 'school' },
  { id: 'ruler', question: 'What tool do you use to measure or draw a straight line?', wordId: 'ruler', category: 'school' },
  { id: 'eraser', question: 'What do you use to remove pencil marks?', wordId: 'eraser', category: 'school' },
  { id: 'globe', question: 'What object shows a map of the whole world, and spins?', wordId: 'globe', category: 'school' },
  { id: 'blackboard', question: 'What do teachers write on with chalk?', wordId: 'blackboard', category: 'school' },

  // weather
  { id: 'rain', question: 'What falls from the sky and makes puddles?', wordId: 'rain', category: 'weather' },
  { id: 'snow', question: 'What is cold, white, and falls in winter?', wordId: 'snow', category: 'weather' },
  { id: 'lightning', question: 'What is a bright flash of light in the sky during a storm?', wordId: 'lightning', category: 'weather' },
  { id: 'fog', question: 'What weather makes it hard to see far away?', wordId: 'fog', category: 'weather' },

  // bodyPart
  { id: 'nose', question: 'What body part do you use to smell?', wordId: 'nose', category: 'bodyPart' },
  { id: 'ear', question: 'What body part do you use to hear?', wordId: 'ear', category: 'bodyPart' },
  { id: 'teeth', question: 'What body part do you use to chew your food?', wordId: 'teeth', category: 'bodyPart' },
  { id: 'hand', question: 'What body part has five fingers?', wordId: 'hand', category: 'bodyPart' },

  // sport
  { id: 'swimming', question: 'What sport do you do in a pool?', wordId: 'swimming', category: 'sport' },
  { id: 'soccer', question: 'What sport do you play by kicking a ball into a goal?', wordId: 'soccer', category: 'sport' },
  { id: 'basketball', question: 'What sport do you play by throwing a ball into a hoop?', wordId: 'basketball', category: 'sport' },
  { id: 'skiing', question: 'What sport do you do on snow with two long boards on your feet?', wordId: 'skiing', category: 'sport' },

  // instrument
  { id: 'piano', question: 'What instrument has black and white keys?', wordId: 'piano', category: 'instrument' },
  { id: 'guitar', question: 'What instrument has strings that you strum?', wordId: 'guitar', category: 'instrument' },
  { id: 'drum', question: 'What instrument do you hit to make a beat?', wordId: 'drum', category: 'instrument' },
  { id: 'trumpet', question: 'What instrument do you blow into, and is gold and curvy?', wordId: 'trumpet', category: 'instrument' },

  // toy
  { id: 'kite', question: 'What toy flies in the sky on a string?', wordId: 'kite', category: 'toy' },
  { id: 'puzzle', question: 'What toy has pieces that fit together to make a picture?', wordId: 'puzzle', category: 'toy' },
  { id: 'robot', question: 'What toy can move and looks like a machine person?', wordId: 'robot', category: 'toy' },
  { id: 'teddybear', question: 'What soft toy do you hug and take to bed?', wordId: 'teddybear', category: 'toy' },

  // nature
  { id: 'rainbow', question: 'What colorful arc appears in the sky after it rains?', wordId: 'rainbow', category: 'nature' },
  { id: 'cactus', question: 'What plant has spikes and lives in the desert?', wordId: 'cactus', category: 'nature' },
  { id: 'waterfall', question: 'What is water falling down from a high place called?', wordId: 'waterfall', category: 'nature' },
  { id: 'moon', question: 'What is round, white, and you see in the sky at night?', wordId: 'moon', category: 'nature' },
]

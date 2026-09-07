export interface ColorSentenceEntry {
  id: string
  /** Full spoken English question — hand-authored so article/plural grammar is always
   * correct (a banana / an apple / broccoli / the sun), rather than composed from a
   * subject string at runtime. */
  question: string
  /** wordId of the correct answer, from wordBank's 'color' category. */
  colorId: string
}

/** Hand-picked subjects whose color is unambiguous and already true of their existing
 * word-bank photo, so this needs zero new illustration work (see
 * questionGenerators/englishSentence.ts). Deliberately skips subjects whose real color is
 * ambiguous or split (zebra, panda, peach, kiwi, pineapple) and anything orange — wordBank
 * has no color-category entry for "orange" (the id collides with the fruit `orange`, which
 * would render a fruit photo instead of a swatch; see the plan for this feature). */
export const colorSentenceBank: ColorSentenceEntry[] = [
  { id: 'banana', question: 'What color is a banana?', colorId: 'yellow' },
  { id: 'lemon', question: 'What color is a lemon?', colorId: 'yellow' },
  { id: 'sun', question: 'What color is the sun?', colorId: 'yellow' },
  { id: 'apple', question: 'What color is an apple?', colorId: 'red' },
  { id: 'strawberry', question: 'What color is a strawberry?', colorId: 'red' },
  { id: 'tomato', question: 'What color is a tomato?', colorId: 'red' },
  { id: 'broccoli', question: 'What color is broccoli?', colorId: 'green' },
  { id: 'frog', question: 'What color is a frog?', colorId: 'green' },
  { id: 'grass', question: 'What color is grass?', colorId: 'green' },
  { id: 'grape', question: 'What color is a grape?', colorId: 'purple' },
  { id: 'eggplant', question: 'What color is an eggplant?', colorId: 'purple' },
  { id: 'blueberry', question: 'What color is a blueberry?', colorId: 'blue' },
  { id: 'flamingo', question: 'What color is a flamingo?', colorId: 'pink' },
  { id: 'pig', question: 'What color is a pig?', colorId: 'pink' },
  { id: 'snow', question: 'What color is snow?', colorId: 'white' },
  { id: 'milk', question: 'What color is milk?', colorId: 'white' },
  { id: 'bread', question: 'What color is bread?', colorId: 'brown' },
  { id: 'potato', question: 'What color is a potato?', colorId: 'brown' },
  { id: 'elephant', question: 'What color is an elephant?', colorId: 'gray' },
  { id: 'crow', question: 'What color is a crow?', colorId: 'black' },
  { id: 'corn', question: 'What color is corn?', colorId: 'yellow' },
  { id: 'canary', question: 'What color is a canary?', colorId: 'yellow' },
  { id: 'lemonade', question: 'What color is lemonade?', colorId: 'yellow' },
  { id: 'cherry', question: 'What color is a cherry?', colorId: 'red' },
  { id: 'firetruck', question: 'What color is a fire truck?', colorId: 'red' },
  { id: 'ladybug', question: 'What color is a ladybug?', colorId: 'red' },
  { id: 'stopsign', question: 'What color is a stop sign?', colorId: 'red' },
  { id: 'leaves', question: 'What color are leaves?', colorId: 'green' },
  { id: 'cucumber', question: 'What color is a cucumber?', colorId: 'green' },
  { id: 'turtle', question: 'What color is a turtle?', colorId: 'green' },
  { id: 'grasshopper', question: 'What color is a grasshopper?', colorId: 'green' },
  { id: 'sky', question: 'What color is the sky?', colorId: 'blue' },
  { id: 'ocean', question: 'What color is the ocean?', colorId: 'blue' },
  { id: 'jeans', question: 'What color are jeans?', colorId: 'blue' },
  { id: 'bluejay', question: 'What color is a blue jay?', colorId: 'blue' },
  { id: 'plum', question: 'What color is a plum?', colorId: 'purple' },
  { id: 'lavender', question: 'What color is lavender?', colorId: 'purple' },
  { id: 'cottoncandy', question: 'What color is cotton candy?', colorId: 'pink' },
  { id: 'bubblegum', question: 'What color is bubblegum?', colorId: 'pink' },
  { id: 'cloud', question: 'What color is a cloud?', colorId: 'white' },
  { id: 'polarbear', question: 'What color is a polar bear?', colorId: 'white' },
  { id: 'egg', question: 'What color is an egg?', colorId: 'white' },
  { id: 'rice', question: 'What color is rice?', colorId: 'white' },
  { id: 'chocolate', question: 'What color is chocolate?', colorId: 'brown' },
  { id: 'treetrunk', question: 'What color is a tree trunk?', colorId: 'brown' },
  { id: 'coconut', question: 'What color is a coconut?', colorId: 'brown' },
  { id: 'wolf', question: 'What color is a wolf?', colorId: 'gray' },
  { id: 'mouse', question: 'What color is a mouse?', colorId: 'gray' },
  { id: 'dolphin', question: 'What color is a dolphin?', colorId: 'gray' },
  { id: 'bat', question: 'What color is a bat?', colorId: 'black' },
  { id: 'spider', question: 'What color is a spider?', colorId: 'black' },
  { id: 'tire', question: 'What color is a tire?', colorId: 'black' },
  { id: 'sand', question: 'What color is sand?', colorId: 'beige' },
]

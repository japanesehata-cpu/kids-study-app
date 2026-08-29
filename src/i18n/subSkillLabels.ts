import type { DictionaryKey } from './dictionary'

export const subSkillLabelKey: Record<string, DictionaryKey> = {
  'addition-no-carry': 'subSkillAdditionNoCarry',
  'addition-carry': 'subSkillAdditionCarry',
  // No longer produced by the generator (every level shows visuals now), but kept
  // mapped so a subSkill tag saved to localStorage before this change can still resolve
  // to a label instead of crashing the results breakdown — same class of bug just fixed
  // for addition's showVisual field.
  'subtraction-visual': 'subSkillSubtractionVisual',
  'subtraction-basic': 'subSkillSubtractionBasic',
  'subtraction-extended': 'subSkillSubtractionExtended',
  'word-animal': 'subSkillWordAnimal',
  // 'fruit' was folded into the broader 'food' category below; kept mapped so an older
  // saved subSkill tag still resolves instead of crashing the results breakdown.
  'word-fruit': 'subSkillWordFruit',
  'word-food': 'subSkillWordFood',
  'word-nature': 'subSkillWordNature',
  'word-color': 'subSkillWordColor',
  'word-vehicle': 'subSkillWordVehicle',
  'logic-pattern': 'subSkillLogicPattern',
  'logic-oddOneOut': 'subSkillLogicOddOneOut',
  'logic-compare': 'subSkillLogicCompare',
  'hiragana-vowels': 'subSkillHiraganaVowels',
  'hiragana-basic': 'subSkillHiraganaBasic',
  'hiragana-mid': 'subSkillHiraganaMid',
  'hiragana-advanced': 'subSkillHiraganaAdvanced',
  'katakana-vowels': 'subSkillKatakanaVowels',
  'katakana-basic': 'subSkillKatakanaBasic',
  'katakana-mid': 'subSkillKatakanaMid',
  'katakana-advanced': 'subSkillKatakanaAdvanced',
  'alphabet-uppercase': 'subSkillAlphabetUppercase',
  'alphabet-lowercase': 'subSkillAlphabetLowercase',
  'alphabet-case-match': 'subSkillAlphabetCaseMatch',
  'clock-oclock': 'subSkillClockOclock',
  'clock-half': 'subSkillClockHalf',
  'clock-quarter': 'subSkillClockQuarter',
  'spot-obvious': 'subSkillSpotObvious',
  'spot-similar': 'subSkillSpotSimilar',
  'spot-subtle': 'subSkillSpotSubtle',
  'counting-basic': 'subSkillCountingBasic',
  'counting-distraction': 'subSkillCountingDistraction',
}

import type { DictionaryKey } from '../i18n/dictionary'
import type { WordEntry, WordSubgroup } from './wordBank'

/** なかまはずれ's group names on the なかまカード badge: ★1 names the big category, ★2 the
 * finer subgroup. Keys only — the same pattern as categoryMeta.ts — so domain depends on
 * the dictionary's key type alone (repository-structure.md 3). */
export const wordCategoryLabelKey: Record<WordEntry['category'], DictionaryKey> = {
  animal: 'wordCategoryAnimal',
  food: 'wordCategoryFood',
  nature: 'wordCategoryNature',
  color: 'wordCategoryColor',
  vehicle: 'wordCategoryVehicle',
  clothing: 'wordCategoryClothing',
  household: 'wordCategoryHousehold',
  school: 'wordCategorySchool',
  weather: 'wordCategoryWeather',
  bodyPart: 'wordCategoryBodyPart',
  toy: 'wordCategoryToy',
  sport: 'wordCategorySport',
  instrument: 'wordCategoryInstrument',
  shape: 'wordCategoryShape',
  place: 'wordCategoryPlace',
}

export const wordSubgroupLabelKey: Record<WordSubgroup, DictionaryKey> = {
  mammal: 'wordSubgroupMammal',
  bird: 'wordSubgroupBird',
  insect: 'wordSubgroupInsect',
  reptile: 'wordSubgroupReptile',
  fish: 'wordSubgroupFish',
  amphibian: 'wordSubgroupAmphibian',
  fruit: 'wordSubgroupFruit',
  vegetable: 'wordSubgroupVegetable',
  sweets: 'wordSubgroupSweets',
  drink: 'wordSubgroupDrink',
}

import type { DictionaryKey } from './dictionary'
import type { WordEntry, WordSubgroup } from '../domain/wordBank'

/** なかまはずれ's group names: ★1 names the big category, ★2 the finer subgroup. */
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

export function generateNumericChoices(correct: number, min = 0, max = 20): number[] {
  const choices = new Set<number>([correct])
  let guard = 0
  while (choices.size < 4 && guard < 100) {
    guard++
    const delta = Math.floor(Math.random() * 5) - 2
    const candidate = correct + delta
    if (candidate < min || candidate > max || candidate === correct) continue
    choices.add(candidate)
  }
  // extremely rare fallback if the range was too tight to find 3 distractors
  let filler = min
  while (choices.size < 4 && filler <= max) {
    choices.add(filler)
    filler++
  }
  return [...choices].sort(() => Math.random() - 0.5)
}

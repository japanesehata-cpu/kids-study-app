import { describe, expect, it } from 'vitest'
import { generateShapesQuestion } from '../questionGenerators/shapes'
import type { Level } from '../types'

const ALL_LEVELS: Level[] = [1, 2, 3, 4, 5, 6]

describe('generateShapesQuestion', () => {
  it('★1 always produces a pickShape question from the 4-shape easy pool', () => {
    const easyPool = new Set(['circle', 'triangle', 'square', 'star'])
    for (let i = 0; i < 200; i++) {
      const q = generateShapesQuestion(1)
      expect(q.kind).toBe('pickShape')
      expect(q.subSkill).toBe('shapes-basic')
      expect(q.shapeId).toBeUndefined()
      expect(easyPool.has(q.answer)).toBe(true)
      expect(q.choices).toEqual(expect.arrayContaining([q.answer]))
    }
  })

  it('★2 always produces a casual pickName question', () => {
    const pool = new Set(['circle', 'triangle', 'square', 'rectangle', 'star', 'heart', 'rhombus'])
    const seenShapes = new Set<string>()
    for (let i = 0; i < 300; i++) {
      const q = generateShapesQuestion(2)
      expect(q.kind).toBe('pickName')
      expect(q.nameStyle).toBe('casual')
      expect(q.subSkill).toBe('shapes-name')
      expect(pool.has(q.shapeId as string)).toBe(true)
      expect(q.answer).toBe(q.shapeId)
      seenShapes.add(q.shapeId as string)
    }
    // full-pool coverage over enough draws
    expect(seenShapes.size).toBe(pool.size)
  })

  it('★3 always produces a countSides question whose answer matches the real side count', () => {
    const sideCount: Record<string, number> = {
      triangle: 3,
      rightTriangle: 3,
      square: 4,
      rectangle: 4,
      rhombus: 4,
    }
    for (let i = 0; i < 200; i++) {
      const q = generateShapesQuestion(3)
      expect(q.kind).toBe('countSides')
      expect(q.subSkill).toBe('shapes-sides')
      expect(q.shapeId).toBeDefined()
      expect(q.answer).toBe(String(sideCount[q.shapeId as string]))
      expect(['2', '3', '4', '5']).toContain(q.answer)
    }
  })

  it('★4 always produces a casual pickName question over the 4 solid shapes', () => {
    const pool = new Set(['sphere', 'cube', 'cylinder', 'cone'])
    for (let i = 0; i < 200; i++) {
      const q = generateShapesQuestion(4)
      expect(q.kind).toBe('pickName')
      expect(q.nameStyle).toBe('casual')
      expect(q.subSkill).toBe('shapes-solid')
      expect(pool.has(q.shapeId as string)).toBe(true)
      expect(q.answer).toBe(q.shapeId)
    }
  })

  it('★5 always produces a formal pickName question whose answer matches the real formal category', () => {
    const formalCategory: Record<string, string> = {
      triangle: 'triangleFormal',
      rightTriangle: 'triangleFormal',
      square: 'quadrilateralFormal',
      rectangle: 'quadrilateralFormal',
      rhombus: 'quadrilateralFormal',
      circle: 'circleFormal',
      star: 'starFormal',
    }
    for (let i = 0; i < 200; i++) {
      const q = generateShapesQuestion(5)
      expect(q.kind).toBe('pickName')
      expect(q.nameStyle).toBe('formal')
      expect(q.subSkill).toBe('shapes-formal')
      expect(q.answer).toBe(formalCategory[q.shapeId as string])
      // all 4 formal categories are always shown together
      expect(new Set(q.choices)).toEqual(
        new Set(['triangleFormal', 'quadrilateralFormal', 'circleFormal', 'starFormal']),
      )
    }
  })

  it('★6 always produces a pickShape question from the 4 confusable quadrilaterals', () => {
    const hardPool = new Set(['square', 'rectangle', 'rightTriangle', 'rhombus'])
    for (let i = 0; i < 200; i++) {
      const q = generateShapesQuestion(6)
      expect(q.kind).toBe('pickShape')
      expect(q.subSkill).toBe('shapes-classify')
      expect(q.shapeId).toBeUndefined()
      expect(hardPool.has(q.answer)).toBe(true)
      expect(new Set(q.choices)).toEqual(hardPool)
    }
  })

  it('always produces exactly 4 distinct choices that include the answer, at every level', () => {
    for (const level of ALL_LEVELS) {
      for (let i = 0; i < 100; i++) {
        const q = generateShapesQuestion(level)
        expect(q.choices).toHaveLength(4)
        expect(new Set(q.choices).size).toBe(4)
        expect(q.choices).toContain(q.answer)
      }
    }
  })

  it('always produces a fresh, unique id', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateShapesQuestion(1).id)
    }
    expect(ids.size).toBe(100)
  })
})

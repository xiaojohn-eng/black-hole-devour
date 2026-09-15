export interface LevelConfig {
  id: number
  name: string
  /** Starting player mass */
  startMass: number
  /** Target mass to clear level */
  targetMass: number
  /** World spawn radius */
  worldRadius: number
  /** Max concurrent bodies */
  maxBodies: number
  /** Asteroid / star / planet / rival BH weights */
  spawnWeights: { asteroid: number; star: number; planet: number; rival: number }
  /** Mass range multipliers relative to player */
  massScale: { min: number; max: number }
  /** Rival black hole count target */
  rivalCount: number
  /** Ambient spawn rate (bodies / sec) */
  spawnRate: number
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: '星际尘埃带',
    startMass: 10,
    targetMass: 80,
    worldRadius: 90,
    maxBodies: 55,
    spawnWeights: { asteroid: 0.7, star: 0.22, planet: 0.08, rival: 0 },
    massScale: { min: 0.15, max: 1.8 },
    rivalCount: 0,
    spawnRate: 2.2,
  },
  {
    id: 2,
    name: '恒星摇篮',
    startMass: 80,
    targetMass: 320,
    worldRadius: 120,
    maxBodies: 70,
    spawnWeights: { asteroid: 0.45, star: 0.35, planet: 0.15, rival: 0.05 },
    massScale: { min: 0.2, max: 2.4 },
    rivalCount: 2,
    spawnRate: 2.8,
  },
  {
    id: 3,
    name: '星系核心',
    startMass: 320,
    targetMass: 1200,
    worldRadius: 150,
    maxBodies: 85,
    spawnWeights: { asteroid: 0.3, star: 0.35, planet: 0.2, rival: 0.15 },
    massScale: { min: 0.25, max: 3.2 },
    rivalCount: 4,
    spawnRate: 3.4,
  },
]

export function getLevel(id: number): LevelConfig {
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, id - 1))]!
}

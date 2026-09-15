export class ObjectPool<T> {
  private free: T[] = []
  private active: Set<T> = new Set()
  private factory: () => T
  private reset: (item: T) => void

  constructor(factory: () => T, reset: (item: T) => void, initial = 16) {
    this.factory = factory
    this.reset = reset
    for (let i = 0; i < initial; i++) this.free.push(factory())
  }

  acquire(): T {
    const item = this.free.pop() ?? this.factory()
    this.reset(item)
    this.active.add(item)
    return item
  }

  release(item: T): void {
    if (!this.active.has(item)) return
    this.active.delete(item)
    this.reset(item)
    this.free.push(item)
  }

  releaseAll(): void {
    for (const item of this.active) {
      this.reset(item)
      this.free.push(item)
    }
    this.active.clear()
  }

  getActive(): IterableIterator<T> {
    return this.active.values()
  }

  get size(): number {
    return this.active.size
  }
}

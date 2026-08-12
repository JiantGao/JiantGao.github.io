import type { Idiom, IndexRecord } from '@/types/idiom'

/** meta.json 结构（构建产物） */
export interface DictMeta {
  version: string
  total: number
  chunkSize: number
  detailChunkCount: number
  indexChunkCount: number
  sourceSha256: string
  curatedCount: number
}

/** index.json 结构（构建产物） */
export interface IndexFile {
  version: number
  count: number
  chunkSize: number
  records: IndexRecord[]
}

/** 各详情分块的懒加载器（由 import.meta.glob 生成，直接取 default 导出） */
const chunkLoaders = import.meta.glob<Idiom[]>('../../data/generated/details.*.json', {
  import: 'default',
})

/** 单文件懒加载：索引与 meta */
async function loadIndexFile(): Promise<IndexFile> {
  const mod = await import('../../data/generated/index.json')
  return mod.default as IndexFile
}

async function loadMetaFile(): Promise<DictMeta> {
  const mod = await import('../../data/generated/meta.json')
  return mod.default as DictMeta
}

/** 详情分块加载 + LRU 缓存 */
export class ChunkCache {
  private cache = new Map<number, Idiom[]>()
  private pending = new Map<number, Promise<Idiom[]>>()
  constructor(private maxChunks = 4) {}

  async getChunk(chunk: number): Promise<Idiom[]> {
    const hit = this.cache.get(chunk)
    if (hit) {
      // 更新 LRU 顺序
      this.cache.delete(chunk)
      this.cache.set(chunk, hit)
      return hit
    }
    const pending = this.pending.get(chunk)
    if (pending) return pending

    const key = `../../data/generated/details.${String(chunk).padStart(3, '0')}.json`
    const loader = chunkLoaders[key]
    if (!loader) throw new Error(`找不到详情分块：${key}`)

    const p = loader()
      .then((arr) => {
        this.cache.set(chunk, arr)
        this.evict()
        return arr
      })
      .finally(() => this.pending.delete(chunk))
    this.pending.set(chunk, p)
    return p
  }

  private evict(): void {
    while (this.cache.size > this.maxChunks) {
      const oldest = this.cache.keys().next().value
      if (oldest === undefined) break
      this.cache.delete(oldest)
    }
  }
}

/** 词典服务：索引加载、详情获取、meta 获取 */
export class DictionaryService {
  private index: IndexFile | null = null
  private indexPromise: Promise<IndexFile> | null = null
  private wordToId = new Map<string, number>()
  private meta: DictMeta | null = null
  private metaPromise: Promise<DictMeta> | null = null
  private curated: { count: number; items: Array<{ word: string; tier: number; hot: number }> } | null = null
  private chunks: ChunkCache

  constructor() {
    this.chunks = new ChunkCache()
  }

  /** 确保搜索索引已加载（幂等） */
  ensureIndex(): Promise<IndexFile> {
    if (this.index) return Promise.resolve(this.index)
    if (!this.indexPromise) {
      this.indexPromise = loadIndexFile()
        .then((idx) => {
          this.index = idx
          this.wordToId = new Map(idx.records.map((r) => [r[0], r[4]]))
          return idx
        })
        .catch((e) => {
          this.indexPromise = null
          throw e
        })
    }
    return this.indexPromise
  }

  get indexLoaded(): boolean {
    return this.index !== null
  }

  getIndex(): IndexFile | null {
    return this.index
  }

  resolveId(word: string): number | undefined {
    return this.wordToId.get(word)
  }

  /** 获取详情（按 id），LRU 缓存分块 */
  async getDetailById(id: number): Promise<Idiom> {
    const idx = await this.ensureIndex()
    const chunk = Math.floor(id / idx.chunkSize)
    const arr = await this.chunks.getChunk(chunk)
    const item = arr[id - chunk * idx.chunkSize]
    if (!item) throw new Error(`详情缺失：id=${id}`)
    return item
  }

  /** 获取详情（按成语），先查索引定位 id */
  async getDetailByWord(word: string): Promise<Idiom | undefined> {
    const idx = await this.ensureIndex()
    const id = this.wordToId.get(word)
    if (id === undefined) return undefined
    // 搜索结果中可能已带拼音，详情仍以分块数据为准
    void idx
    return this.getDetailById(id)
  }

  getMeta(): Promise<DictMeta> {
    if (this.meta) return Promise.resolve(this.meta)
    if (!this.metaPromise) {
      this.metaPromise = loadMetaFile().then((m) => (this.meta = m))
    }
    return this.metaPromise
  }

  /** 精编清单（精选成语） */
  async loadCuratedManifest(): Promise<{ count: number; items: Array<{ word: string; tier: number; hot: number }> }> {
    if (this.curated) return this.curated
    const mod = await import('../../data/generated/curated.manifest.json')
    this.curated = mod.default as { count: number; items: Array<{ word: string; tier: number; hot: number }> }
    return this.curated
  }
}

export const dictService = new DictionaryService()

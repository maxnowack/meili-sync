import MeiliSearch from 'meilisearch'
import { MongoClient, Db, Timestamp } from 'mongodb'
import pMap from 'p-map'
import pRetry from 'p-retry'
import { DbConfig, SyncData } from './interfaces'
import getAtPath from './utils/getAtPath'

export default class Sync {
  private config: DbConfig

  private syncData: SyncData

  private meili: MeiliSearch

  private mongoPromise?: Promise<Db>

  constructor(config: DbConfig, sync: SyncData) {
    this.config = config
    this.syncData = sync
    this.meili = new MeiliSearch(this.config.meili)
  }

  public async getCursor() {
    const sync = this.syncData
    const db = await this.getMongoDb()
    const collection = db.collection(sync.collectionName)
    let cursor = collection.find(sync.selector)
    if (sync.fields) {
      const fields = Object.values(sync.fields).reduce<{
        [key: string]: number,
      }>((memo, field) => {
        if (!field.mongoField) return memo
        return {
          ...memo,
          [field.mongoField]: 1,
        }
      }, {})
      cursor = cursor.project(fields)
    }
    return cursor
  }

  private getMongoDb() {
    if (!this.mongoPromise) {
      this.mongoPromise = (async () => {
        const client = new MongoClient(this.config.mongo.url, this.config.mongo.options)
        await client.connect()
        return client.db()
      })()
    }
    return this.mongoPromise
  }

  private log(...args: any) {
    const syncName = `mongo:${this.syncData.collectionName} => es:${this.syncData.indexName}`
    const time = new Date().toISOString()
    console.log(`[${time}]: ${syncName}:`, ...args)
  }

  public async indexHasDocs() {
    const index = this.meili.getIndex(this.syncData.indexName)
    const stats = await index.getStats()
    return stats.numberOfDocuments > 0
  }

  // eslint-disable-next-line class-methods-use-this
  public transformDocument(doc: { [key: string]: any }): { [key: string]: any, id: string } {
    const { fields } = this.syncData
    if (!fields) {
      const { _id: id, ...params } = doc
      return { id: id as string, ...params }
    }

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      id: doc._id,
      ...Object.keys(fields).reduce<{ [key: string]: any }>((memo, esField) => {
        const field = fields[esField]
        if (!field.mongoField) return memo
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { ...memo, [esField]: getAtPath(doc, field.mongoField) || null }
      }, {}),
    }
  }

  public async addToIndex(docs: { [key: string]: any, id: string }[]) {
    return this.meili.getIndex(this.syncData.indexName).addDocuments(docs)
  }

  public async indexExists() {
    return this.meili.getIndex(this.syncData.indexName).show()
      .then(() => true)
      .catch(() => false)
  }

  public async createIndex() {
    const { fields } = this.syncData
    if (!fields) throw new Error('Cannot create index from empty fields')
    return this.meili.createIndex(this.syncData.indexName, { primaryKey: 'id' })
  }

  public async initialSync() {
    const sync = this.syncData
    this.log('starting initial full sync')
    const cursor = await this.getCursor()
    this.log('calculating intitial data set size …')
    const docCount = await cursor.count()
    const pageSize = sync.initialSync?.batchSize || 10000
    const pageCount = Math.ceil(docCount / pageSize)
    this.log(`got ${docCount} documents total`)
    await pMap([...Array(pageCount).keys()], async (page) => {
      const cur = await pRetry(async () =>
        (await this.getCursor()).limit(pageSize).skip(page * pageSize), { retries: 10 })
      const docs = await pRetry(() => cur.toArray(), { retries: 10 })
        .then(raw => raw.map(i => this.transformDocument(i)))
      await pRetry(() => this.addToIndex(docs), { retries: 10 })
      this.log(`finished ${page} page`)
    }, { concurrency: sync.initialSync?.batchConcurrency || 1 })
    this.log('finished intitial full sync')
  }

  public async initialize() {
    const sync = this.syncData
    const db = await this.getMongoDb()
    const collection = db.collection(sync.collectionName)
    const startTime = Date.now()
    this.log('creating sync', { startTime })

    const indexExists = await this.indexExists()
    if (!indexExists && sync.fields) {
      await this.createIndex()
    }
    const doInitialSync = process.env.INITIAL_SYNC
      || parseInt(process.env.INITIAL_SYNC_BEFORE || '0', 10) >= Date.now()
      || (!indexExists || !(await this.indexHasDocs()))
    if (doInitialSync) {
      await this.initialSync()
    }

    const watchCursor = collection.watch([{
      $match: Object.keys(sync.selector).reduce<{ [key: string]: any }>((memo, field) => ({
        ...memo,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        [`fullDocument.${field}`]: sync.selector[field],
      }), {}),
    }], {
      fullDocument: 'updateLookup',
      startAtOperationTime: new Timestamp(0, Math.floor(startTime / 1000)),
    })

    watchCursor.on('change', (next) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const doc = (next as any).fullDocument as { [key: string]: any }
      this.addToIndex([this.transformDocument(doc)]).catch((err) => {
        console.error(err)
        process.exit(1)
      })
    })

    watchCursor.on('close', () => {
      this.log('Change stream was closed')
      process.exit(1)
    })

    watchCursor.on('error', (err) => {
      console.error(err)
      process.exit(1)
    })

    this.log('initialized watching')
  }
}

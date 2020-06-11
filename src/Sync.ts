import { Client as ESClient } from '@elastic/elasticsearch'
import { MongoClient, Db, Timestamp } from 'mongodb'
import get from 'lodash.get'
import pMap from 'p-map'
import { DbConfig, SyncData } from './interfaces'

export default class Sync {
  private config: DbConfig

  private syncData: SyncData

  private elastic: ESClient

  private mongoPromise?: Promise<Db>

  constructor(config: DbConfig, sync: SyncData) {
    this.config = config
    this.syncData = sync
    this.elastic = new ESClient(this.config.elastic)
  }

  public async getCursor() {
    const sync = this.syncData
    const db = await this.getMongoDb()
    const collection = db.collection(sync.collectionName)
    let cursor = collection.find(sync.selector)
    if (sync.fields) {
      const fields = Object.values(sync.fields).reduce<{
        [key: string]: number,
      }>((memo, field) => ({
        ...memo,
        [field.mongoField]: 1,
      }), {})
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
    const count = await this.elastic.count({ index: this.syncData.indexName })
    return count.body.count > 0
  }

  // eslint-disable-next-line class-methods-use-this
  public transformDocument(doc: { [key: string]: any }) {
    const { fields } = this.syncData
    if (!fields) return doc

    return Object.keys(fields).reduce<{ [key: string]: any }>((memo, esField) => {
      const field = fields[esField]
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return { ...memo, [esField]: get(doc, field.mongoField) }
    }, {})
  }

  public async addToIndex(id: string, body: { [key: string]: any }) {
    return this.elastic.index({
      index: this.syncData.indexName,
      id,
      body,
    }).catch((err) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw err.meta.body.error
    })
  }

  public async indexExists() {
    const resp = await this.elastic.indices.exists({ index: this.syncData.indexName })
    return resp.body as unknown as boolean
  }

  public async createIndex() {
    const { fields } = this.syncData
    if (!fields) throw new Error('Cannot create index from empty fields')
    return this.elastic.indices.create({
      index: this.syncData.indexName,
      body: {
        mappings: {
          properties: Object.keys(fields).reduce((memo, field) => ({
            ...memo,
            [field]: { type: fields[field].type },
          }), {}),
        },
      },
    })
  }

  public async addDoc(doc) {
    const esDoc = this.transformDocument(doc)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const id = doc._id as string
    await this.addToIndex(id, esDoc)
    this.log(`added doc ${id}`)
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
      const cur = (await this.getCursor()).limit(pageSize).skip(page * pageSize)
      const docs = await cur.toArray()
      await pMap(docs, i => this.addDoc(i), { concurrency: sync.initialSync?.concurrency || 25 })
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
    if (!indexExists || !(await this.indexHasDocs())) {
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
      this.addDoc(doc).catch((err) => {
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

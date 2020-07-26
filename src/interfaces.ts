import { MongoClientOptions, FilterQuery } from 'mongodb'
import { Config as MeiliConfig } from 'meilisearch'

export interface DbConfig {
  mongo: {
    url: string,
    options?: MongoClientOptions,
  },
  meili: MeiliConfig,
}

export interface IndexFields {
  [key: string]: {
    primaryKey?: boolean,
    mongoField?: string,
  },
}

export interface SyncData {
  indexName: string,
  collectionName: string,
  selector: FilterQuery<any>,
  fields?: IndexFields,
  initialSync?: {
    batchSize?: number,
    concurrency?: number,
    batchConcurrency?: number,
  },
}

export interface Config extends DbConfig {
  sync: SyncData[],
}

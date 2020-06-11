import { MongoClientOptions, FilterQuery } from 'mongodb'
import { ClientOptions } from '@elastic/elasticsearch'

export interface DbConfig {
  mongo: {
    url: string,
    options?: MongoClientOptions,
  },
  elastic: ClientOptions,
}

type esDataType = 'text'
  | 'keyword' | 'date' | 'long' | 'double' | 'boolean' | 'ip'
  | 'geo_point' | 'geo_shape' | 'completion' | 'object' | 'nested'

export interface IndexFields {
  [key: string]: {
    type: esDataType,
    mongoField: string,
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

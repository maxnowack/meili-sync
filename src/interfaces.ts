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
  | 'keyword' | 'date' | 'date_nanos' | 'long' | 'integer' | 'short' | 'byte'
  | 'double' | 'float' | 'half_float' | 'scaled_float' | 'boolean' | 'binary'
  | 'integer_range' | 'float_range' | 'long_range' | 'double_range' | 'date_range'
  | 'ip_range' | 'object' | 'nested' | 'geo_point' | 'geo_shape' | 'ip' | 'completion'
  | 'token_count' | 'murmur3' | 'annotated-text' | 'percolator' | 'join' | 'rank_feature'
  | 'dense_vector' | 'sparse_vector' | 'search_as_you_type' | 'alias' | 'flattened'
  | 'shape' | 'histogram' | 'constant_keyword'

export interface IndexFields {
  [key: string]: {
    type: esDataType,
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

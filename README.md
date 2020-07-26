# meili-sync
Connector to sync mongodb documents into meilisearch

## installation
````bash
  $ npm install -g meili-sync
````

## usage
````bash
  meili-sync <configFile>
````

### docker
````bash
  docker pull maxnowack/meili-sync
  docker run -v /path/to/config.yaml:/config.yaml maxnowack/meili-sync
````

## configuration
````yaml
mongo:
  url: mongodb://localhost:27017/test # mongodb connection uri
  options: # connection options (see https://mongodb.github.io/node-mongodb-native/3.6/reference/connecting/connection-settings/)
    useNewUrlParser: true
    useUnifiedTopology: true
meili: # these options are directly passed through to the meilisearch client
  host: http://localhost:7700
  apiKey: 'abc123'
sync:
- indexName: videos # name of the meilisearch index. the index will be created automatically if it doesn't exist
  collectionName: videos # name of the mongodb collection
  selector: # mongodb query for selecting the documents for syncing
    deleted: false
    disabled: false
  fields: # field mapping
    title: # name of the field in the meilisearch index
      mongoField: title # path to the value of the field in the mongodb document (uses lodash.get; see https://lodash.com/docs/4.17.15#get)
    categories:
      mongoField: categories._id # array fields are resolved to all values automatically
    duration:
      mongoField: duration
    publishDate:
      mongoField: publishDate
    rating:
      mongoField: rating
    ratings:
      mongoField: ratings
    slug:
      mongoField: slug
    tags:
      mongoField: tags
    views:
      mongoField: views
````

## license
Licensed under MIT license. Copyright (c) 2020 Max Nowack

## contributions
Contributions are welcome. Please open issues and/or file Pull Requests.

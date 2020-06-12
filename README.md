# elastic-sync
Connector to sync mongodb documents into a elasticsearch index

## installation
````bash
  $ npm install -g elastic-sync
````

## usage
````bash
  elastic-sync <configFile>
````

### docker
````bash
  docker pull maxnowack/elastic-sync
  docker run -v /path/to/config.yaml:/config.yaml maxnowack/elastic-sync
````

## configuration
````yaml
mongo:
  url: mongodb://localhost:27017/test # mongodb connection uri
  options: # connection options (see https://mongodb.github.io/node-mongodb-native/3.6/reference/connecting/connection-settings/)
    useNewUrlParser: true
    useUnifiedTopology: true
elastic: # these options are directly passed through to the elastic search client (see https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/client-configuration.html)
  node: http://localhost:9200
sync:
- indexName: videos # name of the elastic search index. the index will be created automatically with the fields below if it doesn't exist
  collectionName: videos # name of the mongodb collection
  selector: # mongodb query for selecting the documents for syncing
    deleted: false
    disabled: false
  fields: # field mapping and elasticsearch data types
    title: # name of the field in the elasticsearch index
      type: 'text' # type of the field (see https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-types.html)
      mongoField: title # path to the value of the field in the mongodb document (uses lodash.get; see https://lodash.com/docs/4.17.15#get)
    categories:
      type: 'keyword'
      mongoField: categories._id # array fields are resolved to all values automatically
    duration:
      type: 'double'
      mongoField: duration
    publishDate:
      type: 'date'
      mongoField: publishDate
    rating:
      type: 'double'
      mongoField: rating
    ratings:
      type: 'double'
      mongoField: ratings
    slug:
      type: 'keyword'
      mongoField: slug
    tags:
      type: 'text'
      mongoField: tags
    views:
      type: 'double'
      mongoField: views
````

## license
Licensed under MIT license. Copyright (c) 2020 Max Nowack

## contributions
Contributions are welcome. Please open issues and/or file Pull Requests.

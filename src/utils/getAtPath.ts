import get from 'lodash.get'

export default function getAtPath(doc: any, path: string): any {
  let value = get(doc, path) as unknown
  if (value == null) {
    const parts = path.split('.')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    value = parts.reduce<any>((memoDoc, arrayPath) => {
      const docs: any[] = []
      const resolveDoc = (item) => {
        const subDoc = get(item, arrayPath) as unknown
        if (Array.isArray(subDoc)) {
          subDoc.forEach(i => docs.push(i))
        } else {
          docs.push(subDoc)
        }
      }
      if (Array.isArray(memoDoc)) {
        memoDoc.forEach((item) => {
          resolveDoc(item)
        })
      } else {
        resolveDoc(memoDoc)
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return docs
    }, doc)
  }
  return value
}

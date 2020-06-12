import get from 'lodash.get'

export default function getArrayPaths(
  doc: Record<string, unknown>,
  path: string,
  paths: string[] = [],
): string[] {
  const parts = path.split('.')
  const lastPart = parts.pop()
  if (!lastPart || parts.length <= 0) return paths.reverse()

  const current = parts.join('.')
  paths.push(lastPart)
  if (Array.isArray(get(doc, current))) {
    paths.push(current)
  }
  return getArrayPaths(doc, current, paths)
}

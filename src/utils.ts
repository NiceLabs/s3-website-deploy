export function* chunk<T>(elements: Iterable<T>, size = 1) {
  const items = Array.from(elements)
  for (let index = 0; index < items.length; index += size) {
    yield items.slice(index, index + size)
  }
}

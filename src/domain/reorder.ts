export function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) {
    return items
  }

  const reordered = [...items]
  const [item] = reordered.splice(fromIndex, 1)
  if (item === undefined) return items
  reordered.splice(toIndex, 0, item)
  return reordered
}

export function insertItem<T>(items: T[], item: T, atIndex: number): T[] {
  const target = Math.max(0, Math.min(atIndex, items.length))
  const next = [...items]
  next.splice(target, 0, item)
  return next
}

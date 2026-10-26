import { describe, expect, it } from 'vitest'
import { moveItem } from '../src/domain/reorder'

describe('moveItem', () => {
  it('moves an item directly to the requested position', () => {
    expect(moveItem(['첫째', '둘째', '셋째', '넷째'], 3, 1)).toEqual(['첫째', '넷째', '둘째', '셋째'])
  })

  it('returns the original list for an unchanged or invalid move', () => {
    const items = ['첫째', '둘째']
    expect(moveItem(items, 0, 0)).toBe(items)
    expect(moveItem(items, 0, 4)).toBe(items)
  })
})

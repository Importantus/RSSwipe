import { useFeedStore } from '@/stores/feeds'
import { categoryState, useFeedCategoriesStore } from '@/stores/feedCategories'

/** Feeds of the selection that no fully selected category already covers */
export function looseSelection(ids: string[]): string[] {
  const covered = new Set(
    useFeedCategoriesStore()
      .withFeeds.filter((c) => categoryState(c, ids) === 'full')
      .flatMap((c) => c.feedIds)
  )
  return ids.filter((id) => !covered.has(id))
}

/** Human readable description of a selection, e.g. `Tech + Sport` or `Tech + 2 feeds` */
export function selectionLabel(ids: string[]): string {
  if (ids.length === 0) return 'All feeds'
  const feedStore = useFeedStore()
  const parts = useFeedCategoriesStore()
    .withFeeds.filter((c) => categoryState(c, ids) === 'full')
    .map((c) => c.name)
  const loose = looseSelection(ids)
  if (loose.length === 1) {
    parts.push(feedStore.feedList.find((f) => f.id === loose[0])?.title ?? '1 feed')
  } else if (loose.length > 1) {
    parts.push(`${loose.length} feeds`)
  }
  return parts.join(' + ')
}

/** Like `selectionLabel`, including hidden categories: `Tech without Politics` */
export function filterLabel(ids: string[], mutedCategoryIds: string[]): string {
  const base = ids.length === 0 ? 'all feeds' : selectionLabel(ids)
  const categories = useFeedCategoriesStore()
  const names = mutedCategoryIds.map((id) => categories.byId(id)?.name).filter((n): n is string => !!n)
  return names.length > 0 ? `${base} without ${names.join(', ')}` : base
}

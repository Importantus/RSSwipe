import { useFeedStore } from '@/stores/feeds'
import { useFeedCategoriesStore } from '@/stores/feedCategories'
import { useSnackbarStore } from '@/stores/snackbar'

/** `https://www.example.com/feed.xml` -> `example.com` */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Unfollows feeds and offers to undo it: the undo follows them again and restores their categories. */
export async function removeFeeds(ids: string[]) {
  const feedStore = useFeedStore()
  const categories = useFeedCategoriesStore()
  const snackbar = useSnackbarStore()

  const removed = feedStore.feedList
    .filter((feed) => ids.includes(feed.id))
    .map((feed) => ({
      title: feed.title,
      url: feed.url,
      openInApp: feed.openInApp,
      categoryIds: categories.ofFeed(feed.id).map((c) => c.id)
    }))

  for (const id of ids) await feedStore.deleteFeed(id)
  if (removed.length === 0) return

  snackbar.show(
    removed.length === 1 ? `Removed “${removed[0].title}”` : `Removed ${removed.length} feeds`,
    async () => {
      for (const feed of removed) {
        const again = await feedStore.addFeed(feed.url, feed.openInApp)
        if (!again) continue
        for (const categoryId of feed.categoryIds) {
          await categories.setMembership(categoryId, again.id, true)
        }
      }
    }
  )
}

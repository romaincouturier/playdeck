import { getDecks } from './actions'
import { DecksView } from '@/components/decks-view'

export default async function DecksPage() {
  const decks = await getDecks()

  return <DecksView decks={decks} />
}

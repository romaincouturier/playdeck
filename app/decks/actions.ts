'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getDecks() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: decks, error } = await supabase
    .from('decks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching decks:', error)
    return []
  }

  return decks
}

export async function createDeck(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string

  const { error } = await supabase.from('decks').insert({
    user_id: user.id,
    name,
    description: description || null,
  })

  if (error) {
    console.error('Error creating deck:', error)
    throw new Error('Erreur lors de la création du deck')
  }

  revalidatePath('/decks')
}

export async function deleteDeck(deckId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Delete all cards from storage first
  const { data: cards } = await supabase
    .from('cards')
    .select('image_url')
    .eq('deck_id', deckId)

  if (cards) {
    for (const card of cards) {
      const path = card.image_url.split('/').slice(-2).join('/')
      await supabase.storage.from('card-images').remove([path])
    }
  }

  const { error } = await supabase.from('decks').delete().eq('id', deckId)

  if (error) {
    console.error('Error deleting deck:', error)
    throw new Error('Erreur lors de la suppression du deck')
  }

  revalidatePath('/decks')
}

export async function duplicateDeck(deckId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get the original deck
  const { data: originalDeck, error: deckError } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .single()

  if (deckError || !originalDeck) {
    throw new Error('Deck non trouvé')
  }

  // Create new deck
  const { data: newDeck, error: createError } = await supabase
    .from('decks')
    .insert({
      user_id: user.id,
      name: `${originalDeck.name} (copie)`,
      description: originalDeck.description,
    })
    .select()
    .single()

  if (createError || !newDeck) {
    throw new Error('Erreur lors de la duplication du deck')
  }

  // Get all cards from original deck
  const { data: originalCards } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
    .order('position')

  // Copy cards to new deck
  if (originalCards && originalCards.length > 0) {
    const newCards = originalCards.map((card) => ({
      deck_id: newDeck.id,
      image_url: card.image_url,
      position: card.position,
    }))

    await supabase.from('cards').insert(newCards)
  }

  revalidatePath('/decks')
  return newDeck.id
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

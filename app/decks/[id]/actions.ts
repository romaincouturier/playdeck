'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getDeck(deckId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: deck, error } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .single()

  if (error || !deck) {
    redirect('/decks')
  }

  return deck
}

export async function getCards(deckId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: cards, error } = await supabase
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
    .order('position', { ascending: true })

  if (error) {
    console.error('Error fetching cards:', error)
    return []
  }

  return cards
}

export async function uploadCard(deckId: string, file: File) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  // Check deck ownership
  const { data: deck } = await supabase
    .from('decks')
    .select('id')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .single()

  if (!deck) {
    throw new Error('Deck non trouvé')
  }

  // Check card count
  const { count } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('deck_id', deckId)

  if (count !== null && count >= 500) {
    throw new Error('Le deck a atteint la limite de 500 cartes')
  }

  // Get next position
  const { data: cards } = await supabase
    .from('cards')
    .select('position')
    .eq('deck_id', deckId)
    .order('position', { ascending: false })
    .limit(1)

  const position = (cards && cards.length > 0 ? (cards[0] as { position: number }).position + 1 : 0)

  // Upload image to storage
  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/${deckId}/${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('card-images')
    .upload(fileName, file)

  if (uploadError) {
    throw new Error("Erreur lors de l'upload de l'image")
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('card-images').getPublicUrl(fileName)

  // Create card record
  const { error: insertError } = await supabase.from('cards').insert({
    deck_id: deckId,
    image_url: publicUrl,
    position,
  })

  if (insertError) {
    // Clean up uploaded file if database insert fails
    await supabase.storage.from('card-images').remove([fileName])
    throw new Error("Erreur lors de l'ajout de la carte")
  }

  revalidatePath(`/decks/${deckId}`)
}

export async function deleteCard(cardId: string, deckId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  // Get card info
  const { data: card } = await supabase
    .from('cards')
    .select('image_url')
    .eq('id', cardId)
    .single()

  if (!card) {
    throw new Error('Carte non trouvée')
  }

  // Delete from storage
  const path = card.image_url.split('/').slice(-3).join('/')
  await supabase.storage.from('card-images').remove([path])

  // Delete from database
  const { error } = await supabase.from('cards').delete().eq('id', cardId)

  if (error) {
    throw new Error('Erreur lors de la suppression de la carte')
  }

  revalidatePath(`/decks/${deckId}`)
}

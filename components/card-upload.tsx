'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { uploadCard } from '@/app/decks/[id]/actions'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

interface CardUploadProps {
  deckId: string
  cardCount: number
}

export function CardUpload({ deckId, cardCount }: CardUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileUpload = async (file: File) => {
    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image')
      return
    }

    // Vérifier la taille du fichier (10 MB max)
    const maxSize = 10 * 1024 * 1024 // 10 MB en bytes
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      alert(`L'image est trop grande (${sizeMB} MB). La taille maximale est de 10 MB.\n\nConseil : Réduisez la taille de votre image avant de l'uploader.`)
      return
    }

    // Vérifier le nombre de cartes
    if (cardCount >= 500) {
      alert('Le deck a atteint la limite de 500 cartes')
      return
    }

    setUploading(true)
    try {
      await uploadCard(deckId, file)
      router.refresh()
    } catch (error) {
      console.error(error)
      if (error instanceof Error) {
        alert(error.message)
      } else {
        alert("Erreur lors de l'ajout de la carte")
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragActive
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-2">
        <Upload className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">
            Glissez-déposez une image ici ou cliquez pour sélectionner
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            PNG, JPG, GIF jusqu&apos;à 10 MB ({cardCount}/500 cartes)
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || cardCount >= 500}
          className="mt-2"
        >
          {uploading ? 'Upload en cours...' : 'Sélectionner une image'}
        </Button>
      </div>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { uploadCard } from '@/app/decks/[id]/actions'
import { Button } from '@/components/ui/button'
import { Upload, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n/i18n-context'

interface CardUploadProps {
  deckId: string
  cardCount: number
}

interface FilePreview {
  id: string
  file: File
  previewUrl: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export function CardUpload({ deckId, cardCount }: CardUploadProps) {
  const { t } = useI18n()
  const [dragActive, setDragActive] = useState(false)
  const [previews, setPreviews] = useState<FilePreview[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Nettoyer les URLs de prévisualisation quand le composant est démonté
  useEffect(() => {
    return () => {
      previews.forEach(preview => {
        URL.revokeObjectURL(preview.previewUrl)
      })
    }
  }, [])

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return t('upload.type_error')
    }

    const maxSize = 10 * 1024 * 1024 // 10 MB
    if (file.size > maxSize) {
      return t('upload.size_error')
    }

    return null
  }

  const handleFiles = (files: FileList) => {
    const fileArray = Array.from(files)
    const availableSlots = 500 - cardCount - previews.length

    if (fileArray.length > availableSlots) {
      alert(t('upload.limit_error').replace('{{count}}', availableSlots.toString()))
      return
    }

    const newPreviews: FilePreview[] = []

    for (const file of fileArray) {
      const error = validateFile(file)
      if (error) {
        alert(`${file.name}: ${error}`)
        continue
      }

      const previewUrl = URL.createObjectURL(file)
      newPreviews.push({
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl,
        status: 'pending',
      })
    }

    if (newPreviews.length > 0) {
      setPreviews(prev => [...prev, ...newPreviews])
      // Démarrer l'upload automatiquement
      uploadFiles(newPreviews)
    }
  }

  const uploadFiles = async (filesToUpload: FilePreview[]) => {
    for (const preview of filesToUpload) {
      // Mettre à jour le statut à "uploading"
      setPreviews(prev => prev.map(p =>
        p.id === preview.id ? { ...p, status: 'uploading' } : p
      ))

      try {
        await uploadCard(deckId, preview.file)

        // Mettre à jour le statut à "success"
        setPreviews(prev => prev.map(p =>
          p.id === preview.id ? { ...p, status: 'success' } : p
        ))
      } catch (error) {
        // Mettre à jour le statut à "error"
        const errorMessage = error instanceof Error ? error.message : t('login.error_occurred')
        setPreviews(prev => prev.map(p =>
          p.id === preview.id ? { ...p, status: 'error', error: errorMessage } : p
        ))
      }
    }

    // Rafraîchir après tous les uploads
    router.refresh()

    // Nettoyer les succès après 2 secondes
    setTimeout(() => {
      setPreviews(prev => {
        const toClean = prev.filter(p => p.status === 'success')
        toClean.forEach(p => URL.revokeObjectURL(p.previewUrl))
        return prev.filter(p => p.status !== 'success')
      })
    }, 2000)
  }

  const removePreview = (id: string) => {
    setPreviews(prev => {
      const preview = prev.find(p => p.id === id)
      if (preview) {
        URL.revokeObjectURL(preview.previewUrl)
      }
      return prev.filter(p => p.id !== id)
    })
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      // Réinitialiser l'input pour permettre de sélectionner les mêmes fichiers
      e.target.value = ''
    }
  }

  const uploadingCount = previews.filter(p => p.status === 'uploading').length
  const hasUploading = uploadingCount > 0

  return (
    <div className="space-y-4">
      {/* Zone d'upload */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
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
          multiple
          onChange={handleChange}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {t('upload.drag_drop')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('upload.format_hint')} ({cardCount + previews.length}/500 {t('upload.cards_in_deck').toLowerCase()})
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={hasUploading || cardCount + previews.length >= 500}
            className="mt-2"
          >
            {hasUploading ? `${t('upload.uploading')} (${uploadingCount})...` : t('upload.select_button')}
          </Button>
        </div>
      </div>

      {/* Prévisualisations */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {previews.map((preview) => (
            <div
              key={preview.id}
              className="relative aspect-[2/3] rounded-lg overflow-hidden border-2 bg-card shadow-sm"
            >
              <Image
                src={preview.previewUrl}
                alt={preview.file.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              />

              {/* Overlay de statut */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-between p-2">
                {/* Bouton supprimer (seulement si pas en cours d'upload) */}
                {preview.status !== 'uploading' && preview.status !== 'success' && (
                  <button
                    onClick={() => removePreview(preview.id)}
                    className="self-end p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {/* Indicateur de statut */}
                <div className="flex items-center gap-2 text-white text-xs">
                  {preview.status === 'pending' && (
                    <span className="truncate">{preview.file.name}</span>
                  )}
                  {preview.status === 'uploading' && (
                    <>
                      <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                      <span>{t('upload.uploading').split('...')[0]}...</span>
                    </>
                  )}
                  {preview.status === 'success' && (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-500">{t('upload.added')}</span>
                    </>
                  )}
                  {preview.status === 'error' && (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-500 truncate">{preview.error}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

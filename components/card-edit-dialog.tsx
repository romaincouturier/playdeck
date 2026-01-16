'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { updateCard } from '@/app/decks/[id]/actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CardImage } from '@/components/card-image'
import { Pencil, Upload } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/lib/i18n/i18n-context'

interface CardEditDialogProps {
  card: {
    id: string
    deck_id: string
    image_url: string
    position: number
  }
}

export function CardEditDialog({ card }: CardEditDialogProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      alert(t('edit_card.select_error'))
      return
    }

    setUploading(true)
    try {
      await updateCard(card.id, card.deck_id, selectedFile)
      setOpen(false)
      setPreview(null)
      setSelectedFile(null)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : t('edit_card.error'))
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setPreview(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) {
        resetForm()
      }
    }}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('edit_card.title')}</DialogTitle>
          <DialogDescription>
            {t('edit_card.desc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('edit_card.current')}</Label>
            <div className="w-full max-w-[200px] mx-auto aspect-[2/3] rounded-lg overflow-hidden border">
              <CardImage
                src={card.image_url}
                alt={`Carte ${card.position + 1}`}
                position={card.position}
              />
            </div>
          </div>

          {preview && (
            <div className="space-y-2">
              <Label>{t('edit_card.new')}</Label>
              <div className="w-full max-w-[200px] mx-auto aspect-[2/3] rounded-lg overflow-hidden border">
                <img src={preview} alt="Aperçu" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="card-image">
              {preview ? t('edit_card.change') : t('edit_card.select')}
            </Label>
            <Input
              ref={fileInputRef}
              id="card-image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={uploading}
            >
              {t('edit_card.cancel')}
            </Button>
            <Button type="submit" disabled={uploading || !selectedFile}>
              {uploading ? t('edit_card.submitting') : t('edit_card.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

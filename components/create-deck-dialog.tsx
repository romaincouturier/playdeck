'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDeck } from '@/app/decks/actions'
import { useI18n } from '@/lib/i18n/i18n-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'

export function CreateDeckDialog() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      await createDeck(formData)
      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert(t('decks.create_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus className="mr-2 h-5 w-5" />
          {t('decks.create_new')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('decks.create_dialog_title')}</DialogTitle>
            <DialogDescription>
              {t('decks.create_dialog_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t('decks.name_label')}</Label>
              <Input
                id="name"
                name="name"
                placeholder={t('decks.name_placeholder')}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t('decks.desc_label')}</Label>
              <Textarea
                id="description"
                name="description"
                placeholder={t('decks.desc_placeholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? t('decks.creating') : t('decks.create_button')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

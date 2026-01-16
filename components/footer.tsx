import { useI18n } from "@/lib/i18n/i18n-context";

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="border-t border-st-gray dark:border-st-anthracite/50 mt-auto">
      <div className="container mx-auto px-4 py-4 text-center">
        <p className="text-sm text-muted-foreground">
          © SuperTilt 2026 - {t('common.all_rights_reserved')}
        </p>
      </div>
    </footer>
  )
}

import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ResetButton() {
  const {t} = useTranslation()
  return (
    <Button variant='destructive' onClick={() => {
      window.location.reload()
    }}>
      <RotateCcw />
      {t('documents.reset_btn')}
    </Button>
  )
}
import { useLocale } from '../hooks/useLocale'
import { InfoTip } from './InfoTip'

export function ParcelsInfo() {
  const { t } = useLocale()
  return (
    <InfoTip label={t('common.parcels')} align="end">
      {t('parcels.info')}
    </InfoTip>
  )
}

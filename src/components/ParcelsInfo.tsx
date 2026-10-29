import { InfoTip } from './InfoTip'

export function ParcelsInfo() {
  return (
    <InfoTip label="Parcels" align="end">
      Splits the credit amount into N monthly installments. Applies only when Credit is above 0 and N is 2 or more.
    </InfoTip>
  )
}

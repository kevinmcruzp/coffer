import { useMemo } from 'react'
import { useYearSummary } from '../hooks/useYearSummary'
import type { MonthRow, YearTotals } from '../hooks/useYearSummary'
import { useSession } from '../hooks/useSession'
import { useLocale } from '../hooks/useLocale'
import { monthIndex, monthKeyOf } from '../lib/months'
import { round2 } from '../lib/math'
import { AnnualChart } from './AnnualChart'
import { StatCard } from './StatCard'
import { InfoTip } from './InfoTip'

// ── Formatting ────────────────────────────────────────────────────────────────

// Table cells: no symbol (the column header carries the currency), dash for zero
// so the eye lands only on months that actually moved.
function cell(value: number, locale: string): string {
  if (value === 0) return '—'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Chart labels and tooltips: whole units, explicit sign.
function short(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    signDisplay: 'exceptZero',
  }).format(value)
}

// ── Data shaping ──────────────────────────────────────────────────────────────

// A month that was visited but never filled in is stored too; it should not read as data.
function hasData(row: MonthRow): boolean {
  return row.income !== 0 || row.debit !== 0 || row.credit !== 0 || row.saving !== 0 || row.adjustment !== 0
}

type Slot = { index: number; row: MonthRow | null }

// ── Cells ─────────────────────────────────────────────────────────────────────

function BalanceCell({ value }: { value: number }) {
  const { locale } = useLocale()
  const color = value > 0 ? 'text-pos' : value < 0 ? 'text-neg' : 'text-dim'
  return <span className={color}>{cell(value, locale)}</span>
}

function TrendCell({ current, prev }: { current: number; prev: number }) {
  const { locale } = useLocale()
  const delta = round2(current - prev)
  if (delta === 0) return <span className="text-faint">—</span>
  const up = delta > 0
  return (
    <span className={up ? 'text-pos' : 'text-neg'}>
      {up ? '↑' : '↓'} {cell(Math.abs(delta), locale)}
    </span>
  )
}

const TH = 'px-3 py-2 text-right font-normal'
const TD = 'px-3 py-2 text-right'

// ── Rows ──────────────────────────────────────────────────────────────────────

type RowProps = {
  slot: Slot
  isCurrent: boolean
  showPrev: boolean
  onSelect: (index: number) => void
}

function DataRow({ slot, isCurrent, showPrev, onSelect }: RowProps) {
  const { index, row } = slot
  const { t, locale, monthName, monthAbbr } = useLocale()
  const filled = row !== null && hasData(row)
  // Empty months keep every cell so the responsive column classes stay aligned
  // with the filled rows — a colSpan would drift as columns drop out.
  const amount = (value: number) => filled ? cell(value, locale) : '—'
  const tone = filled ? 'text-dim' : 'text-faint'

  return (
    <tr
      onClick={filled ? () => onSelect(index) : undefined}
      className={`border-b border-line-soft transition-colors ${
        filled ? 'cursor-pointer hover:bg-panel' : ''
      } ${isCurrent ? 'bg-brass-soft' : ''}`}
    >
      <td className="px-3 py-2">
        {filled ? (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onSelect(index) }}
            aria-label={t('annual.openMonth', { month: monthName(index) })}
            // The entry count no longer earns a column, but it still says how
            // much of the month is actually recorded.
            title={row.items === 1
              ? t('annual.entryOne', { month: monthName(index) })
              : t('annual.entryMany', { month: monthName(index), count: row.items })}
            className="font-medium text-fg hover:text-brass transition-colors"
          >
            {monthAbbr(index)}
          </button>
        ) : (
          <span className="text-faint">{monthAbbr(index)}</span>
        )}
      </td>
      <td className={`${TD} ${tone}`}>{amount(row?.income ?? 0)}</td>
      <td className={`${TD} ${tone} sm:hidden`}>
        {amount(round2((row?.debit ?? 0) + (row?.credit ?? 0)))}
      </td>
      <td className={`${TD} ${tone} hidden sm:table-cell`}>{amount(row?.debit ?? 0)}</td>
      <td className={`${TD} ${tone} hidden sm:table-cell`}>{amount(row?.credit ?? 0)}</td>
      <td className={`${TD} ${tone} hidden md:table-cell`}>{amount(row?.saving ?? 0)}</td>
      <td className={`${TD} ${tone} hidden md:table-cell`}>{amount(row?.adjustment ?? 0)}</td>
      <td className={`${TD} font-semibold`}>
        {filled ? <BalanceCell value={row.balance} /> : <span className="text-faint">—</span>}
      </td>
      {showPrev && (
        <td className={`${TD} hidden lg:table-cell`}>
          {filled && row.prevBalance !== null
            ? <TrendCell current={row.balance} prev={row.prevBalance} />
            : <span className="text-faint">—</span>}
        </td>
      )}
    </tr>
  )
}

function TotalsRow({ totals, showPrev }: { totals: YearTotals; showPrev: boolean }) {
  const { debit, credit } = totals
  const { t, locale } = useLocale()
  const fmt = (value: number) => cell(value, locale)

  return (
    <tr className="border-t-2 border-line bg-panel">
      <td className="px-3 py-2 text-xs font-semibold text-faint uppercase tracking-wider">{t('common.total')}</td>
      <td className={`${TD} font-semibold text-fg`}>{fmt(totals.income)}</td>
      <td className={`${TD} font-semibold text-fg sm:hidden`}>{fmt(round2(debit + credit))}</td>
      <td className={`${TD} font-semibold text-fg hidden sm:table-cell`}>{fmt(debit)}</td>
      <td className={`${TD} font-semibold text-fg hidden sm:table-cell`}>{fmt(credit)}</td>
      <td className={`${TD} font-semibold text-dim hidden md:table-cell`}>{fmt(totals.saving)}</td>
      <td className={`${TD} font-semibold text-dim hidden md:table-cell`}>{fmt(totals.adjustment)}</td>
      <td className={`${TD} font-semibold`}>
        <BalanceCell value={totals.balance} />
      </td>
      {showPrev && <td className="hidden lg:table-cell" />}
    </tr>
  )
}

// ── View ──────────────────────────────────────────────────────────────────────

type Props = {
  year: number
  onSelectMonth: (key: string) => void
}

export function AnnualView({ year, onSelectMonth }: Props) {
  const { rows, totals, loading, error, failedMonths } = useYearSummary(year)
  const { currency } = useSession()
  const { t, locale, money, shortMonthLabel } = useLocale()

  const slots = useMemo<Slot[]>(() => {
    const byIndex = new Map(rows.map(r => [monthIndex(r.monthKey), r]))
    return Array.from({ length: 12 }, (_, i) => ({ index: i, row: byIndex.get(i) ?? null }))
  }, [rows])

  const filledCount = slots.filter(s => s.row !== null && hasData(s.row)).length
  // Only worth a column when the prior year actually holds figures.
  const showPrev = rows.some(r => r.prevBalance !== null && r.prevBalance !== 0)
  // A single column is not a chart — the stat tiles already say it.
  const showChart = filledCount > 1
  const now = new Date()

  const spent = round2(totals.debit + totals.credit)
  const net = totals.balance
  const perMonth = (value: number) =>
    filledCount > 0 ? t('annual.average', { amount: money(round2(value / filledCount), currency) }) : undefined

  function selectMonth(index: number) {
    onSelectMonth(monthKeyOf(year, index))
  }

  if (loading) return <div className="text-dim text-sm text-center py-12">{t('common.loading')}</div>
  if (error) return <div className="text-neg text-sm text-center py-8">{t(error)}</div>

  if (rows.length === 0) {
    return <p className="text-faint text-sm text-center py-12">{t('annual.noData', { year })}</p>
  }

  return (
    <div className="space-y-6">
      {failedMonths.length > 0 && (
        <div className="text-brass text-xs px-1">
          {t('annual.failedMonths', { months: failedMonths.map(shortMonthLabel).join(', ') })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('summary.income')} value={money(totals.income, currency)} sub={perMonth(totals.income)} />
        <StatCard label={t('annual.spent')} value={money(spent, currency)} sub={perMonth(spent)} info={t('annual.spentInfo')} />
        <StatCard label={t('annual.saved')} value={money(totals.saving, currency)} sub={perMonth(totals.saving)} />
        <StatCard
          label={t('annual.net')}
          info={t('annual.netInfo')}
          value={money(net, currency, true)}
          sub={t('annual.monthsFilled', { count: filledCount })}
          highlight={net > 0 ? 'positive' : net < 0 ? 'negative' : 'neutral'}
        />
      </div>

      {showChart && (
        <AnnualChart
          columns={slots.map(s => ({
            index: s.index,
            value: s.row !== null && hasData(s.row) ? s.row.balance : null,
          }))}
          format={value => short(value, locale)}
          onSelect={selectMonth}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">{t('annual.caption', { year, currency })}</caption>
          <thead>
            <tr className="text-faint text-xs uppercase tracking-wider border-b border-line">
              <th className="px-3 py-2 text-left font-normal">{t('annual.month')}</th>
              <th className={TH}>{t('summary.income')}</th>
              <th className={`${TH} sm:hidden`}>{t('annual.out')}</th>
              <th className={`${TH} hidden sm:table-cell`}>{t('payment.debit')}</th>
              <th className={`${TH} hidden sm:table-cell`}>{t('payment.credit')}</th>
              <th className={`${TH} hidden md:table-cell`}>{t('annual.saved')}</th>
              <th className={`${TH} hidden md:table-cell`}>{t('summary.adjustment')}</th>
              <th className={TH}>{t('annual.balanceIn', { currency })}</th>
              {showPrev && (
                <th className={`${TH} hidden lg:table-cell`}>
                  <span className="inline-flex items-center gap-1.5">
                    {t('annual.vsPrevious')}
                    <InfoTip label={t('annual.vsPrevious')} align="end">{t('annual.vsPreviousInfo')}</InfoTip>
                  </span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {slots.map(slot => (
              <DataRow
                key={slot.index}
                slot={slot}
                isCurrent={year === now.getFullYear() && slot.index === now.getMonth()}
                showPrev={showPrev}
                onSelect={selectMonth}
              />
            ))}
          </tbody>
          <tfoot>
            <TotalsRow totals={totals} showPrev={showPrev} />
          </tfoot>
        </table>
        <p className="text-xs text-faint mt-2 text-right">{t('annual.openHint')}</p>
      </div>
    </div>
  )
}

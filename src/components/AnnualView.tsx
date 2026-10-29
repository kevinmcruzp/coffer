import { useMemo, useState } from 'react'
import { useYearSummary } from '../hooks/useYearSummary'
import type { MonthRow, YearTotals } from '../hooks/useYearSummary'
import { MONTH_ABBR, MONTH_NAMES, monthIndex, monthKeyOf } from '../lib/months'
import { round2 } from '../lib/math'
import { CURRENCIES } from '../types'
import type { Currency } from '../types'
import { AnnualChart } from './AnnualChart'
import { StatCard } from './StatCard'
import { InfoTip } from './InfoTip'

// ── Formatting ────────────────────────────────────────────────────────────────

function money(value: number, currency: Currency, signed = false): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(value)
}

// Table cells: no symbol (the column header carries the currency), dash for zero
// so the eye lands only on months that actually moved.
function cell(value: number): string {
  if (value === 0) return '—'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Chart labels and tooltips: whole units, explicit sign.
function short(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0,
    signDisplay: 'exceptZero',
  }).format(value)
}

// ── Data shaping ──────────────────────────────────────────────────────────────

// Saving and adjustment are entered without a currency selector, so they only
// ever apply to BRL (see computeBalance in useYearSummary).
function hasData(row: MonthRow, currency: Currency): boolean {
  if (row.income[currency] !== 0 || row.debit[currency] !== 0 || row.credit[currency] !== 0) return true
  return currency === 'BRL' && (row.saving !== 0 || row.adjustment !== 0)
}

type Slot = { index: number; row: MonthRow | null }

// ── Cells ─────────────────────────────────────────────────────────────────────

function BalanceCell({ value }: { value: number }) {
  const color = value > 0 ? 'text-pos' : value < 0 ? 'text-neg' : 'text-dim'
  return <span className={color}>{cell(value)}</span>
}

function TrendCell({ current, prev }: { current: number; prev: number }) {
  const delta = round2(current - prev)
  if (delta === 0) return <span className="text-faint">—</span>
  const up = delta > 0
  return (
    <span className={up ? 'text-pos' : 'text-neg'}>
      {up ? '↑' : '↓'} {cell(Math.abs(delta))}
    </span>
  )
}

const TH = 'px-3 py-2 text-right font-normal'
const TD = 'px-3 py-2 text-right'

// ── Rows ──────────────────────────────────────────────────────────────────────

type RowProps = {
  slot: Slot
  currency: Currency
  isCurrent: boolean
  showSavings: boolean
  showPrev: boolean
  onSelect: (index: number) => void
}

function DataRow({ slot, currency, isCurrent, showSavings, showPrev, onSelect }: RowProps) {
  const { index, row } = slot
  const filled = row !== null && hasData(row, currency)
  // Empty months keep every cell so the responsive column classes stay aligned
  // with the filled rows — a colSpan would drift as columns drop out.
  const amount = (value: number) => filled ? cell(value) : '—'
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
            aria-label={`Open ${MONTH_NAMES[index]}`}
            // The entry count no longer earns a column, but it still says how
            // much of the month is actually recorded.
            title={`${MONTH_NAMES[index]} · ${row.items} ${row.items === 1 ? 'entry' : 'entries'}`}
            className="font-medium text-fg hover:text-brass transition-colors"
          >
            {MONTH_ABBR[index]}
          </button>
        ) : (
          <span className="text-faint">{MONTH_ABBR[index]}</span>
        )}
      </td>
      <td className={`${TD} ${tone}`}>{amount(row?.income[currency] ?? 0)}</td>
      <td className={`${TD} ${tone} sm:hidden`}>
        {amount(round2((row?.debit[currency] ?? 0) + (row?.credit[currency] ?? 0)))}
      </td>
      <td className={`${TD} ${tone} hidden sm:table-cell`}>{amount(row?.debit[currency] ?? 0)}</td>
      <td className={`${TD} ${tone} hidden sm:table-cell`}>{amount(row?.credit[currency] ?? 0)}</td>
      {showSavings && (
        <>
          <td className={`${TD} ${tone} hidden md:table-cell`}>{amount(row?.saving ?? 0)}</td>
          <td className={`${TD} ${tone} hidden md:table-cell`}>{amount(row?.adjustment ?? 0)}</td>
        </>
      )}
      <td className={`${TD} font-semibold`}>
        {filled ? <BalanceCell value={row.balance[currency]} /> : <span className="text-faint">—</span>}
      </td>
      {showPrev && (
        <td className={`${TD} hidden lg:table-cell`}>
          {filled && row.prevBalance !== null
            ? <TrendCell current={row.balance[currency]} prev={row.prevBalance[currency]} />
            : <span className="text-faint">—</span>}
        </td>
      )}
    </tr>
  )
}

function TotalsRow({ totals, currency, showSavings, showPrev }: {
  totals: YearTotals
  currency: Currency
  showSavings: boolean
  showPrev: boolean
}) {
  const debit = totals.debit[currency]
  const credit = totals.credit[currency]

  return (
    <tr className="border-t-2 border-line bg-panel">
      <td className="px-3 py-2 text-xs font-semibold text-faint uppercase tracking-wider">Total</td>
      <td className={`${TD} font-semibold text-fg`}>{cell(totals.income[currency])}</td>
      <td className={`${TD} font-semibold text-fg sm:hidden`}>{cell(round2(debit + credit))}</td>
      <td className={`${TD} font-semibold text-fg hidden sm:table-cell`}>{cell(debit)}</td>
      <td className={`${TD} font-semibold text-fg hidden sm:table-cell`}>{cell(credit)}</td>
      {showSavings && (
        <>
          <td className={`${TD} font-semibold text-dim hidden md:table-cell`}>{cell(totals.saving)}</td>
          <td className={`${TD} font-semibold text-dim hidden md:table-cell`}>{cell(totals.adjustment)}</td>
        </>
      )}
      <td className={`${TD} font-semibold`}>
        <BalanceCell value={totals.balance[currency]} />
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
  const { rows, totals, loading, error, warning } = useYearSummary(year)
  const [picked, setPicked] = useState<Currency>('BRL')

  const activeCurrencies = CURRENCIES.filter(c => rows.some(r => hasData(r, c)))
  // The picked currency can go stale when the year changes; fall back rather
  // than render a column of zeroes.
  const currency = activeCurrencies.includes(picked) ? picked : (activeCurrencies[0] ?? 'BRL')

  const slots = useMemo<Slot[]>(() => {
    const byIndex = new Map(rows.map(r => [monthIndex(r.monthKey), r]))
    return Array.from({ length: 12 }, (_, i) => ({ index: i, row: byIndex.get(i) ?? null }))
  }, [rows])

  const filledCount = slots.filter(s => s.row !== null && hasData(s.row, currency)).length
  const showSavings = currency === 'BRL'
  // Only worth a column when the prior year actually holds figures in this currency.
  const showPrev = rows.some(r => r.prevBalance !== null && r.prevBalance[currency] !== 0)
  // A single column is not a chart — the stat tiles already say it.
  const showChart = filledCount > 1
  const now = new Date()

  const spent = round2(totals.debit[currency] + totals.credit[currency])
  const net = totals.balance[currency]
  const perMonth = (value: number) => filledCount > 0 ? `avg ${money(round2(value / filledCount), currency)}/mo` : undefined

  function selectMonth(index: number) {
    onSelectMonth(monthKeyOf(year, index))
  }

  if (loading) return <div className="text-dim text-sm text-center py-12">Loading…</div>
  if (error) return <div className="text-neg text-sm text-center py-8">{error}</div>

  if (rows.length === 0) {
    return <p className="text-faint text-sm text-center py-12">No data for {year}.</p>
  }

  return (
    <div className="space-y-6">
      {warning && <div className="text-brass text-xs px-1">{warning}</div>}

      {activeCurrencies.length > 1 && (
        <div role="group" aria-label="Currency" className="inline-flex gap-1 p-1 rounded-lg border border-line bg-panel">
          {activeCurrencies.map(c => (
            <button
              key={c}
              onClick={() => setPicked(c)}
              aria-pressed={c === currency}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                c === currency ? 'bg-brass text-ink' : 'text-dim hover:text-fg hover:bg-panel-2'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Income" value={money(totals.income[currency], currency)} sub={perMonth(totals.income[currency])} />
        <StatCard label="Spent" value={money(spent, currency)} sub={perMonth(spent)} info="Debit + Credit for the year." />
        {showSavings && (
          <StatCard label="Saved" value={money(totals.saving, 'BRL')} sub={perMonth(totals.saving)} />
        )}
        <StatCard
          label="Net"
          info="The year's total balance: Income − Spent. In BRL, Saving is also subtracted and Adjustment added."
          value={money(net, currency, true)}
          sub={`${filledCount} of 12 months`}
          highlight={net > 0 ? 'positive' : net < 0 ? 'negative' : 'neutral'}
        />
      </div>

      {showChart && (
        <AnnualChart
          columns={slots.map(s => ({
            index: s.index,
            value: s.row !== null && hasData(s.row, currency) ? s.row.balance[currency] : null,
          }))}
          format={short}
          onSelect={selectMonth}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">Monthly ledger for {year}, amounts in {currency}</caption>
          <thead>
            <tr className="text-faint text-xs uppercase tracking-wider border-b border-line">
              <th className="px-3 py-2 text-left font-normal">Month</th>
              <th className={TH}>Income</th>
              <th className={`${TH} sm:hidden`}>Out</th>
              <th className={`${TH} hidden sm:table-cell`}>Debit</th>
              <th className={`${TH} hidden sm:table-cell`}>Credit</th>
              {showSavings && (
                <>
                  <th className={`${TH} hidden md:table-cell`}>Saved</th>
                  <th className={`${TH} hidden md:table-cell`}>Adjustment</th>
                </>
              )}
              <th className={TH}>Balance {currency}</th>
              {showPrev && (
                <th className={`${TH} hidden lg:table-cell`}>
                  <span className="inline-flex items-center gap-1.5">
                    vs prev yr
                    <InfoTip label="vs prev yr" align="end">Change in balance against the same month one year earlier.</InfoTip>
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
                currency={currency}
                isCurrent={year === now.getFullYear() && slot.index === now.getMonth()}
                showSavings={showSavings}
                showPrev={showPrev}
                onSelect={selectMonth}
              />
            ))}
          </tbody>
          <tfoot>
            <TotalsRow totals={totals} currency={currency} showSavings={showSavings} showPrev={showPrev} />
          </tfoot>
        </table>
        <p className="text-xs text-faint mt-2 text-right">click a month to open it</p>
      </div>
    </div>
  )
}

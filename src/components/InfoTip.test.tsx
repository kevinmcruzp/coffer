import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InfoTip } from './InfoTip'
import { StatCard } from './StatCard'

describe('InfoTip', () => {
  it('hides the explanation until the trigger is clicked', () => {
    render(<InfoTip label="Budget">Spending ceiling.</InfoTip>)
    expect(screen.queryByText('Spending ceiling.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'About Budget' }))
    expect(screen.getByRole('dialog', { name: 'About Budget' })).toHaveTextContent('Spending ceiling.')
  })

  it('closes on Escape', () => {
    render(<InfoTip label="Budget">Spending ceiling.</InfoTip>)
    fireEvent.click(screen.getByRole('button', { name: 'About Budget' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('StatCard info', () => {
  it('renders no InfoTip without info', () => {
    render(<StatCard label="Income" value="R$ 1,00" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders an InfoTip named after the label when info is given', () => {
    render(<StatCard label="Balance" value="R$ 1,00" info="Income minus spending." />)
    fireEvent.click(screen.getByRole('button', { name: 'About Balance' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Income minus spending.')
  })
})

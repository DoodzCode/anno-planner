import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Palette from '../../components/Palette'

beforeEach(() => {
  localStorage.clear()
})

describe('Palette — collapsible categories', () => {
  it('renders category headers as expanded buttons by default', () => {
    render(<Palette leftWidth={420} />)
    // Category headers have title="Collapse X" when expanded
    const headers = screen.getAllByTitle(/^Collapse /i)
    expect(headers.length).toBeGreaterThan(0)
    headers.forEach(h => expect(h).toHaveAttribute('aria-expanded', 'true'))
  })

  it('collapses a category and hides its items when the header is clicked', () => {
    render(<Palette leftWidth={420} />)

    const [firstHeader] = screen.getAllByTitle(/^Collapse /i)
    const group = firstHeader.closest('.palette-group')!
    expect(group.querySelector('.palette-group-items')).toBeInTheDocument()

    fireEvent.click(firstHeader)

    expect(firstHeader).toHaveAttribute('aria-expanded', 'false')
    expect(group.querySelector('.palette-group-items')).not.toBeInTheDocument()
  })

  it('persists collapsed state to localStorage', () => {
    render(<Palette leftWidth={420} />)
    const [firstHeader] = screen.getAllByTitle(/^Collapse /i)
    fireEvent.click(firstHeader)

    const stored = JSON.parse(localStorage.getItem('anno-planner-collapsed-categories') ?? '{}')
    expect(Object.values(stored).some(v => v === true)).toBe(true)
  })

  it('expands collapsed categories while a search query is active', () => {
    const allCollapsed: Record<string, boolean> = {
      residence: true, production: true, public_service: true, infrastructure: true,
    }
    localStorage.setItem('anno-planner-collapsed-categories', JSON.stringify(allCollapsed))

    render(<Palette leftWidth={420} />)

    // Verify at least one is collapsed before searching
    expect(screen.queryAllByTitle(/^Expand /i).length).toBeGreaterThan(0)

    // Type a query — search forces all matched categories to expand
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'residence' } })

    // The matched category should now be expanded (title switches to "Collapse X")
    expect(screen.queryAllByTitle(/^Collapse /i).length).toBeGreaterThan(0)
  })
})

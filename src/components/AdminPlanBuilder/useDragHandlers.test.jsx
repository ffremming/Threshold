import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDragHandlers } from './useDragHandlers'

function setup(extra = {}) {
  const spies = {
    onAddTemplateToDay: vi.fn(),
    onAddTemplateToDayAcross: vi.fn(),
    onMoveWorkoutByDrag: vi.fn(),
    onMoveWorkoutAcross: vi.fn(),
    onMoveMany: vi.fn(),
    onDeleteWorkout: vi.fn(),
  }
  const { result } = renderHook(() => useDragHandlers({
    currentWeek: 20, currentYear: 2026, workouts: [], overviewWorkouts: [], ...spies, ...extra,
  }))
  return { result, spies }
}

describe('useDragHandlers week/year routing', () => {
  it('week-view drop (no week/year) uses the single-week move handler', async () => {
    const { result, spies } = setup()
    act(() => result.current.handleWorkoutDragStart({ id: 'w1', week: 20, year: 2026, weekday: 2 }))
    await act(async () => { await result.current.handleDrop(3) }) // weekday only
    expect(spies.onMoveWorkoutByDrag).toHaveBeenCalledWith('w1', 3, null)
    expect(spies.onMoveWorkoutAcross).not.toHaveBeenCalled()
  })

  it('month-view drop (with week/year) uses the cross-week move handler', async () => {
    const { result, spies } = setup()
    act(() => result.current.handleWorkoutDragStart({ id: 'w1', week: 20, year: 2026, weekday: 2 }))
    await act(async () => { await result.current.handleDrop(4, null, 23, 2026) })
    expect(spies.onMoveWorkoutAcross).toHaveBeenCalledWith('w1', 23, 2026, 4, null)
    expect(spies.onMoveWorkoutByDrag).not.toHaveBeenCalled()
  })

  it('template drop with week/year uses the cross-week add handler', async () => {
    const { result, spies } = setup()
    const template = { id: 't1', title: 'Intervals' }
    act(() => result.current.handleTemplateDragStart(template))
    await act(async () => { await result.current.handleDrop(1, null, 21, 2026) })
    expect(spies.onAddTemplateToDayAcross).toHaveBeenCalledWith(template, 21, 2026, 1, null)
    expect(spies.onAddTemplateToDay).not.toHaveBeenCalled()
  })
})

describe('useDragHandlers whole-day drag', () => {
  const DAY = [
    { id: 'a', week: 21, year: 2026, weekday: 1 },
    { id: 'b', week: 21, year: 2026, weekday: 1 },
    { id: 'c', week: 21, year: 2026, weekday: 3 }, // different day, untouched
  ]

  it('moves every session of the source day to the dropped-on day', async () => {
    const { result, spies } = setup({ overviewWorkouts: DAY })
    act(() => result.current.handleDayDragStart(21, 2026, 1))
    await act(async () => { await result.current.handleDrop(4, null, 23, 2026) })
    expect(spies.onMoveMany).toHaveBeenCalledTimes(1)
    expect(spies.onMoveMany.mock.calls[0][0]).toEqual([
      { id: 'a', week: 23, year: 2026, weekday: 4 },
      { id: 'b', week: 23, year: 2026, weekday: 4 },
    ])
  })

  it('is a no-op when the day is dropped on itself', async () => {
    const { result, spies } = setup({ overviewWorkouts: DAY })
    act(() => result.current.handleDayDragStart(21, 2026, 1))
    await act(async () => { await result.current.handleDrop(1, null, 21, 2026) })
    expect(spies.onMoveMany).not.toHaveBeenCalled()
  })

  it('does not start a day drag for an empty day', () => {
    const { result } = setup({ overviewWorkouts: DAY })
    const event = { preventDefault: vi.fn(), dataTransfer: { setData: vi.fn() } }
    act(() => result.current.handleDayDragStart(22, 2026, 5, event))
    expect(event.preventDefault).toHaveBeenCalled()
  })
})

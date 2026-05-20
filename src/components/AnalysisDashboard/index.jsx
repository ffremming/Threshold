import { useMemo } from 'react'
import { EmptyState, Page, PageHeader } from '../ui'
import './charts/registry'
import './analysis.css'
import { METRIC_OPTIONS } from './constants'
import { computeAnalysis } from './aggregations'
import { useAnalysisWindow, usePersistedFilters } from './hooks'
import { getWeekLabel } from './utils'
import AnalysisToolbar from './filters/Toolbar'
import WindowControls from './filters/WindowControls'
import SummaryRow from './sections/SummaryRow'
import InsightGrid from './sections/InsightGrid'
import ChartGrid from './sections/ChartGrid'
import BottomGrid from './sections/BottomGrid'

export default function AnalysisDashboard({ weeks, workoutsByWeekKey, athleteName, currentWeek, currentYear }) {
  const { range, setRange, activeTagFilter, setActiveTagFilter, primaryMetric, setPrimaryMetric } = usePersistedFilters()
  const { currentIndex, windowStart, setWindowStart, maxWindowStart, visibleWeeks } =
    useAnalysisWindow(weeks, currentWeek, currentYear, range)

  const analysis = useMemo(
    () => computeAnalysis(visibleWeeks, workoutsByWeekKey, activeTagFilter, currentWeek, currentYear, primaryMetric),
    [visibleWeeks, workoutsByWeekKey, activeTagFilter, currentWeek, currentYear, primaryMetric]
  )

  const {
    weeklyStats, focusWeek, hasData, totals, zoneTotals, zoneLoadTotals,
    topActivityEntries, peakWeek, trendDelta, monotony, strain, density, consistencyScore, topWorkouts,
  } = analysis

  const labels = weeklyStats.map(({ week }) => getWeekLabel(week))
  const selectedMetricMeta = METRIC_OPTIONS.find(o => o.value === primaryMetric) || METRIC_OPTIONS[0]
  const visibleStartWeek = visibleWeeks[0] || null
  const visibleEndWeek = visibleWeeks[visibleWeeks.length - 1] || null
  const isCurrentWeekVisible = currentIndex >= windowStart && currentIndex < windowStart + range
  const timelineProgress = maxWindowStart > 0 ? Math.round((windowStart / maxWindowStart) * 100) : 0
  const currentVisibleIndex = isCurrentWeekVisible ? currentIndex - windowStart : null

  const presentSports = useMemo(() => {
    const set = new Set()
    weeklyStats.forEach(w => Object.keys(w.activityLoad || {}).forEach(t => set.add(t)))
    return Array.from(set)
  }, [weeklyStats])

  return (
    <Page wide>
      <PageHeader
        eyebrow="Performance Lab"
        title="Analyse"
        subtitle={`${athleteName ? athleteName + ' · ' : ''}Multi-aktivitet analyse med fokus på volum, belastning, frekvens og soneprofil.`}
      />

      <AnalysisToolbar
        range={range}
        setRange={setRange}
        primaryMetric={primaryMetric}
        setPrimaryMetric={setPrimaryMetric}
        activeTagFilter={activeTagFilter}
        setActiveTagFilter={setActiveTagFilter}
        presentSports={presentSports}
      />

      <WindowControls
        weeks={weeks}
        range={range}
        windowStart={windowStart}
        setWindowStart={setWindowStart}
        maxWindowStart={maxWindowStart}
        visibleStartWeek={visibleStartWeek}
        visibleEndWeek={visibleEndWeek}
        isCurrentWeekVisible={isCurrentWeekVisible}
        timelineProgress={timelineProgress}
        currentIndex={currentIndex}
      />

      {!hasData ? (
        <EmptyState title="Ingen økter i analyseperioden" description="Velg en lengre periode eller en annen utøver for å se data." />
      ) : (
        <>
          <SummaryRow
            selectedMetricMeta={selectedMetricMeta}
            primaryMetric={primaryMetric}
            totals={totals}
            trendDelta={trendDelta}
            focusWeek={focusWeek}
            density={density}
            monotony={monotony}
            consistencyScore={consistencyScore}
          />

          <InsightGrid
            focusWeek={focusWeek}
            peakWeek={peakWeek}
            topActivityEntries={topActivityEntries}
            totals={totals}
            primaryMetric={primaryMetric}
            strain={strain}
          />

          <ChartGrid
            labels={labels}
            weeklyStats={weeklyStats}
            primaryMetric={primaryMetric}
            selectedMetricMeta={selectedMetricMeta}
            zoneTotals={zoneTotals}
            zoneLoadTotals={zoneLoadTotals}
            topActivityEntries={topActivityEntries}
            currentVisibleIndex={currentVisibleIndex}
          />

          <BottomGrid weeklyStats={weeklyStats} topWorkouts={topWorkouts} />
        </>
      )}
    </Page>
  )
}

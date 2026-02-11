import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Trophy, Clock, Target, Dumbbell, CheckCircle, XCircle, Layers, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

export function LLMBenchmark() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0)
  const [selectedSplit, setSelectedSplit] = useState(null)
  const [selectedDuration, setSelectedDuration] = useState(null)
  const [selectedTier, setSelectedTier] = useState(null)
  const chipContainerRef = useRef(null)

  useEffect(() => {
    fetch('/benchmark-data.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch benchmark data')
        return res.json()
      })
      .then(json => {
        setData(json)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading benchmark data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <XCircle className="w-8 h-8 text-red-500" />
        <span className="ml-2 text-red-600">Error: {error}</span>
      </div>
    )
  }

  if (!data) return null

  const { timestamp, modelStats, scenarios } = data

  // Sort models by success rate desc, then latency asc
  const sortedStats = [...modelStats]
    .filter(s => selectedTier === null || s.tier === selectedTier)
    .sort((a, b) => {
      if (b.successRate !== a.successRate) return b.successRate - a.successRate
      return a.avgLatency - b.avgLatency
    })

  // Group scenarios by split type
  const splitGroups = scenarios.reduce((acc, scenario, index) => {
    const split = scenario.split || 'Other'
    if (!acc[split]) acc[split] = []
    acc[split].push({ ...scenario, originalIndex: index })
    return acc
  }, {})

  // Count unique base scenarios per split (excluding duration suffix)
  const getBaseScenarioName = (name) => name.replace(/\s*\(\d+min\)$/, '')
  const splitBaseCounts = Object.fromEntries(
    Object.entries(splitGroups).map(([split, scenarios]) => [
      split,
      new Set(scenarios.map(s => getBaseScenarioName(s.name))).size
    ])
  )

  const splitTypes = Object.keys(splitGroups)

  // Group scenarios by duration
  const durationGroups = scenarios.reduce((acc, scenario) => {
    const duration = scenario.duration
    if (duration) {
      if (!acc[duration]) acc[duration] = []
      acc[duration].push(scenario)
    }
    return acc
  }, {})

  // Sort durations numerically
  const durationTypes = Object.keys(durationGroups)
    .map(d => parseInt(d, 10))
    .sort((a, b) => a - b)

  // Extract unique tiers from modelStats
  const tierTypes = [...new Set(modelStats.map(s => s.tier).filter(Boolean))]

  // Filter scenarios by selected split AND duration (null = show all)
  const filteredScenarios = scenarios.filter(s => {
    const matchesSplit = selectedSplit === null || (s.split || 'Other') === selectedSplit
    const matchesDuration = selectedDuration === null || s.duration === selectedDuration
    return matchesSplit && matchesDuration
  })

  const currentScenario = scenarios[selectedScenarioIndex]
  const filteredIndex = filteredScenarios.findIndex(s => s.name === currentScenario?.name)

  // Navigation handlers
  const goToPrev = () => {
    if (selectedScenarioIndex > 0) {
      setSelectedScenarioIndex(selectedScenarioIndex - 1)
    }
  }

  const goToNext = () => {
    if (selectedScenarioIndex < scenarios.length - 1) {
      setSelectedScenarioIndex(selectedScenarioIndex + 1)
    }
  }

  const scrollChips = (direction) => {
    if (chipContainerRef.current) {
      const scrollAmount = 300
      chipContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  // Split type colors
  const getSplitColor = (split) => {
    const colors = {
      'bro_split': 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200',
      'ppl': 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200',
      'upper_lower': 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200',
      'full_body': 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
      'arnold_split': 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200',
    }
    return colors[split] || 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
  }

  const formatSplitName = (split) => {
    return split.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  // Duration colors - valid durations: 30, 60, 90 minutes only
  const getDurationColor = (duration) => {
    const colors = {
      30: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200',
      60: 'bg-cyan-100 text-cyan-700 border-cyan-300 hover:bg-cyan-200',
      90: 'bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200',
    }
    return colors[duration] || 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LLM Benchmark Results</h1>
          <p className="text-sm text-gray-500">
            Generated: {new Date(timestamp).toLocaleString()}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {scenarios.length} Scenarios
        </Badge>
      </div>

      {/* Model Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Model Performance Summary
          </CardTitle>
          {/* Tier Filter Chips */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <button
              onClick={() => setSelectedTier(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedTier === null
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              All Tiers
            </button>
            {tierTypes.map(tier => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedTier === tier
                    ? 'bg-gray-900 text-white border-gray-900'
                    : tier === 'premium'
                      ? 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                {tier.charAt(0).toUpperCase() + tier.slice(1)} ({modelStats.filter(s => s.tier === tier).length})
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Rank</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Model</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Tier</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Success Rate</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Avg Latency</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Avg Exercises</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Equipment Match</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Success/Errors</th>
                </tr>
              </thead>
              <tbody>
                {sortedStats.map((stat, index) => (
                  <tr key={stat.modelId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {index === 0 ? (
                        <Trophy className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <span className="text-gray-500">#{index + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{stat.modelName}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={stat.tier === 'premium' ? 'default' : 'secondary'}
                        className={stat.tier === 'premium' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}
                      >
                        {stat.tier}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-semibold ${stat.successRate >= 80 ? 'text-green-600' : stat.successRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {typeof stat.successRate === 'number' ? stat.successRate.toFixed(1) : '—'}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="flex items-center justify-center gap-1 text-gray-600">
                        <Clock className="w-4 h-4" />
                        {typeof stat.avgLatency === 'number' ? (stat.avgLatency / 1000).toFixed(2) : '—'}s
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="flex items-center justify-center gap-1 text-gray-600">
                        <Dumbbell className="w-4 h-4" />
                        {typeof stat.avgExerciseCount === 'number' ? stat.avgExerciseCount.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="flex items-center justify-center gap-1 text-gray-600">
                        <Target className="w-4 h-4" />
                        {typeof stat.avgEquipmentMatchRate === 'number' ? stat.avgEquipmentMatchRate.toFixed(0) : '—'}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-green-600">{stat.successCount}</span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span className="text-red-600">{stat.parseErrorCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Results with Improved Navigation */}
      <Card>
        <CardHeader className="pb-4 sticky top-0 z-20 bg-white border-b shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Scenario Results</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {filteredIndex + 1} of {filteredScenarios.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrev}
                disabled={selectedScenarioIndex === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNext}
                disabled={selectedScenarioIndex === scenarios.length - 1}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Split Type Filter Chips */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setSelectedSplit(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedSplit === null
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              All Splits
            </button>
            {splitTypes.map(split => (
              <button
                key={split}
                onClick={() => setSelectedSplit(split)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedSplit === split
                    ? 'bg-gray-900 text-white border-gray-900'
                    : getSplitColor(split)
                }`}
              >
                {formatSplitName(split)} ({splitBaseCounts[split]})
              </button>
            ))}
          </div>

          {/* Duration Filter Chips */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setSelectedDuration(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedDuration === null
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              All Durations
            </button>
            {durationTypes.map(duration => (
              <button
                key={duration}
                onClick={() => setSelectedDuration(duration)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedDuration === duration
                    ? 'bg-gray-900 text-white border-gray-900'
                    : getDurationColor(duration)
                }`}
              >
                {duration} min ({durationGroups[duration].length})
              </button>
            ))}
          </div>

          {/* Horizontal Scrollable Scenario Chips */}
          <div className="relative">
            <button
              onClick={() => scrollChips('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm shadow-md rounded-full p-1.5 hover:bg-gray-100 border border-gray-200"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>

            <div
              ref={chipContainerRef}
              className="flex gap-2 overflow-x-auto scrollbar-hide px-8 py-2 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {filteredScenarios.map((scenario, idx) => {
                const actualIndex = scenarios.findIndex(s => s.name === scenario.name)
                const isActive = actualIndex === selectedScenarioIndex

                return (
                  <button
                    key={scenario.name}
                    onClick={() => setSelectedScenarioIndex(actualIndex)}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="whitespace-nowrap">{scenario.name}</div>
                    <div className={`text-[10px] mt-0.5 flex items-center gap-1 ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                      <span>{scenario.duration}min</span>
                      {scenario.equipment && scenario.equipment.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Dumbbell className="w-2.5 h-2.5" />
                            {scenario.equipment.length}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => scrollChips('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm shadow-md rounded-full p-1.5 hover:bg-gray-100 border border-gray-200"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {currentScenario && (
            <div className="space-y-4">
              {/* Scenario metadata badges - sticky below header */}
              <div className="sticky top-[180px] z-10 bg-white py-2 -mx-6 px-6 border-b border-gray-100">
              <div className="flex flex-wrap gap-2 mb-2">
                {currentScenario.split && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {currentScenario.split.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                )}

                {currentScenario.dayFocus && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    {currentScenario.dayFocus}
                  </Badge>
                )}

                {currentScenario.trainingStyles?.map((style, idx) => (
                  <Badge key={idx} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {style.replace(/_/g, ' ').replace('classic ', '').toUpperCase()}
                  </Badge>
                ))}

                {/* Fallback for old data structure */}
                {!currentScenario.split && !currentScenario.dayFocus && !currentScenario.trainingStyles && (
                  <>
                    <Badge variant="outline">{currentScenario.category}</Badge>
                    {currentScenario.trainingStyle !== currentScenario.category && (
                      <Badge variant="outline">{currentScenario.trainingStyle}</Badge>
                    )}
                  </>
                )}

                {/* Duration badge */}
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {currentScenario.duration} min
                </Badge>
              </div>

              {/* Equipment badges */}
              {currentScenario.equipment && currentScenario.equipment.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs text-gray-500 mr-1 self-center">Equipment:</span>
                  {currentScenario.equipment.map(eq => (
                    <span
                      key={eq}
                      className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs rounded-full"
                    >
                      {eq.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                  ))}
                </div>
              )}
              </div>

              {/* Model results grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentScenario.results.map((result, idx) => (
                  <Card key={`${result.modelId}-${idx}`} className={`${result.status === 'success' ? 'border-green-200' : 'border-red-200'}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>{result.model}</span>
                        {result.status === 'success' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {result.status === 'success' ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Latency:</span>
                            <span className="font-medium">{typeof result.latency === 'number' ? (result.latency / 1000).toFixed(2) : '—'}s</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Exercises:</span>
                            <span className="font-medium">{result.exerciseCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Equipment Match:</span>
                            <span className="font-medium">{typeof result.equipmentMatch === 'number' ? result.equipmentMatch.toFixed(0) : '—'}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Avg Sets/Reps/Rest:</span>
                            <span className="font-medium">
                              {typeof result.avgSets === 'number' ? result.avgSets.toFixed(1) : (result.avgSets || '-')} / {typeof result.avgReps === 'number' ? result.avgReps.toFixed(1) : (result.avgReps || '-')} / {typeof result.avgRest === 'number' ? result.avgRest.toFixed(0) : (result.avgRest || '-')}s
                            </span>
                          </div>
                          {result.exercises && result.exercises.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs text-gray-500 mb-2">Exercises:</p>
                              <ul className="text-xs space-y-3">
                                {result.exercises.map((ex, i) => (
                                  <li key={i} className="flex gap-3">
                                    {ex.videoUrl && (
                                      <video
                                        src={ex.videoUrl}
                                        className="w-16 h-16 rounded-md object-cover bg-gray-100 flex-shrink-0"
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        onError={(e) => e.target.style.display = 'none'}
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-gray-800 truncate">{ex.name}</div>
                                      <div className="text-gray-500">
                                        {ex.sets} sets x {ex.reps} reps{ex.rest ? ` · ${ex.rest}s rest` : ''}
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-red-600 text-xs">
                          <p className="font-medium">Error:</p>
                          <p className="mt-1">{result.error || 'Unknown error'}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default LLMBenchmark

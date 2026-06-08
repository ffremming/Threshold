import { useMemo, useState } from 'react'
import { Plus, Check, Star } from 'lucide-react'
import { Modal } from '../ui/Modal'
import {
  searchExercises,
  exerciseImageUrl,
  EQUIPMENT_OPTIONS,
  CATEGORY_OPTIONS,
} from '../../strength/library'
import { exerciseHighlighterData } from '../../strength/selectors'
import { muscleLabel, MUSCLE_GROUPS } from '../../strength/muscles'
import { isFavoriteExercise } from '../../strength/favorites'
import { getRecentExercises, recordRecentExercise } from '../../strength/recent'
import MuscleMap from './MuscleMap'
import MuscleFilter from './MuscleFilter'
import './strength.css'

// Searchable, filterable browser over the ~870-exercise library.
//
// Two modes:
//  • single  (default) — picking an exercise calls onSelect(exercise) and the
//    picker closes. Used to set/replace one section's exercise.
//  • multiAdd          — each "+" calls onSelect(exercise) but the picker stays
//    open so several exercises can be added in one sitting; "Done" closes it.
//
// You can filter by free text, equipment, category, a muscle-group chip
// (Push/Pull/Legs/Core), or by tapping a muscle on the body diagram.
export default function ExercisePicker({ open, onClose, onSelect, multiAdd = false }) {
  const [query, setQuery] = useState('')
  const [equipment, setEquipment] = useState('')
  const [category, setCategory] = useState('')
  const [group, setGroup] = useState('')          // muscle-group chip key
  const [muscles, setMuscles] = useState([])       // from the body diagram
  const [favoritesOnly, setFavoritesOnly] = useState(true) // lead with staples
  const [activeId, setActiveId] = useState(null)
  const [addedIds, setAddedIds] = useState([])     // visual feedback in multiAdd

  // Combine the active muscle filters: a group chip OR a body-diagram selection.
  const activeMuscles = muscles.length
    ? muscles
    : (group ? MUSCLE_GROUPS.find(g => g.key === group)?.muscles || [] : [])

  const results = useMemo(
    () => searchExercises({ query, equipment, category, muscles: activeMuscles, favoritesOnly, limit: 80 }),
    [query, equipment, category, activeMuscles, favoritesOnly],
  )

  const active = useMemo(
    () => results.find(e => e.id === activeId) || results[0] || null,
    [results, activeId],
  )

  const recents = useMemo(() => (open ? getRecentExercises() : []), [open])

  function add(exercise) {
    recordRecentExercise(exercise.id)
    onSelect(exercise)
    if (multiAdd) {
      setAddedIds(ids => (ids.includes(exercise.id) ? ids : [...ids, exercise.id]))
    } else {
      onClose?.()
    }
  }

  function pickGroup(key) {
    setMuscles([])
    setGroup(g => (g === key ? '' : key))
  }

  function pickMuscles(next) {
    setGroup('')
    setMuscles(next)
  }

  const footer = multiAdd ? (
    <div className="th-exercise-foot">
      <span className="th-exercise-foot-count">
        {addedIds.length > 0 ? `${addedIds.length} added` : 'Add exercises, then close'}
      </span>
      <button type="button" className="th-exercise-choose" onClick={onClose}>Done</button>
    </div>
  ) : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={multiAdd ? 'Add exercises' : 'Choose exercise'}
      size="lg"
      footer={footer}
    >
      <div className="th-exercise-picker">
        <div className="th-exercise-picker-list">
          <div className="th-exercise-filters">
            <input
              type="search"
              className="th-block-text-input"
              placeholder="Search exercises…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />

            <div className="th-muscle-group-chips" role="group" aria-label="Filters">
              <button
                type="button"
                className={`th-muscle-chip th-muscle-chip--fav${favoritesOnly ? ' is-active' : ''}`}
                onClick={() => setFavoritesOnly(v => !v)}
                aria-pressed={favoritesOnly}
              >
                <Star size={13} strokeWidth={2.25} aria-hidden="true"
                  fill={favoritesOnly ? 'currentColor' : 'none'} />
                Favorites
              </button>
              {MUSCLE_GROUPS.map(g => (
                <button
                  key={g.key}
                  type="button"
                  className={`th-muscle-chip${group === g.key ? ' is-active' : ''}`}
                  onClick={() => pickGroup(g.key)}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <div className="th-exercise-filter-row">
              <select className="th-exercise-select" value={equipment}
                onChange={e => setEquipment(e.target.value)} aria-label="Equipment">
                <option value="">All equipment</option>
                {EQUIPMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <select className="th-exercise-select" value={category}
                onChange={e => setCategory(e.target.value)} aria-label="Category">
                <option value="">All categories</option>
                {CATEGORY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {recents.length > 0 && !query && activeMuscles.length === 0 && (
            <div className="th-exercise-recents">
              <span className="th-exercise-recents-title">Recently used</span>
              <div className="th-exercise-recents-row">
                {recents.map(ex => (
                  <button key={ex.id} type="button" className="th-exercise-recent-chip"
                    onClick={() => add(ex)} title={`Add ${ex.name}`}>
                    <Plus size={12} strokeWidth={2.5} aria-hidden="true" />
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ul className="th-exercise-results">
            {results.length === 0 && (
              <li className="th-exercise-empty">No exercises match those filters.</li>
            )}
            {results.map(ex => {
              const added = addedIds.includes(ex.id)
              return (
                <li key={ex.id} className="th-exercise-row">
                  <button
                    type="button"
                    className={`th-exercise-item${ex.id === active?.id ? ' is-active' : ''}`}
                    onClick={() => setActiveId(ex.id)}
                    onDoubleClick={() => add(ex)}
                  >
                    <span className="th-exercise-item-name">
                      {isFavoriteExercise(ex.id) && (
                        <Star size={12} strokeWidth={2.25} fill="currentColor"
                          className="th-exercise-fav-star" aria-hidden="true" />
                      )}
                      {ex.name}
                    </span>
                    <span className="th-exercise-item-meta">
                      {ex.equipment || 'body only'} · {ex.level}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`th-exercise-quick-add${added ? ' is-added' : ''}`}
                    onClick={() => add(ex)}
                    aria-label={added ? `${ex.name} added` : `Add ${ex.name}`}
                    title={added ? 'Added' : 'Quick add'}
                  >
                    {added
                      ? <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                      : <Plus size={16} strokeWidth={2.5} aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="th-exercise-detail">
          <MuscleFilter selected={muscles} onChange={pickMuscles} />
          {active ? (
            <ExerciseDetail exercise={active} onChoose={() => add(active)} />
          ) : (
            <p className="th-exercise-empty">Select an exercise to preview it.</p>
          )}
        </div>
      </div>
    </Modal>
  )
}

function ExerciseDetail({ exercise, onChoose }) {
  const [imgFailed, setImgFailed] = useState(false)
  const mapData = useMemo(() => exerciseHighlighterData(exercise), [exercise])
  const imageUrl = !imgFailed ? exerciseImageUrl(exercise.images?.[0]) : null

  return (
    <div className="th-exercise-detail-inner">
      <div className="th-exercise-detail-head">
        <h3 className="th-exercise-detail-name">{exercise.name}</h3>
        <button type="button" className="th-exercise-choose" onClick={onChoose}>
          Add
        </button>
      </div>

      <MuscleMap data={mapData} size={130} />

      <div className="th-exercise-muscles">
        {(exercise.primaryMuscles || []).map(m => (
          <span key={`p-${m}`} className="th-muscle-tag th-muscle-tag--primary">
            {muscleLabel(m)}
          </span>
        ))}
        {(exercise.secondaryMuscles || []).map(m => (
          <span key={`s-${m}`} className="th-muscle-tag">{muscleLabel(m)}</span>
        ))}
      </div>

      {imageUrl && (
        <img className="th-exercise-image" src={imageUrl} alt={exercise.name}
          loading="lazy" onError={() => setImgFailed(true)} />
      )}

      {Array.isArray(exercise.instructions) && exercise.instructions.length > 0 && (
        <ol className="th-exercise-instructions">
          {exercise.instructions.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      )}
    </div>
  )
}

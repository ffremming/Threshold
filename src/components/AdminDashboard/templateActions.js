import {
  addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { withDatabaseWriteLimit } from '../../security/rateLimits'
import {
  getDefaultCooldown,
  getDefaultWarmup,
  normalizeIntensityZones,
  normalizeLoadTag,
} from '../../utils'
import { EMPTY_TEMPLATE } from './constants'

export function createTemplateActions(ctx) {
  const {
    userProfile, templates, templateForm, setTemplateForm,
    editingTemplate, setEditingTemplate,
  } = ctx

  function startNewTemplate() {
    setTemplateForm({ ...EMPTY_TEMPLATE })
    setEditingTemplate('new')
  }

  function startEditTemplate(template) {
    setTemplateForm({ ...template })
    setEditingTemplate(template)
  }

  async function handleSaveTemplate(e) {
    e.preventDefault()
    if (!templateForm.title.trim()) return
    if (editingTemplate === 'new') {
      await withDatabaseWriteLimit('templates', () => addDoc(collection(db, 'templates'), {
        ...templateForm,
        source: 'custom',
        ownerId: userProfile.uid,
        intensityZone: normalizeIntensityZones(templateForm.type, templateForm.intensityZone),
        loadTag: normalizeLoadTag(templateForm.type, templateForm.intensityZone, templateForm.loadTag),
        warmup: templateForm.warmup?.trim() || getDefaultWarmup(templateForm.type, templateForm.activityTag),
        cooldown: templateForm.cooldown?.trim() || getDefaultCooldown(templateForm.type, templateForm.activityTag),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }))
    } else {
      const { id, ...fields } = templateForm
      await withDatabaseWriteLimit('templates', () => updateDoc(doc(db, 'templates', editingTemplate.id), {
        ...fields,
        intensityZone: normalizeIntensityZones(fields.type, fields.intensityZone),
        loadTag: normalizeLoadTag(fields.type, fields.intensityZone, fields.loadTag),
        warmup: fields.warmup?.trim() || getDefaultWarmup(fields.type, fields.activityTag),
        cooldown: fields.cooldown?.trim() || getDefaultCooldown(fields.type, fields.activityTag),
        updatedAt: serverTimestamp(),
      }))
    }
    setEditingTemplate(null)
  }

  async function handleDeleteTemplate(template) {
    if (!window.confirm(`Delete the template "${template.title}"?`)) return
    await withDatabaseWriteLimit('templates', () => deleteDoc(doc(db, 'templates', template.id)))
  }

  async function handleAddFromLibrary(template) {
    if (!userProfile?.uid) return
    const { id, source, createdAt, updatedAt, ownerId, libraryId, ...fields } = template
    await withDatabaseWriteLimit('templates', () => addDoc(collection(db, 'templates'), {
      ...fields,
      source: 'custom',
      ownerId: userProfile.uid,
      libraryId: id,
      intensityZone: normalizeIntensityZones(fields.type, fields.intensityZone),
      loadTag: normalizeLoadTag(fields.type, fields.intensityZone, fields.loadTag),
      warmup: fields.warmup?.trim() || getDefaultWarmup(fields.type, fields.activityTag),
      cooldown: fields.cooldown?.trim() || getDefaultCooldown(fields.type, fields.activityTag),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
  }

  function isAlreadyInBank(template) {
    return templates.some(t => t.libraryId === template.id)
  }

  return {
    startNewTemplate, startEditTemplate, handleSaveTemplate, handleDeleteTemplate,
    handleAddFromLibrary, isAlreadyInBank,
  }
}

export function createGlobalTemplateActions(ctx) {
  const {
    isSuperadmin, globalTemplateForm, setGlobalTemplateForm,
    editingGlobalTemplate, setEditingGlobalTemplate,
  } = ctx

  async function handleDeleteGlobalTemplate(template) {
    if (!isSuperadmin) return
    if (!window.confirm(`Delete "${template.title}" from the library? Coach copies are kept.`)) return
    await withDatabaseWriteLimit('global-templates', () => deleteDoc(doc(db, 'globalTemplates', template.id)))
  }

  function startEditGlobalTemplate(template) {
    if (!isSuperadmin) return
    setEditingGlobalTemplate(template)
    setGlobalTemplateForm({ ...template })
  }

  function startNewGlobalTemplate() {
    if (!isSuperadmin) return
    setEditingGlobalTemplate('new')
    setGlobalTemplateForm({ ...EMPTY_TEMPLATE })
  }

  async function handleSaveGlobalTemplate(e) {
    e.preventDefault()
    if (!isSuperadmin) return
    if (!globalTemplateForm.title?.trim()) return

    const fields = {
      ...globalTemplateForm,
      intensityZone: normalizeIntensityZones(globalTemplateForm.type, globalTemplateForm.intensityZone),
      loadTag: normalizeLoadTag(globalTemplateForm.type, globalTemplateForm.intensityZone, globalTemplateForm.loadTag),
      warmup: globalTemplateForm.warmup?.trim() || getDefaultWarmup(globalTemplateForm.type, globalTemplateForm.activityTag),
      cooldown: globalTemplateForm.cooldown?.trim() || getDefaultCooldown(globalTemplateForm.type, globalTemplateForm.activityTag),
      updatedAt: serverTimestamp(),
    }

    if (editingGlobalTemplate === 'new') {
      await withDatabaseWriteLimit('global-templates', () => addDoc(collection(db, 'globalTemplates'), {
        ...fields,
        source: 'global',
        createdAt: serverTimestamp(),
      }))
    } else {
      const { id, ...rest } = fields
      await withDatabaseWriteLimit('global-templates', () => updateDoc(doc(db, 'globalTemplates', editingGlobalTemplate.id), rest))
    }
    setEditingGlobalTemplate(null)
  }

  return {
    handleDeleteGlobalTemplate, startEditGlobalTemplate, startNewGlobalTemplate, handleSaveGlobalTemplate,
  }
}

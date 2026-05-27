#!/usr/bin/env node
// Seed Firestore `globalTemplates` collection with a broad library of sessions.
// Run: node scripts/seed-global-templates.mjs
// Requires: a Firebase Auth account with role 'superadmin' on its users/{uid} doc.

import { createInterface } from 'readline'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import {
  getDefaultCooldown,
  getDefaultWarmup,
  normalizeIntensityZones,
  normalizeLoadTag,
} from '../src/utils.js'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

if (!firebaseConfig.apiKey) {
  console.error('Missing VITE_FIREBASE_* env vars. Run via: npm run seed-global-templates')
  process.exit(1)
}

// ─── Generators ──────────────────────────────────────────────────────────────
//
// Each entry produces a list of session objects. The catalog is organized by
// sport; within a sport we generate multiple sessions across intensity zones
// and durations. Categories use the existing taxonomy:
// Intervall, Terskel, Rolig, Mølle+styrke, Styrke (extended below).

const sessions = []
const seen = new Set()

function add(s) {
  // ensure stable templateKey for idempotency
  const key = s.templateKey || `${s.activityTag}-${s.title}`.toLowerCase().replace(/\s+/g, '-')
  if (seen.has(key)) return
  seen.add(key)
  sessions.push({ ...s, templateKey: key })
}

// ─── Running ─────────────────────────────────────────────────────────────────
;[
  { title: 'Rolig jogg 30 min', desc: '30 min jogg i sone 1–2, lett pust gjennom hele økten.', distance: '5 km', zone: 1, cat: 'Rolig' },
  { title: 'Rolig jogg 45 min', desc: '45 min jogg i sone 1–2.', distance: '7-8 km', zone: 1, cat: 'Rolig' },
  { title: 'Rolig jogg 60 min', desc: '60 min jogg i sone 1–2.', distance: '10 km', zone: 2, cat: 'Rolig' },
  { title: 'Lang rolig 90 min', desc: 'Lang rolig økt 90 min, sone 1–2.', distance: '14-16 km', zone: 2, cat: 'Rolig' },
  { title: 'Lang rolig 2 timer', desc: '2 timers rolig løp, fokus på utholdenhet.', distance: '18-22 km', zone: 2, cat: 'Rolig' },
  { title: 'Terskel 4x6 min', desc: '4 x 6 min @ terskel, 2 min pause. Sone 3.', zone: 3, cat: 'Terskel' },
  { title: 'Terskel 5x8 min', desc: '5 x 8 min @ terskel, 2 min pause. Sone 3.', zone: 3, cat: 'Terskel' },
  { title: 'Terskel 3x10 min', desc: '3 x 10 min @ terskel, 3 min pause.', zone: 3, cat: 'Terskel' },
  { title: 'Terskel 2x20 min', desc: '2 x 20 min @ terskel, 4 min pause.', zone: 3, cat: 'Terskel' },
  { title: 'Tempo 30 min', desc: '30 min sammenhengende tempo i sone 3.', zone: 3, cat: 'Terskel' },
  { title: 'Intervall 5x1000m', desc: '5 x 1000m, 3 min pause. Sone 4.', distance: '5 km drag', zone: 4, cat: 'Intervall' },
  { title: 'Intervall 6x800m', desc: '6 x 800m, 2:30 pause. Sone 4.', zone: 4, cat: 'Intervall' },
  { title: 'Intervall 10x400m', desc: '10 x 400m, 1 min pause. Sone 4.', zone: 4, cat: 'Intervall' },
  { title: 'Intervall 12x400m', desc: '12 x 400m, 1 min pause.', zone: 4, cat: 'Intervall' },
  { title: 'Intervall 15x400m', desc: '15 x 400m, 1 min pause.', zone: 4, cat: 'Intervall' },
  { title: 'Intervall 8x600m', desc: '8 x 600m, 2 min pause.', zone: 4, cat: 'Intervall' },
  { title: '30/30 i 20 min', desc: '20 min med 30 sek hardt / 30 sek lett.', zone: 4, cat: 'Intervall' },
  { title: '45/15 3x10', desc: '3 sett x 10 drag, 45 sek på / 15 sek av.', zone: 4, cat: 'Intervall' },
  { title: '15/15 4x10', desc: '4 sett x 10 drag, 15/15.', zone: 5, cat: 'Intervall' },
  { title: 'Sprint 10x100m', desc: '10 x 100m sprinter med full pause.', zone: 5, cat: 'Intervall' },
  { title: 'Pyramide 1-2-3-2-1 min', desc: 'Pyramide intervaller med tilsvarende pauser.', zone: 4, cat: 'Intervall' },
  { title: 'Bakkesprinter 10x', desc: '10 x 30 sek bakkesprint, jogge ned som pause.', zone: 5, cat: 'Intervall' },
  { title: 'Bakkesprinter 15x', desc: '15 x 30 sek bakkesprint.', zone: 5, cat: 'Intervall' },
  { title: 'Fartlek 45 min', desc: '45 min lekprega fart, varierer mellom sone 2-4.', zone: 3, cat: 'Intervall' },
  { title: 'Progresjonsløp 10 km', desc: 'Start sone 1, øk gradvis til sone 3 mot slutten.', distance: '10 km', zone: 2, cat: 'Rolig' },
].forEach(({ title, desc, distance, zone, cat }) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : (cat === 'Terskel' ? 'terskel' : 'interval'),
  activityTag: 'run', title, description: desc,
  ...(distance ? { distance } : {}),
  intensityZone: [zone],
}))

// ─── Running (extras) ────────────────────────────────────────────────────────
;[
  ['Rolig jogg 20 min', '20 min veldig rolig restitusjon.', 'rolig', 1, 'Rolig'],
  ['Rolig jogg 75 min', '75 min jogg sone 2.', 'rolig', 2, 'Rolig'],
  ['Lang rolig 2.5 t', 'Lang økt 2,5 timer sone 2.', 'rolig', 2, 'Rolig'],
  ['Lang rolig 3 t', 'Maraton-spesifikk lang økt 3 timer.', 'rolig', 2, 'Rolig'],
  ['Tempo 20 min', '20 min sammenhengende tempo i sone 3.', 'terskel', 3, 'Terskel'],
  ['Tempo 40 min', '40 min sammenhengende tempo, høy sone 2 / lav sone 3.', 'terskel', 3, 'Terskel'],
  ['Cruise 5x5 min', '5 x 5 min cruise terskel, 1:30 pause.', 'terskel', 3, 'Terskel'],
  ['Cruise 4x10 min', '4 x 10 min cruise terskel, 2 min pause.', 'terskel', 3, 'Terskel'],
  ['Yasso 800s', '10 x 800m i mål-marathon-tid (min:sek), like lang pause.', 'interval', 4, 'Intervall'],
  ['VO2 5x3 min', '5 x 3 min @ VO2-fart, 3 min pause.', 'interval', 4, 'Intervall'],
  ['VO2 6x4 min', '6 x 4 min @ VO2-fart, 3 min pause.', 'interval', 4, 'Intervall'],
  ['Diagonal striders', '8 x 100m striders etter rolig oppvarming.', 'interval', 4, 'Intervall'],
  ['Pyramide 200-400-600-800-600-400-200', 'Pyramide intervaller, like lang pause.', 'interval', 4, 'Intervall'],
  ['Lang intervall 3x2 km', '3 x 2 km i terskel/VO2, 3 min pause.', 'interval', 4, 'Intervall'],
  ['Lang intervall 4x1 mile', '4 x 1 mile (~1600m), 3 min pause.', 'interval', 4, 'Intervall'],
  ['Sprint 6x60m', '6 x 60m sprint med full pause.', 'interval', 5, 'Intervall'],
  ['Sprint 8x150m', '8 x 150m, 3 min pause.', 'interval', 5, 'Intervall'],
  ['Bakker 12x', '12 x 30 sek bakker, jogge ned.', 'interval', 5, 'Intervall'],
  ['Lang bakke 6x90 sek', '6 x 90 sek lang bakke, jogge ned.', 'interval', 4, 'Intervall'],
  ['Progresjon 8 km', '8 km progresjon: 3 km lett, 3 km moderat, 2 km hardt.', 'rolig', 2, 'Rolig'],
  ['Tempo + sprint combo', '20 min tempo + 6 x 100m strides etterpå.', 'interval', 3, 'Intervall'],
  ['Maraton-pace 60 min', '60 min i mål-maratonpace etter oppvarming.', 'terskel', 2, 'Terskel'],
  ['Half-marathon-pace 45 min', '45 min i mål-halv-pace.', 'terskel', 3, 'Terskel'],
  ['10K-pace 4x2 km', '4 x 2 km i 10K-fart, 90 sek pause.', 'interval', 4, 'Intervall'],
  ['Aerob terskel 2x15 min', '2 x 15 min aerob terskel, 3 min pause.', 'terskel', 2, 'Terskel'],
  ['Easy + strides', '40 min lett + 6 x 20s strides på slutten.', 'rolig', 2, 'Rolig'],
].forEach(([title, desc, type, zone, cat]) => add({
  category: cat, type,
  activityTag: 'run', title, description: desc,
  intensityZone: [zone],
}))

// ─── Trail running ───────────────────────────────────────────────────────────
;[
  ['Trail rolig 60 min', 'Lett trail, sone 1–2, teknisk sti.', 1, 'Rolig'],
  ['Trail tur 90 min', '90 min variert terreng.', 2, 'Rolig'],
  ['Trail lang 2-3 t', '2–3 timer trail, sone 1–2.', 2, 'Rolig'],
  ['Trail bakketerskel', '5 x 4 min lengre bakkedrag i sone 3.', 3, 'Terskel'],
  ['Trail intervall 8x2 min', '8 x 2 min hard, 2 min pause i kupert.', 4, 'Intervall'],
  ['Trail teknisk 45 min', 'Variert teknisk trail med fokus på fotsetting.', 2, 'Rolig'],
].forEach(([title, desc, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : (cat === 'Terskel' ? 'terskel' : 'interval'),
  activityTag: 'trail_run', title, description: desc,
  intensityZone: [zone],
}))

// ─── Cycling (road) ──────────────────────────────────────────────────────────
;[
  ['Sykkel rolig 60 min', '60 min rolig på flatt, sone 1–2.', '20-25 km', 1, 'Rolig'],
  ['Sykkel rolig 90 min', '90 min rolig.', '30-35 km', 2, 'Rolig'],
  ['Sykkel lang 2 t', '2 timer i sone 1–2.', '50-60 km', 2, 'Rolig'],
  ['Sykkel lang 3 t', '3 timer rolig grunntrening.', '80-90 km', 2, 'Rolig'],
  ['Sykkel lang 4 t', '4 timer på sykkel, sone 1–2.', '110-120 km', 2, 'Rolig'],
  ['Sykkel terskel 4x8 min', '4 x 8 min terskel, 3 min pause.', null, 3, 'Terskel'],
  ['Sykkel terskel 3x12 min', '3 x 12 min terskel, 4 min pause.', null, 3, 'Terskel'],
  ['Sykkel sweet spot 2x20 min', '2 x 20 min @ 88-94% FTP.', null, 3, 'Terskel'],
  ['Sykkel VO2 5x4 min', '5 x 4 min VO2, 4 min pause.', null, 4, 'Intervall'],
  ['Sykkel VO2 6x3 min', '6 x 3 min VO2, 3 min pause.', null, 4, 'Intervall'],
  ['Sykkel 30/30 4x10', '4 sett x 10 reps 30 sek på / 30 sek av.', null, 4, 'Intervall'],
  ['Sykkel anaerob 8x1 min', '8 x 1 min knallhardt, 2 min pause.', null, 5, 'Intervall'],
  ['Sykkel sprint 10x15 sek', '10 x 15 sek sprint med full pause.', null, 5, 'Intervall'],
  ['Sykkel bakketrening', '5 x 5 min bakke i sone 3-4.', null, 4, 'Intervall'],
  ['Sykkel kadens 60 min', '60 min med kadensøvelser, høy/lav frekvens.', null, 1, 'Rolig'],
  ['Sykkel restitusjon 30 min', '30 min veldig rolig, sone 1.', null, 1, 'Rolig'],
].forEach(([title, desc, distance, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : (cat === 'Terskel' ? 'terskel' : 'interval'),
  activityTag: 'bike', title, description: desc,
  ...(distance ? { distance } : {}),
  intensityZone: [zone],
}))

// ─── Cycling extras ──────────────────────────────────────────────────────────
;[
  ['Sykkel z2 endurance 75 min', '75 min jevn z2.', null, 2, 'Rolig'],
  ['Sykkel z2 endurance 2.5 t', '2,5 t z2 utholdenhet.', null, 2, 'Rolig'],
  ['Sykkel sweet spot 3x15 min', '3 x 15 min sweet spot, 4 min pause.', null, 3, 'Terskel'],
  ['Sykkel sweet spot 4x10 min', '4 x 10 min sweet spot, 3 min pause.', null, 3, 'Terskel'],
  ['Sykkel terskel 5x6 min', '5 x 6 min @ FTP, 3 min pause.', null, 3, 'Terskel'],
  ['Sykkel VO2 4x5 min', '4 x 5 min VO2, 5 min pause.', null, 4, 'Intervall'],
  ['Sykkel mikrointervaller 40/20', '4 sett x 8 min av 40 sek på / 20 sek av.', null, 4, 'Intervall'],
  ['Sykkel mikrointervaller 30/30', '4 sett x 10 min av 30/30.', null, 4, 'Intervall'],
  ['Sykkel anaerob 4x2 min', '4 x 2 min hard, 4 min pause.', null, 5, 'Intervall'],
  ['Sykkel sprinter 6x30 sek', '6 x 30 sek sprint, full pause.', null, 5, 'Intervall'],
  ['Sykkel klatre simulering', '4 x 8 min klatresimulering 60 rpm.', null, 3, 'Terskel'],
  ['Sykkel pace simulering 90 min', '90 min i målets racepace.', null, 3, 'Terskel'],
  ['Sykkel kadens drills', '60 min med 6 x 1 min høy kadens (110+).', null, 1, 'Rolig'],
  ['Sykkel 5 t lang', '5 timer rolig grunntrening.', '130-150 km', 2, 'Rolig'],
  ['Sykkel pendling 30 min', '30 min lett pendling.', null, 1, 'Rolig'],
].forEach(([title, desc, distance, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : (cat === 'Terskel' ? 'terskel' : 'interval'),
  activityTag: 'bike', title, description: desc,
  ...(distance ? { distance } : {}),
  intensityZone: [zone],
}))

// ─── MTB ─────────────────────────────────────────────────────────────────────
;[
  ['Terrengsykkel rolig 90 min', '90 min teknisk rolig, sone 1–2.', 2, 'Rolig'],
  ['Terrengsykkel teknikk 60 min', 'Teknisk fokusøkt: ferdigheter, kurver, hopp.', 1, 'Rolig'],
  ['Terrengsykkel intervall 6x3 min', '6 x 3 min hard i kupert terreng.', 4, 'Intervall'],
  ['Terrengsykkel lang 3 t', '3 t kupert sti.', 2, 'Rolig'],
].forEach(([title, desc, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : 'interval',
  activityTag: 'mtb', title, description: desc,
  intensityZone: [zone],
}))

// ─── Gravel ──────────────────────────────────────────────────────────────────
;[
  ['Gravel rolig 2 t', 'Rolig gruslyngd, sone 1–2.', 2, 'Rolig'],
  ['Gravel lang 4 t', 'Lang grusøkt, sone 1–2.', 2, 'Rolig'],
  ['Gravel terskel 3x10 min', '3 x 10 min terskel på grus.', 3, 'Terskel'],
].forEach(([title, desc, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : (cat === 'Terskel' ? 'terskel' : 'interval'),
  activityTag: 'gravel', title, description: desc,
  intensityZone: [zone],
}))

// ─── Spinning ────────────────────────────────────────────────────────────────
;[
  ['Spinning 45 min – terskel', '45 min spinning med 3 x 8 min terskel.', 3, 'Terskel'],
  ['Spinning 60 min – intervaller', '60 min spinning med 6 x 3 min hard.', 4, 'Intervall'],
  ['Spinning 30 min – rolig', '30 min rolig spinning.', 1, 'Rolig'],
].forEach(([title, desc, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : (cat === 'Terskel' ? 'terskel' : 'interval'),
  activityTag: 'spinning', title, description: desc,
  intensityZone: [zone],
}))

// ─── Swim ────────────────────────────────────────────────────────────────────
;[
  ['Svømming rolig 1500m', '1500m rolig med teknikkfokus.', '1500m', 1, 'Rolig'],
  ['Svømming teknikk 2000m', 'Teknikkøkt med drills og enkelte sett.', '2000m', 2, 'Rolig'],
  ['Svømming utholdenhet 3000m', '3000m i jevn fart sone 2.', '3000m', 2, 'Rolig'],
  ['Svømming intervall 10x100m', '10 x 100m, 20 sek pause. Sone 3-4.', '1500m drag', 4, 'Intervall'],
  ['Svømming intervall 8x200m', '8 x 200m, 30 sek pause.', '1600m', 3, 'Terskel'],
  ['Svømming intervall 5x400m', '5 x 400m i terskelfart, 45 sek pause.', '2000m', 3, 'Terskel'],
  ['Svømming sprint 16x50m', '16 x 50m sprint, 30 sek pause.', '800m', 5, 'Intervall'],
  ['Svømming pyramide', '50-100-200-400-200-100-50 progresjon.', '1100m', 3, 'Intervall'],
].forEach(([title, desc, distance, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : (cat === 'Terskel' ? 'terskel' : 'interval'),
  activityTag: 'swim', title, description: desc, distance,
  intensityZone: [zone],
}))

// ─── Swim extras ─────────────────────────────────────────────────────────────
;[
  ['Svømming utholdenhet 2500m', '2500m jevn fart, sone 2.', '2500m', 2, 'Rolig'],
  ['Svømming teknikk 1200m', 'Kortere teknikkøkt med drill og kick.', '1200m', 1, 'Rolig'],
  ['Svømming bein-sett', '6 x 200m kun bein.', '1200m', 2, 'Rolig'],
  ['Svømming pull-sett', '6 x 200m kun arm med pull buoy.', '1200m', 2, 'Rolig'],
  ['Svømming intervall 6x150m', '6 x 150m, 30 sek pause.', '900m', 3, 'Intervall'],
  ['Svømming intervall 12x75m', '12 x 75m, 20 sek pause.', '900m', 4, 'Intervall'],
  ['Svømming sprint 8x25m', '8 x 25m sprint, full pause.', '200m', 5, 'Intervall'],
  ['Svømming IM-rotasjon', '4 x 100m IM (4 stiler), 30 sek pause.', '400m', 3, 'Intervall'],
].forEach(([title, desc, distance, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : (cat === 'Terskel' ? 'terskel' : 'interval'),
  activityTag: 'swim', title, description: desc, distance,
  intensityZone: [zone],
}))

// ─── Open water ──────────────────────────────────────────────────────────────
;[
  ['Åpent vann 30 min', '30 min jevn svømming i åpent vann med navigasjon.', 2, 'Rolig'],
  ['Åpent vann 60 min', '60 min jevn svømming, sone 1–2.', 2, 'Rolig'],
  ['Åpent vann racefart 20 min', '20 min hard i sone 3–4 etter oppvarming.', 3, 'Terskel'],
].forEach(([title, desc, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : (cat === 'Terskel' ? 'terskel' : 'interval'),
  activityTag: 'openwater', title, description: desc,
  intensityZone: [zone],
}))

// ─── Triathlon brick ─────────────────────────────────────────────────────────
;[
  ['Brick: sykkel 60 + løp 20', '60 min sykkel sone 2 + 20 min løp sone 2-3.', 3, 'Intervall'],
  ['Brick: sykkel 90 + løp 30', '90 min sykkel + 30 min løp.', 2, 'Rolig'],
  ['Brick: svøm 1500 + sykkel 60', '1500m svøm + 60 min sykkel.', 2, 'Rolig'],
].forEach(([title, desc, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : (cat === 'Terskel' ? 'terskel' : 'interval'),
  activityTag: 'triathlon', title, description: desc,
  intensityZone: [zone],
}))

// ─── Rowing ──────────────────────────────────────────────────────────────────
;[
  ['Roing 30 min jevn', '30 min jevn i sone 2.', '6-7 km', 2, 'Rolig'],
  ['Roing 45 min steady', '45 min jevn fart.', '9-10 km', 2, 'Rolig'],
  ['Roing 5x1000m', '5 x 1000m, 2 min pause.', '5 km drag', 4, 'Intervall'],
  ['Roing 4x500m', '4 x 500m hardt, 3 min pause.', null, 5, 'Intervall'],
  ['Roing 6x4 min', '6 x 4 min terskel, 1 min pause.', null, 3, 'Terskel'],
  ['Roing 60 min UT2', '60 min UT2 sone 1.', '12-13 km', 1, 'Rolig'],
].forEach(([title, desc, distance, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : (cat === 'Terskel' ? 'terskel' : 'interval'),
  activityTag: 'rowing', title, description: desc,
  ...(distance ? { distance } : {}),
  intensityZone: [zone],
}))

// ─── Kayak ───────────────────────────────────────────────────────────────────
;[
  ['Kajakk rolig 60 min', '60 min rolig padling, sone 1–2.', 2, 'Rolig'],
  ['Kajakk teknikk 45 min', 'Teknikk og rotasjon.', 1, 'Rolig'],
  ['Kajakk intervall 6x3 min', '6 x 3 min hard, 2 min pause.', 4, 'Intervall'],
].forEach(([title, desc, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : 'interval',
  activityTag: 'kayak', title, description: desc,
  intensityZone: [zone],
}))

// ─── SUP ─────────────────────────────────────────────────────────────────────
;[
  ['SUP rolig 45 min', '45 min jevn padling, fokus på balanse og kjernemuskulatur.', 1, 'Rolig'],
  ['SUP intervall 8x1 min', '8 x 1 min hard padling, 1 min pause.', 4, 'Intervall'],
].forEach(([title, desc, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : 'interval',
  activityTag: 'sup', title, description: desc,
  intensityZone: [zone],
}))

// ─── XC skiing ───────────────────────────────────────────────────────────────
;[
  ['Langrenn rolig 90 min', '90 min rolig, sone 1–2.', 2, 'Rolig'],
  ['Langrenn lang 3 t', '3 timer rolig langrenn.', 2, 'Rolig'],
  ['Langrenn teknikk 60 min', 'Teknikkøkt med fokus på diagonal.', 1, 'Rolig'],
  ['Langrenn intervall 6x4 min', '6 x 4 min hard, 2 min pause.', 4, 'Intervall'],
  ['Langrenn terskel 3x10 min', '3 x 10 min terskel, 3 min pause.', 3, 'Terskel'],
  ['Langrenn skating 2x15 min', '2 x 15 min skating tempo.', 3, 'Terskel'],
  ['Langrenn klassisk 90 min', '90 min klassisk teknikk i variert terreng.', 2, 'Rolig'],
].forEach(([title, desc, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : (cat === 'Terskel' ? 'terskel' : 'interval'),
  activityTag: 'xc_skiing', title, description: desc,
  intensityZone: [zone],
}))

// ─── Biathlon ────────────────────────────────────────────────────────────────
;[
  ['Skiskyting tørrtreining', 'Tørrtreining og holdingsøvelser, 30 min.', 1, 'Rolig'],
  ['Skiskyting 5x3 min + skyting', '5 x 3 min hard ski + 5 skudd ligg/stå.', 4, 'Intervall'],
].forEach(([title, desc, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : 'interval',
  activityTag: 'biathlon', title, description: desc,
  intensityZone: [zone],
}))

// ─── Alpine / snowboard ──────────────────────────────────────────────────────
;[
  ['Alpint teknikkdag', 'Teknikk i variert løypevalg, 4 timer.', 'alpine', 2, 'Rolig'],
  ['Alpint kondisjonsøkt', '8 x 90 sek hardt brakkeløp, 3 min pause.', 'alpine', 4, 'Intervall'],
  ['Snowboard freeride', '4 timer freeride i variert terreng.', 'snowboard', 2, 'Rolig'],
  ['Snowboard park session', '90 min park med fokus på triks.', 'snowboard', 3, 'Intervall'],
].forEach(([title, desc, tag, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : 'interval',
  activityTag: tag, title, description: desc,
  intensityZone: [zone],
}))

// ─── Strength ────────────────────────────────────────────────────────────────
;[
  ['Helkroppstyrke A', 'Knebøy 4x8, markløft 4x6, benkpress 4x8, pull-ups 4xmaks.', 2, 'Styrke'],
  ['Helkroppstyrke B', 'Frontbøy 4x6, rumensk markløft 4x8, push press 4x6, ro 4x8.', 2, 'Styrke'],
  ['Helkroppstyrke C', 'Goblet squat 4x10, rygghev 3x12, push-ups 4x15, planke 3x60s.', 2, 'Styrke'],
  ['Underkropp tung', 'Knebøy 5x5, rumensk markløft 4x6, utfall 3x10.', 2, 'Styrke'],
  ['Overkropp tung', 'Benkpress 5x5, markløft over kne 4x5, ro 4x6, pull-ups 4xmaks.', 2, 'Styrke'],
  ['Push dag', 'Benkpress 4x8, militærpress 4x8, dips 3x10, triceps 3x12.', 2, 'Styrke'],
  ['Pull dag', 'Pull-ups 4xmaks, ro 4x8, hammer curl 3x10, ansiktsdrag 3x12.', 2, 'Styrke'],
  ['Beindag', 'Knebøy 4x8, leg press 4x10, hamstring curl 3x12, kalv 3x15.', 2, 'Styrke'],
  ['Kjernemuskulatur', 'Planke 3x60s, sidestilling 3x45s, dødsbille 3x12, hollow hold 3x30s.', 2, 'Styrke'],
  ['Hypertrofi sirkel', '5 øvelser x 12 reps x 4 runder. 30 sek pause.', 3, 'Styrke'],
  ['Maksimal styrke', '3-5 reps med tung vekt på 4 hovedløft.', 2, 'Styrke'],
  ['Eksplosivt løft', 'Power clean 5x3, snatch 5x3, box jumps 4x5.', 4, 'Styrke'],
  ['Spenst', '4 x 5 boksesprett, 4 x 5 utfallshopp, 3 x 5 single-leg jumps.', 4, 'Styrke'],
  ['Kettlebell flow 30 min', 'Kontinuerlig kettlebell flow med swing, snatch, press.', 3, 'Styrke'],
  ['Strongman lite', 'Farmer carry, sled push, atlas-stein, 4 runder.', 4, 'Styrke'],
].forEach(([title, desc, zone, cat]) => add({
  category: cat, type: 'styrke', activityTag: 'strength', title, description: desc,
  intensityZone: [zone],
}))

// ─── Strength extras ─────────────────────────────────────────────────────────
;[
  ['Styrke for løpere', 'Knebøy 3x8, utfall 3x10, kalv 3x15, kjernestabilitet.', 2, 'Styrke'],
  ['Styrke for syklister', 'Knebøy 4x6, rumensk markløft 3x8, single-leg press 3x10.', 2, 'Styrke'],
  ['Styrke for svømmere', 'Pull-ups 4xmax, ro 4x8, push-press 3x6, kjerne.', 2, 'Styrke'],
  ['Styrke for langrennsløpere', 'Knebøy 4x6, push-press 4x6, ro 4x8, sittende press 3x8.', 2, 'Styrke'],
  ['Styrke kjerne 20 min', '20 min kjernerutine: planke, sidestilling, hollow.', 1, 'Styrke'],
  ['Styrke skuldre stabilitet', 'Skulderpress 3x8, sideheving 3x12, ansiktsdrag 3x12, YTW 3x10.', 2, 'Styrke'],
  ['Styrke rygg fokus', 'Markløft 4x5, ro 4x8, hyperextension 3x10, lat pulldown 4x10.', 2, 'Styrke'],
  ['Styrke armer', 'Bicep curl 4x10, hammer 3x10, triceps push 4x10, dips 3x10.', 2, 'Styrke'],
  ['Styrke stort volum', '5x10 reps på 6 hovedøvelser.', 3, 'Styrke'],
  ['Styrke superset', '5 superset par x 10 reps.', 3, 'Styrke'],
  ['Styrke full body 30 min', '30 min full-body med 5 øvelser.', 2, 'Styrke'],
  ['Styrke kettlebell 30 min', '30 min kettlebell sirkel.', 3, 'Styrke'],
  ['Styrke TRX', 'TRX rad, push-up, pistol, fallenger.', 2, 'Styrke'],
  ['Styrke EMOM 20 min', 'EMOM 20 min: 5 thrusters + 7 burpees annenhver minutt.', 4, 'Styrke'],
].forEach(([title, desc, zone, cat]) => add({
  category: cat, type: 'styrke', activityTag: 'strength', title, description: desc,
  intensityZone: [zone],
}))

// ─── Calisthenics / bodyweight ───────────────────────────────────────────────
;[
  ['Kroppsvekt full body', 'Push-ups, kne squats, situps, 4 runder x 15 reps.', 2, 'Styrke'],
  ['Kroppsvekt Pull EMOM', 'Pull-ups EMOM 10 min.', 4, 'Styrke'],
  ['Handstand progress', '15 min handstand drills.', 1, 'Styrke'],
].forEach(([title, desc, zone, cat]) => add({
  category: cat, type: 'styrke', activityTag: 'calisthenics', title, description: desc,
  intensityZone: [zone],
}))

// ─── Plyometric / jumps ──────────────────────────────────────────────────────
;[
  ['Spenst 30 min', 'Boks-hopp, dybdehopp, single-leg hops.', 4, 'Styrke'],
  ['Reactive jumps', '6 x 8 reaktive hopp, full pause.', 4, 'Styrke'],
].forEach(([title, desc, zone, cat]) => add({
  category: cat, type: 'styrke', activityTag: 'plyometric', title, description: desc,
  intensityZone: [zone],
}))

// ─── CrossFit / HIIT ─────────────────────────────────────────────────────────
;[
  ['Cindy', '20 min AMRAP: 5 pull-ups, 10 push-ups, 15 squats.', 4, 'Styrke'],
  ['Fran', '21-15-9 thrusters + pull-ups for tid.', 5, 'Styrke'],
  ['Murph', '1 mile løp, 100 pull-ups, 200 push-ups, 300 squats, 1 mile løp.', 4, 'Styrke'],
  ['Helen', '3 runder: 400m løp, 21 kettlebell swings, 12 pull-ups.', 4, 'Styrke'],
  ['Tabata 4x', '4 x tabata (push-ups, squats, situps, burpees).', 5, 'Intervall'],
].forEach(([title, desc, zone, cat]) => add({
  category: cat, type: cat === 'Intervall' ? 'interval' : 'styrke',
  activityTag: 'crossfit', title, description: desc,
  intensityZone: [zone],
}))

// ─── Yoga / mobility / pilates ───────────────────────────────────────────────
;[
  ['Yoga flow 30 min', 'Vinyasa flow, sone 1.', 'yoga', 1, 'Rolig'],
  ['Yoga restorativ 45 min', 'Restorativ yoga, fokus på pust.', 'yoga', 1, 'Rolig'],
  ['Yoga power 45 min', 'Krevende vinyasa.', 'yoga', 2, 'Rolig'],
  ['Mobilitet 20 min', 'Hofter, skuldre, ankel.', 'mobility', 1, 'Rolig'],
  ['Mobilitet 40 min', 'Helkropp mobility flow.', 'mobility', 1, 'Rolig'],
  ['Pilates mat 45 min', 'Mat pilates, fokus på kjerne.', 'pilates', 2, 'Rolig'],
].forEach(([title, desc, tag, zone, cat]) => add({
  category: cat, type: 'rolig', activityTag: tag, title, description: desc,
  intensityZone: [zone],
}))

// ─── Hiking / walking ────────────────────────────────────────────────────────
;[
  ['Tur 60 min', '60 min rolig tur i skog/sti.', 'hiking', 1, 'Rolig'],
  ['Fjelltur 4 t', '4 timers fjelltur i moderat terreng.', 'hiking', 2, 'Rolig'],
  ['Lang fjelltur 6-8 t', 'Hel-dags fjelltur.', 'hiking', 2, 'Rolig'],
  ['Rask gåtur 30 min', '30 min rask gåtur.', 'walking', 1, 'Rolig'],
  ['Gå/jogg intervall', '5 x 3 min gå / 2 min jogg.', 'walking', 2, 'Rolig'],
].forEach(([title, desc, tag, zone, cat]) => add({
  category: cat, type: 'rolig', activityTag: tag, title, description: desc,
  intensityZone: [zone],
}))

// ─── Team sports ─────────────────────────────────────────────────────────────
const teamSports = [
  { tag: 'football', label: 'Fotball' },
  { tag: 'basketball', label: 'Basketball' },
  { tag: 'volleyball', label: 'Volleyball' },
  { tag: 'handball', label: 'Håndball' },
  { tag: 'hockey', label: 'Ishockey' },
  { tag: 'rugby', label: 'Rugby' },
]

teamSports.forEach(({ tag, label }) => {
  ;[
    [`${label} teknikk 60 min`, `Teknikkøkt med fokus på ferdigheter (${label}).`, 2, 'Rolig'],
    [`${label} kamp 90 min`, `Lagøkt med spillsekvenser og kampsimulasjon.`, 3, 'Intervall'],
    [`${label} intervaller`, `Sportspesifikke intervaller, 8 x 2 min hardt.`, 4, 'Intervall'],
    [`${label} kondisjon`, `30 min kondisjonsfokusert økt med ball/spill.`, 3, 'Intervall'],
    [`${label} sprint`, `8 x 30 sek sprint-drill med pauser.`, 5, 'Intervall'],
    [`${label} hurtighet og smidighet`, `Småspill og smidighetsbaner, 45 min.`, 3, 'Intervall'],
    [`${label} taktikk`, `Taktisk gjennomgang og spillsystem 60 min.`, 1, 'Rolig'],
    [`${label} restitusjon`, `Lett gjennomgang, mobilitet og pust 30 min.`, 1, 'Rolig'],
  ].forEach(([title, desc, zone, cat]) => add({
    category: cat, type: cat === 'Rolig' ? 'rolig' : 'interval',
    activityTag: tag, title, description: desc,
    intensityZone: [zone],
  }))
})

// ─── Racquet sports ──────────────────────────────────────────────────────────
const racquetSports = [
  { tag: 'tennis', label: 'Tennis' },
  { tag: 'badminton', label: 'Badminton' },
  { tag: 'padel', label: 'Padel' },
  { tag: 'squash', label: 'Squash' },
  { tag: 'table_tennis', label: 'Bordtennis' },
]

racquetSports.forEach(({ tag, label }) => {
  ;[
    [`${label} drill 60 min`, `Drilløkt med teknikk og spilløvelser.`, 2, 'Rolig'],
    [`${label} matchspill 90 min`, `Konkurransespill / matcher.`, 3, 'Intervall'],
    [`${label} intervaller`, `Sportspesifikke intervaller med korte sprint.`, 4, 'Intervall'],
    [`${label} fotarbeid`, `30 min fotarbeid, ladder, agility.`, 3, 'Intervall'],
    [`${label} serveøkt`, `Fokusøkt på serve/oppslag, 45 min.`, 2, 'Rolig'],
  ].forEach(([title, desc, zone, cat]) => add({
    category: cat, type: cat === 'Rolig' ? 'rolig' : 'interval',
    activityTag: tag, title, description: desc,
    intensityZone: [zone],
  }))
})

// ─── Combat sports ───────────────────────────────────────────────────────────
const combatSports = [
  { tag: 'boxing', label: 'Boksing' },
  { tag: 'mma', label: 'MMA' },
  { tag: 'martial_arts', label: 'Kampsport' },
]

combatSports.forEach(({ tag, label }) => {
  ;[
    [`${label} teknikk 60 min`, `Teknikk og holdninger.`, 2, 'Rolig'],
    [`${label} sparring 60 min`, `Lett sparring og driller.`, 3, 'Intervall'],
    [`${label} HIIT runder`, `5 x 3 min runder med pad-arbeid eller bag.`, 4, 'Intervall'],
    [`${label} kondisjonsøkt`, `30 min HIIT med kampsportbevegelser.`, 4, 'Intervall'],
  ].forEach(([title, desc, zone, cat]) => add({
    category: cat, type: cat === 'Rolig' ? 'rolig' : 'interval',
    activityTag: tag, title, description: desc,
    intensityZone: [zone],
  }))
})

// ─── Climbing / bouldering ───────────────────────────────────────────────────
;[
  ['Buldring teknikk', '90 min buldring med teknikkfokus.', 'bouldering', 2, 'Styrke'],
  ['Buldring 4x4', '4 ruter x 4 runder, gå tilbake umiddelbart.', 'bouldering', 4, 'Styrke'],
  ['Buldring projecting', 'Jobb på prosjekt-rute, lange pauser.', 'bouldering', 3, 'Styrke'],
  ['Klatring utholdenhet', '90 min klatring med flere ruter på sone 2.', 'climbing', 2, 'Rolig'],
  ['Klatring lead climb', '60 min med fokus på lead.', 'climbing', 3, 'Styrke'],
  ['Hangboard repeaters', '6 sett x 6 reps 7s henger / 3s pause.', 'climbing', 3, 'Styrke'],
].forEach(([title, desc, tag, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : 'styrke',
  activityTag: tag, title, description: desc,
  intensityZone: [zone],
}))

// ─── Skating / inline ────────────────────────────────────────────────────────
;[
  ['Skøyter rolig 45 min', '45 min jevn fart.', 'skating', 2, 'Rolig'],
  ['Skøyter 6x500m', '6 x 500m hardt, 3 min pause.', 'skating', 4, 'Intervall'],
  ['Rulleski 60 min sone 1', '60 min sone 1 rulleski.', 'inline', 1, 'Rolig'],
  ['Rulleski intervall 5x4 min', '5 x 4 min hard rulleski.', 'inline', 4, 'Intervall'],
].forEach(([title, desc, tag, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : 'interval',
  activityTag: tag, title, description: desc,
  intensityZone: [zone],
}))

// ─── Surf / sailing / freedive ───────────────────────────────────────────────
;[
  ['Surfing 90 min', '90 min surfing avhengig av forhold.', 'surf', 2, 'Rolig'],
  ['Seiling regatta', '2 timer regattatrening.', 'sailing', 2, 'Rolig'],
  ['Fridykking statisk', 'Apnea-statisk progresjon, 30 min med pust.', 'freedive', 1, 'Rolig'],
  ['Fridykking dynamisk', 'Dynamiske apnea-distanser i basseng.', 'freedive', 2, 'Rolig'],
].forEach(([title, desc, tag, zone, cat]) => add({
  category: cat, type: 'rolig', activityTag: tag, title, description: desc,
  intensityZone: [zone],
}))

// ─── Horse / golf / dance / rest ─────────────────────────────────────────────
;[
  ['Ridning 60 min skritt/trav', 'Skritt og trav, lett økt.', 'horse', 1, 'Rolig'],
  ['Ridning sprang', 'Sprangtreening 45 min.', 'horse', 3, 'Intervall'],
  ['Golf 9 hull', '9 hulls runde gående.', 'golf', 1, 'Rolig'],
  ['Golf 18 hull', '18 hulls runde gående.', 'golf', 2, 'Rolig'],
  ['Dans 60 min', '60 min dans (sone avhenger av stil).', 'dance', 2, 'Rolig'],
  ['Aktiv hvile 30 min', '30 min veldig lett aktivitet, sone 1.', 'rest', 1, 'Rolig'],
  ['Total hvile', 'Full hviledag uten trening.', 'rest', 1, 'Rolig'],
].forEach(([title, desc, tag, zone, cat]) => add({
  category: cat, type: cat === 'Rolig' ? 'rolig' : 'interval',
  activityTag: tag, title, description: desc,
  intensityZone: [zone],
}))

// ─── Mølle/treadmill specials (legacy category Mølle+styrke) ─────────────────
;[
  ['Mølle 5x3 min stigning', '5 x 3 min stigning 6%, sone 4.', 4, 'Mølle+styrke'],
  ['Mølle progresjon 30 min', 'Start sone 1, øk fart hver 5 min.', 2, 'Mølle+styrke'],
  ['Mølle + styrke combo', '20 min mølle + 30 min styrke.', 3, 'Mølle+styrke'],
].forEach(([title, desc, zone, cat]) => add({
  category: cat, type: 'molle', activityTag: 'run', title, description: desc,
  intensityZone: [zone],
}))

// ─── Build template payloads ────────────────────────────────────────────────
const TEMPLATES = sessions.map(s => {
  const fields = {
    category: s.category,
    type: s.type,
    activityTag: s.activityTag,
    title: s.title,
    description: s.description,
    distance: s.distance || '',
    sessionDetails: s.sessionDetails || s.description,
    notes: s.notes || '',
    intensityZone: normalizeIntensityZones(s.type, s.intensityZone),
    templateKey: s.templateKey,
  }
  return {
    ...fields,
    loadTag: normalizeLoadTag(fields.type, fields.intensityZone, undefined),
    warmup: getDefaultWarmup(fields.type, fields.activityTag),
    cooldown: getDefaultCooldown(fields.type, fields.activityTag),
    source: 'global',
  }
})

const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = q => new Promise(resolve => rl.question(q, resolve))

async function main() {
  try {
    console.log('\n🌍 Seed globalt øktbibliotek til Firestore\n')
    console.log(`Genererte ${TEMPLATES.length} unike økter på tvers av sport.`)

    const email = await ask('Superadmin e-post: ')
    const password = await ask('Passord: ')

    const app = initializeApp(firebaseConfig)
    const authInstance = getAuth(app)
    const db = getFirestore(app)

    await signInWithEmailAndPassword(authInstance, email, password)
    console.log('✓ Logget inn')

    const existingSnap = await getDocs(collection(db, 'globalTemplates'))
    const existingKeys = new Set(
      existingSnap.docs.map(d => d.data().templateKey).filter(Boolean)
    )
    if (existingKeys.size > 0) {
      console.log(`Fant ${existingKeys.size} eksisterende økter — hopper over dem.`)
    }

    const toInsert = TEMPLATES.filter(t => !existingKeys.has(t.templateKey))
    if (toInsert.length === 0) {
      console.log('Ingen nye økter å legge til.')
      process.exit(0)
    }

    const ans = await ask(`\nLegg til ${toInsert.length} nye økter? (j/N): `)
    if (ans.toLowerCase() !== 'j') {
      console.log('Avbrutt.')
      process.exit(0)
    }

    for (const t of toInsert) {
      await addDoc(collection(db, 'globalTemplates'), {
        ...t,
        createdAt: serverTimestamp(),
      })
      process.stdout.write('.')
    }
    console.log(`\n\n✅ ${toInsert.length} økter lagt til i globalTemplates.`)
    process.exit(0)
  } catch (err) {
    console.error('\n❌ Seed feilet:', err.message)
    process.exit(1)
  } finally {
    rl.close()
  }
}

main().catch(err => { console.error(err); process.exit(1) })

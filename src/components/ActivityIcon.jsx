import {
  Activity,
  Anchor,
  Award,
  BarChart3,
  Bed,
  Bike,
  ClipboardList,
  Compass,
  Crosshair,
  Dumbbell,
  Flag,
  Flame,
  Footprints,
  Gauge,
  Hand,
  HandMetal,
  Heart,
  Mountain,
  MountainSnow,
  Music,
  PersonStanding,
  Sailboat,
  Ship,
  Shield,
  Snowflake,
  Sparkles,
  Sun,
  Swords,
  Target,
  Tent,
  TreePine,
  Trophy,
  Users,
  Waves,
  Wind,
  Zap,
} from 'lucide-react'
// Font Awesome 6 has true figurative sport glyphs that lucide lacks:
// an actual running person and a cross-country (nordic) skier.
import { FaPersonRunning, FaPersonSkiingNordic } from 'react-icons/fa6'

// Filled react-icons glyphs don't take a strokeWidth prop; the renderer
// passes only the props each family understands.
const FILLED_ICONS = new Set([FaPersonRunning, FaPersonSkiingNordic])

const ICONS = {
  // legacy / workout-type aliases
  run: FaPersonRunning,
  walking: Footprints,
  strength: Dumbbell,
  xc_skiing: FaPersonSkiingNordic,
  bike: Bike,
  swim: Waves,
  interval: BarChart3,
  terskel: Gauge,
  rolig: FaPersonRunning,
  molle: Dumbbell,
  annet: ClipboardList,

  // expanded sports
  trail_run: Mountain,
  hiking: TreePine,
  alpine: MountainSnow,
  snowboard: MountainSnow,
  biathlon: Crosshair,
  mtb: Mountain,
  gravel: Bike,
  spinning: Bike,
  openwater: Waves,
  triathlon: Trophy,
  rowing: Anchor,
  kayak: Ship,
  sup: Sailboat,
  surf: Waves,
  sailing: Sailboat,
  freedive: Anchor,
  yoga: Sparkles,
  pilates: Sparkles,
  mobility: Activity,
  calisthenics: HandMetal,
  plyometric: Zap,
  crossfit: Flame,
  football: Trophy,
  basketball: Trophy,
  volleyball: Trophy,
  handball: Trophy,
  hockey: Shield,
  rugby: Shield,
  tennis: Target,
  badminton: Target,
  padel: Target,
  squash: Target,
  table_tennis: Target,
  boxing: Swords,
  mma: Swords,
  martial_arts: Swords,
  climbing: Mountain,
  bouldering: Mountain,
  skating: Wind,
  inline: Wind,
  horse: Award,
  golf: Flag,
  dance: Music,
  rest: Bed,
}

// referenced to avoid unused-import warnings if a sport's icon is later swapped
void Heart
void Sun
void Snowflake
void Compass
void Hand
void Tent
void Users
void PersonStanding

export default function ActivityIcon({ name, className = '', title, strokeWidth = 1.9 }) {
  const Icon = ICONS[name] || ICONS.annet
  const isFilled = FILLED_ICONS.has(Icon)

  return (
    <Icon
      aria-hidden={title ? undefined : 'true'}
      aria-label={title}
      className={className}
      // Filled react-icons glyphs ignore strokeWidth; only pass it to lucide.
      {...(isFilled ? {} : { strokeWidth })}
    />
  )
}

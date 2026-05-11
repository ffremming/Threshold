import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const nowMarkerPlugin = {
  id: 'nowMarker',
  afterDatasetsDraw(chart, _args, pluginOptions) {
    const index = pluginOptions?.index
    if (!Number.isInteger(index)) return

    const xScale = chart.scales.x
    const yScale = chart.scales.y
    if (!xScale || !yScale) return

    const x = xScale.getPixelForValue(index)
    if (!Number.isFinite(x)) return

    const top = yScale.top + 20
    const bottom = yScale.bottom
    const ctx = chart.ctx

    ctx.save()
    ctx.strokeStyle = pluginOptions.color || '#38bdf8'
    ctx.fillStyle = pluginOptions.color || '#38bdf8'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    ctx.moveTo(x, top + 18)
    ctx.lineTo(x, bottom)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x - 7, top + 12)
    ctx.lineTo(x + 7, top + 12)
    ctx.closePath()
    ctx.fill()

    ctx.font = '700 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(pluginOptions.label || 'Na', x, top - 4)
    ctx.restore()
  },
}

ChartJS.register(nowMarkerPlugin)

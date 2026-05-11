export function performanceOptions(currentVisibleIndex) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          boxWidth: 10,
          font: { size: 11, weight: '600' },
        },
      },
      tooltip: {
        intersect: false,
        mode: 'index',
      },
      nowMarker: {
        index: currentVisibleIndex,
        label: 'Na',
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11, weight: '700' } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.18)' },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
    },
  }
}

export function balanceOptions(currentVisibleIndex) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          boxWidth: 10,
          font: { size: 11, weight: '600' },
        },
      },
      nowMarker: {
        index: currentVisibleIndex,
        label: 'Na',
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11, weight: '700' } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.18)' },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
      y1: {
        position: 'right',
        min: 0,
        grid: { drawOnChartArea: false },
        ticks: { color: '#7c3aed', font: { size: 11, weight: '700' } },
      },
    },
  }
}

export function stackedOptions(currentVisibleIndex) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 14,
          boxWidth: 10,
          font: { size: 11, weight: '600' },
        },
      },
      tooltip: {
        callbacks: {
          label: context => `${context.dataset.label}: ${Math.round(context.parsed.y)} load`,
        },
      },
      nowMarker: {
        index: currentVisibleIndex,
        label: 'Na',
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11, weight: '700' } },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.18)' },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
    },
  }
}

export const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 14,
        boxWidth: 10,
        font: { size: 11, weight: '600' },
      },
    },
    tooltip: {
      callbacks: {
        label: context => `${context.label}: ${context.raw}`,
      },
    },
  },
  cutout: '64%',
}

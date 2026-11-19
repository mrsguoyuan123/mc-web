<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'

const themeMode = ref('dark')

const isLight = computed(() => themeMode.value === 'light')

const trendRef = ref(null)
const activityRef = ref(null)
const graphRef = ref(null)

let trendChart = null
let activityChart = null
let graphChart = null
let eventTimer = null

const metricCards = [
  { label: '覆盖科室', value: '18', unit: '个', note: '本月 +2', tone: 'cyan', points: [8, 14, 13, 20, 24, 31, 38] },
  { label: '服务病种', value: '42', unit: '个', note: '本月 +5', tone: 'purple', points: [10, 12, 17, 15, 22, 25, 34] },
  { label: '在管术后患者', value: '3,862', unit: '人', note: '环比 +4.8%', tone: 'blue', points: [18, 22, 20, 28, 30, 37, 43] },
  { label: '今日服务触达', value: '1,248', unit: '次', note: '环比 +12.6%', tone: 'green', points: [12, 18, 23, 24, 30, 33, 45] },
  { label: '服务完成率', value: '78.4', unit: '%', note: '较上周 +3.2%', tone: 'orange', points: [20, 22, 25, 24, 29, 33, 37] },
  { label: '异常闭环率', value: '92.6', unit: '%', note: '高风险 31 人', tone: 'red', points: [28, 22, 24, 30, 27, 36, 42] }
]

const diseaseProfiles = {
  gastric: {
    name: '胃癌术后', stage: '胃癌术后 · 术后 1—3 月', count: 426,
    tags: ['普外科', '肿瘤科', '高活跃病种'], patients: '426 人', complete: '84.2%', touch: '1,268 次', warning: '18 人',
    paths: [['体重管理', '饮食分析', '肿瘤标志物'], ['肝功能/白蛋白营养', '电话回访', '']]
  },
  colorectal: {
    name: '肠癌术后', stage: '肠癌术后 · 术后 1—6 月', count: 318,
    tags: ['普外科', '肿瘤科', '稳定随访'], patients: '318 人', complete: '86.8%', touch: '986 次', warning: '12 人',
    paths: [['饮食分析', '运动分析', '肠镜复查'], ['血常规', '电话回访', '']]
  },
  lung: {
    name: '肺癌术后', stage: '肺癌术后 · 术后 1—3 月', count: 256,
    tags: ['胸外科', '肿瘤科', '呼吸训练'], patients: '256 人', complete: '81.5%', touch: '792 次', warning: '15 人',
    paths: [['运动分析', '睡眠分析', '肺功能'], ['血氧监测', '人工客服', '']]
  }
}

const currentDisease = ref('gastric')
const focusInfo = computed(() => diseaseProfiles[currentDisease.value])

const alerts = [
  { icon: '营', title: '营养风险', desc: '白蛋白偏低 / 体重持续下降', count: '18 人', level: 'orange' },
  { icon: '重', title: '体重下降', desc: '7日体重降幅超过 5%', count: '12 人', level: 'orange' },
  { icon: '检', title: '指标异常', desc: '肿瘤标志物 / 血常规', count: '9 人', level: 'red' }
]

const activityRows = [
  { name: '体重管理', value: 92 },
  { name: '饮食分析', value: 86 },
  { name: '血常规', value: 83 },
  { name: '血糖 / 血压', value: 78 },
  { name: '运动分析', value: 72 },
  { name: '肝功能营养', value: 69 },
  { name: '睡眠分析', value: 64 },
  { name: '肿瘤标志物', value: 58 }
]

const eventTemplates = [
  { time: '16:57:24', source: '普外科', text: '新增术后入组患者 3 人，已推送胃癌术后服务包。' },
  { time: '16:57:15', source: '肿瘤标志物', text: '发现指标异常 2 人，已转入人工客服干预。', type: 'warning' },
  { time: '16:56:58', source: '营养评估', text: '白蛋白营养随访完成 18 人次，异常闭环率 92.6%。' },
  { time: '16:56:31', source: '电话回访', text: '术后第 7 日回访完成 26 人次，未接通 4 人已自动重排。' },
  { time: '16:56:02', source: '体重管理', text: '同步智能体重秤数据 43 条，识别持续下降患者 2 人。' },
  { time: '16:55:44', source: '健康宣教', text: '饮食分析课程触达 318 人，完成阅读 276 人。' }
]

const eventLogs = ref(eventTemplates.map((item) => ({ ...item })))

const graphLegend = [
  { label: '科室 18', kind: 'department' },
  { label: '病种 42', kind: 'disease' },
  { label: '服务 12', kind: 'service' },
  { label: '指标 9', kind: 'indicator' },
  { label: '异常 31', kind: 'abnormal' }
]

const graphNodeData = [
  { id: 'center', name: '健康服务包', kind: 'center', x: 500, y: 330, symbolSize: 88, detail: '术后全周期管理中枢' },
  { id: 'gastric', name: '胃癌术后', kind: 'disease', disease: 'gastric', x: 350, y: 230, symbolSize: 66, detail: '在管 426 人 · 完成率 84.2%' },
  { id: 'colorectal', name: '肠癌术后', kind: 'disease', disease: 'colorectal', x: 405, y: 215, symbolSize: 36, detail: '在管 318 人' },
  { id: 'hernia', name: '前列腺癌术后', kind: 'disease', x: 390, y: 305, symbolSize: 32, detail: '在管 176 人' },
  { id: 'prostate', name: '关节置换术后', kind: 'disease', x: 385, y: 405, symbolSize: 34, detail: '在管 203 人' },
  { id: 'lung', name: '肺癌术后', kind: 'disease', disease: 'lung', x: 360, y: 485, symbolSize: 38, detail: '在管 256 人' },
  { id: 'breast', name: '乳腺术后', kind: 'disease', x: 455, y: 525, symbolSize: 32, detail: '在管 188 人' },
  { id: 'general', name: '普外科', kind: 'department', x: 150, y: 170, symbolSize: 44, detail: '覆盖病种 11 个' },
  { id: 'orthopedics', name: '骨科', kind: 'department', x: 145, y: 325, symbolSize: 48, detail: '覆盖病种 6 个' },
  { id: 'oncology', name: '肿瘤科', kind: 'department', x: 160, y: 455, symbolSize: 50, detail: '覆盖病种 9 个' },
  { id: 'urology', name: '泌尿外科', kind: 'department', x: 170, y: 565, symbolSize: 36, detail: '覆盖病种 5 个' },
  { id: 'thoracic', name: '胸外科', kind: 'department', x: 330, y: 595, symbolSize: 34, detail: '覆盖病种 4 个' },
  { id: 'nutrition', name: '营养评估', kind: 'service', x: 610, y: 625, symbolSize: 48, detail: '评估 574 项' },
  { id: 'consult', name: '咨询服务', kind: 'service', x: 665, y: 175, symbolSize: 62, detail: '286 次' },
  { id: 'callback', name: '电话回访', kind: 'service', x: 730, y: 270, symbolSize: 50, detail: '174 次' },
  { id: 'lifestyle', name: '生活方式', kind: 'service', x: 690, y: 380, symbolSize: 60, detail: '1,828 项' },
  { id: 'vitals', name: '体征监测', kind: 'service', x: 725, y: 480, symbolSize: 48, detail: '700 项' },
  { id: 'lab', name: '实验室指标', kind: 'service', x: 690, y: 560, symbolSize: 54, detail: '574 项' },
  { id: 'smart-service', name: '智能客服', kind: 'indicator', x: 790, y: 78, symbolSize: 28, detail: '自动应答 236 次' },
  { id: 'manual-service', name: '人工客服', kind: 'indicator', x: 835, y: 155, symbolSize: 26, detail: '转接 58 次' },
  { id: 'mini-phone', name: '小程序电话', kind: 'indicator', x: 825, y: 255, symbolSize: 27, detail: '呼出 64 次' },
  { id: 'pc-phone', name: '电脑电话', kind: 'indicator', x: 835, y: 330, symbolSize: 25, detail: '呼出 49 次' },
  { id: 'weight', name: '体重管理', kind: 'indicator', x: 790, y: 355, symbolSize: 28, detail: '完成率 92%' },
  { id: 'diet', name: '饮食分析', kind: 'indicator', x: 820, y: 402, symbolSize: 26, detail: '完成率 86%' },
  { id: 'exercise', name: '运动分析', kind: 'indicator', x: 785, y: 452, symbolSize: 26, detail: '完成率 72%' },
  { id: 'sleep', name: '睡眠分析', kind: 'indicator', x: 825, y: 492, symbolSize: 25, detail: '完成率 64%' },
  { id: 'blood-pressure', name: '血糖/血压', kind: 'indicator', x: 790, y: 545, symbolSize: 26, detail: '采集 306 条' },
  { id: 'tumor-marker', name: '肿瘤标志物', kind: 'abnormal', x: 835, y: 565, symbolSize: 48, detail: '异常 9 人' },
  { id: 'routine-blood', name: '血常规', kind: 'indicator', x: 780, y: 612, symbolSize: 25, detail: '异常 5 人' },
  { id: 'liver-index', name: '肝功能', kind: 'indicator', x: 822, y: 618, symbolSize: 24, detail: '异常 7 人' }
]

const graphLinkData = [
  ['center', 'gastric', 'core'], ['center', 'colorectal', 'core'], ['center', 'hernia', 'core'],
  ['center', 'prostate', 'core'], ['center', 'lung', 'core'], ['center', 'breast', 'core'],
  ['center', 'consult', 'core'], ['center', 'callback', 'core'], ['center', 'lifestyle', 'core'],
  ['center', 'vitals', 'core'], ['center', 'lab', 'core'], ['center', 'nutrition', 'core'],
  ['gastric', 'general', 'focus'], ['gastric', 'oncology', 'focus'], ['gastric', 'consult', 'focus'],
  ['gastric', 'callback', 'focus'], ['gastric', 'lifestyle', 'focus'], ['gastric', 'lab', 'focus'],
  ['colorectal', 'general'], ['colorectal', 'oncology'], ['lung', 'thoracic'], ['lung', 'oncology'],
  ['prostate', 'orthopedics'], ['hernia', 'urology'], ['breast', 'oncology'],
  ['general', 'consult'], ['orthopedics', 'lifestyle'], ['oncology', 'lab'], ['urology', 'vitals'],
  ['consult', 'smart-service'], ['consult', 'manual-service'], ['callback', 'mini-phone'], ['callback', 'pc-phone'],
  ['lifestyle', 'weight'], ['lifestyle', 'diet'], ['lifestyle', 'exercise'], ['lifestyle', 'sleep'],
  ['vitals', 'blood-pressure'], ['lab', 'tumor-marker', 'warning'], ['lab', 'routine-blood'], ['lab', 'liver-index'],
  ['nutrition', 'tumor-marker', 'focus']
]

const trendDates = Array.from({ length: 30 }, (_, index) => {
  const date = new Date(2026, 8, 20 + index)
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
})

const serviceTouchData = [
  82, 96, 88, 104, 118, 112, 126, 138, 132, 146,
  158, 151, 166, 178, 171, 185, 196, 189, 204, 216,
  208, 226, 218, 236, 248, 239, 252, 268, 257, 286
]

const activePatientData = [
  71, 78, 74, 86, 94, 91, 103, 112, 108, 119,
  128, 121, 135, 144, 139, 151, 160, 155, 168, 177,
  171, 184, 179, 193, 202, 196, 208, 218, 211, 228
]

const tooltipBase = computed(() => ({
  backgroundColor: isLight.value ? 'rgba(255, 255, 255, 0.96)' : 'rgba(5, 24, 39, 0.94)',
  borderColor: isLight.value ? 'rgba(37, 99, 235, 0.28)' : 'rgba(61, 232, 220, 0.38)',
  borderWidth: 1,
  textStyle: { color: isLight.value ? '#1e3a5f' : '#d9fbff', fontSize: 12 },
  extraCssText: isLight.value
    ? 'box-shadow: 0 12px 30px rgba(37, 99, 235, 0.16); border-radius: 8px;'
    : 'box-shadow: 0 0 24px rgba(45, 220, 214, 0.18); border-radius: 8px;'
}))

const nodePalette = computed(() => isLight.value
  ? {
      center: { color: 'rgba(37, 99, 235, 0.76)', border: '#2563eb' },
      department: { color: 'rgba(14, 165, 233, 0.72)', border: '#0284c7' },
      disease: { color: 'rgba(124, 58, 237, 0.76)', border: '#7c3aed' },
      service: { color: 'rgba(6, 182, 212, 0.70)', border: '#0891b2' },
      indicator: { color: 'rgba(59, 130, 246, 0.70)', border: '#3b82f6' },
      abnormal: { color: 'rgba(239, 68, 68, 0.70)', border: '#ef4444' }
    }
  : {
      center: { color: 'rgba(38, 178, 190, 0.72)', border: '#8ff9ff' },
      department: { color: 'rgba(42, 116, 190, 0.62)', border: '#53b9ff' },
      disease: { color: 'rgba(109, 74, 168, 0.78)', border: '#b77cff' },
      service: { color: 'rgba(32, 139, 128, 0.72)', border: '#53f5cf' },
      indicator: { color: 'rgba(36, 104, 143, 0.78)', border: '#5db7e8' },
      abnormal: { color: 'rgba(171, 77, 65, 0.76)', border: '#ff8b6b' }
    })

const buildGraphLinks = () =>
  graphLinkData.map(([source, target, type]) => {
    const isFocus = type === 'focus'
    const isWarning = type === 'warning'
    const isCore = type === 'core'
    return {
      source,
      target,
      symbol: ['none', 'none'],
      lineStyle: {
        color: isWarning
          ? (isLight.value ? 'rgba(239, 68, 68, 0.78)' : 'rgba(255, 111, 91, 0.78)')
          : isFocus
            ? (isLight.value ? 'rgba(13, 148, 136, 0.75)' : 'rgba(91, 255, 235, 0.78)')
            : isCore
              ? (isLight.value ? 'rgba(37, 99, 235, 0.38)' : 'rgba(69, 220, 211, 0.48)')
              : (isLight.value ? 'rgba(59, 130, 246, 0.35)' : 'rgba(83, 154, 199, 0.42)'),
        width: isFocus ? 2.2 : isCore ? 1.6 : 1.2,
        type: isFocus || isWarning ? 'dashed' : 'solid',
        curveness: 0.12
      }
    }
  })

const buildGraphNodes = () =>
  graphNodeData.map((node) => {
    const selected = node.id === currentDisease.value
    const palette = nodePalette.value[node.kind]
    const showInside = node.kind === 'center' || node.kind === 'service' || selected ||
      (node.kind === 'abnormal' && node.symbolSize >= 44)
    const labelColor = showInside ? '#ffffff' : isLight.value ? '#0f2942' : '#e9fbff'

    let labelName = node.name
    if (node.kind === 'service') {
      const count = node.detail.replace(/[^\d,]/g, '')
      labelName = `${node.name}\n${count}`
    }
    if (selected) labelName = `${node.name}\n${focusInfo.value.count}`

    return {
      ...node,
      draggable: true,
      label: {
        show: true,
        color: labelColor,
        fontSize: selected || node.kind === 'center' ? 16 : node.symbolSize >= 48 ? 12 : 11,
        fontWeight: selected || node.kind === 'center' ? 700 : 500,
        lineHeight: 17,
        position: showInside ? 'inside' : 'right',
        formatter: labelName
      },
      itemStyle: {
        color: selected
          ? (isLight.value ? 'rgba(37, 99, 235, 0.92)' : 'rgba(132, 79, 220, 0.92)')
          : palette.color,
        borderColor: selected ? (isLight.value ? '#0891b2' : '#8ff9ff') : palette.border,
        borderWidth: selected ? 3 : 2,
        shadowBlur: selected ? 22 : 12,
        shadowColor: selected
          ? (isLight.value ? 'rgba(37, 99, 235, 0.35)' : 'rgba(95, 255, 238, 0.65)')
          : palette.border
      },
      emphasis: {
        scale: 1.08,
        itemStyle: {
          borderColor: isLight.value ? '#0f2942' : '#ffffff',
          shadowBlur: 24,
          shadowColor: '#8ff9ff'
        },
        label: { color: '#ffffff' }
      }
    }
  })

const initTrendChart = () => {
  trendChart = echarts.init(trendRef.value)
  const axisColor = isLight.value ? '#64748b' : '#789aaa'
  const markerBorder = isLight.value ? '#ffffff' : '#082f3c'
  const cyanAreaStart = isLight.value ? 'rgba(6, 182, 212, 0.20)' : 'rgba(51, 255, 218, 0.34)'
  const blueAreaStart = isLight.value ? 'rgba(37, 99, 235, 0.18)' : 'rgba(61, 126, 255, 0.20)'
  trendChart.setOption({
    grid: { left: 42, right: 18, top: 36, bottom: 34 },
    tooltip: { trigger: 'axis', ...tooltipBase.value },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 16,
      itemHeight: 4,
      textStyle: { color: isLight.value ? '#64748b' : '#7ca8b8', fontSize: 11 },
      data: ['服务触达', '活跃患者']
    },
    xAxis: {
      type: 'category',
      data: trendDates,
      boundaryGap: false,
      axisLine: { lineStyle: { color: isLight.value ? 'rgba(148, 163, 184, 0.45)' : 'rgba(88, 166, 184, 0.35)' } },
      axisTick: { show: false },
      axisLabel: { color: axisColor, fontSize: 11, interval: 4 }
    },
    yAxis: {
      type: 'value',
      min: 60,
      max: 300,
      interval: 60,
      axisLabel: { color: axisColor },
      splitLine: { lineStyle: { color: isLight.value ? 'rgba(148, 163, 184, 0.25)' : 'rgba(83, 157, 178, 0.18)', type: 'dashed' } }
    },
    series: [
      {
        name: '服务触达',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        data: serviceTouchData,
        lineStyle: { width: 3, color: '#45f4d2' },
        itemStyle: { color: isLight.value ? '#06b6d4' : '#68ffe1', borderColor: markerBorder, borderWidth: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: cyanAreaStart },
            { offset: 1, color: 'rgba(51, 255, 218, 0.02)' }
          ])
        }
      },
      {
        name: '活跃患者',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        data: activePatientData,
        lineStyle: { width: 3, color: '#4d8dff' },
        itemStyle: { color: isLight.value ? '#2563eb' : '#74a8ff', borderColor: markerBorder, borderWidth: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: blueAreaStart },
            { offset: 1, color: 'rgba(61, 126, 255, 0.02)' }
          ])
        }
      }
    ]
  })
}

const initActivityChart = () => {
  activityChart = echarts.init(activityRef.value)
  activityChart.setOption({
    grid: { left: 78, right: 42, top: 12, bottom: 18 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...tooltipBase.value },
    xAxis: {
      type: 'value',
      max: 100,
      splitLine: { show: false },
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: activityRows.map((item) => item.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: isLight.value ? '#475569' : '#91b4c2', fontSize: 12, margin: 12 }
    },
    series: [{
      type: 'bar',
      data: activityRows.map((item) => item.value),
      barWidth: 5,
      showBackground: true,
      backgroundStyle: { color: isLight.value ? 'rgba(148, 163, 184, 0.18)' : 'rgba(104, 163, 181, 0.18)', borderRadius: 8 },
      itemStyle: {
        borderRadius: 8,
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#4d8dff' },
          { offset: 1, color: '#45f4d2' }
        ])
      },
      label: {
        show: true,
        position: 'right',
        color: isLight.value ? '#1e3a5f' : '#d7f8ff',
        fontSize: 12,
        formatter: '{c}%'
      }
    }]
  })
}

const initGraphChart = () => {
  graphChart = echarts.init(graphRef.value)
  graphChart.setOption({
    animationDuration: 650,
    tooltip: {
      ...tooltipBase.value,
      formatter: (params) => {
        if (params.dataType === 'edge') {
          return `<b>服务关系</b><br/>${params.data.source} → ${params.data.target}`
        }
        const typeName = {
          center: '中枢节点',
          department: '科室节点',
          disease: '病种节点',
          service: '服务节点',
          indicator: '指标节点',
          abnormal: '异常节点'
        }[params.data.kind]
        return `<b>${params.data.name}</b><br/>类型：${typeName}<br/>${params.data.detail || ''}`
      }
    },
    series: [{
      type: 'graph',
      layout: 'none',
      coordinateSystem: null,
      roam: true,
      draggable: true,
      focusNodeAdjacency: true,
      scaleLimit: { min: 0.65, max: 1.8 },
      edgeSymbol: ['none', 'none'],
      data: buildGraphNodes(),
      links: buildGraphLinks(),
      lineStyle: { opacity: 1 },
      emphasis: {
        focus: 'adjacency',
        lineStyle: { width: 3, color: isLight.value ? '#0891b2' : '#74fff0' }
      },
      z: 2
    }]
  })

  graphChart.on('click', (params) => {
    if (params.dataType !== 'node' || !params.data.disease) return
    currentDisease.value = params.data.disease
    graphChart.setOption({
      series: [{ data: buildGraphNodes(), links: buildGraphLinks() }]
    })
  })
}

const resizeCharts = () => {
  trendChart?.resize()
  activityChart?.resize()
  graphChart?.resize()
}

const appendEvent = () => {
  const now = new Date()
  const source = eventTemplates[Math.floor(Math.random() * eventTemplates.length)]
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
  eventLogs.value.unshift({ ...source, time })
  eventLogs.value = eventLogs.value.slice(0, 6)
}

const getSparkPoints = (points) => {
  const max = Math.max(...points)
  const min = Math.min(...points)
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100
      const y = 26 - ((point - min) / (max - min || 1)) * 20
      return `${x},${y}`
    })
    .join(' ')
}

onMounted(() => {
  initCharts()
  window.addEventListener('resize', resizeCharts)
  eventTimer = window.setInterval(appendEvent, 5000)
})

const disposeCharts = () => {
  trendChart?.dispose()
  activityChart?.dispose()
  graphChart?.dispose()
  trendChart = null
  activityChart = null
  graphChart = null
}

const initCharts = () => {
  initTrendChart()
  initActivityChart()
  initGraphChart()
}

const toggleTheme = async () => {
  themeMode.value = isLight.value ? 'dark' : 'light'
  await nextTick()
  disposeCharts()
  initCharts()
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  window.clearInterval(eventTimer)
  disposeCharts()
})
</script>

<template>
  <div class="data-overview-screen" :class="{ 'light-theme': isLight }">
    <header class="screen-header">
      <div class="brand-block">
        <div class="brand-icon">
          <el-icon><DataAnalysis /></el-icon>
        </div>
        <div>
          <h1>术后健康服务包运营驾驶舱</h1>
          <p>POST-OPERATIVE HEALTH SERVICE INTELLIGENCE</p>
        </div>
      </div>
      <div class="header-status">
        <button type="button" class="theme-toggle" @click="toggleTheme">
          {{ isLight ? '深色主题' : '浅色主题' }}
        </button>
        <span class="live-dot"></span>
        <strong>数据实时同步</strong>
        <span class="divider">|</span>
        <span>自动巡航周期 12s</span>
        <time>2026-10-19 16:57:28</time>
      </div>
    </header>

    <section class="metric-row">
      <article v-for="item in metricCards" :key="item.label" class="metric-card" :class="item.tone">
        <div class="metric-title">{{ item.label }}</div>
        <div class="metric-value">
          {{ item.value }}<small>{{ item.unit }}</small><span class="rise">↑</span>
        </div>
        <div class="metric-note">{{ item.note }}</div>
        <svg class="metric-spark" viewBox="0 0 100 28" preserveAspectRatio="none">
          <polyline :points="getSparkPoints(item.points)" />
        </svg>
      </article>
    </section>

    <main class="screen-main">
      <aside class="left-column">
        <section class="screen-panel trend-panel">
          <div class="panel-title">
            <span class="title-mark"></span>
            <div>
              <h2>30日服务规模趋势</h2>
              <strong>12,860<em>本期触达</em></strong>
            </div>
            <span class="panel-unit">单位：人次</span>
          </div>
          <div ref="trendRef" class="trend-chart"></div>
        </section>

        <section class="screen-panel activity-panel">
          <div class="panel-title compact">
            <span class="title-mark"></span>
            <h2>小程序服务项目活跃度</h2>
            <div class="activity-summary">
              <strong>78.4%</strong>
              <em>总体完成</em>
            </div>
          </div>
          <div ref="activityRef" class="activity-chart"></div>
        </section>
      </aside>

      <section class="center-column">
        <section class="screen-panel graph-panel">
          <div class="graph-header">
            <div class="panel-title compact">
              <span class="title-mark"></span>
              <div>
                <h2>健康服务知识图谱</h2>
                <p>科室・病种・服务・指标动态关系网络</p>
              </div>
            </div>
            <div class="graph-tools">
              <span class="focus-pill">
                <i class="pulse-dot"></i>
                聚焦态 · {{ focusInfo.name }}
              </span>
              <button type="button">全部</button>
              <button type="button">科室</button>
              <button type="button">病种</button>
              <button type="button">服务</button>
              <button type="button">指标</button>
            </div>
          </div>

          <div class="graph-stage">
            <div ref="graphRef" class="graph-chart"></div>
            <div class="graph-legend">
              <span v-for="item in graphLegend" :key="item.label" class="legend-item">
                <i :class="item.kind"></i>{{ item.label }}
              </span>
              <em>节点大小 = 服务患者数</em>
            </div>
          </div>
        </section>

        <section class="screen-panel event-panel">
          <div class="event-title">
            <span class="title-mark"></span>
            <h2>实时事件流 / LIVE EVENTS</h2>
          </div>
          <div class="event-list">
            <div v-for="(item, index) in eventLogs" :key="`${item.time}-${index}`" class="event-item">
              <time>{{ item.time }}</time>
              <strong :class="{ warning: item.type === 'warning' }">{{ item.source }}</strong>
              <span :class="{ warning: item.type === 'warning' }">{{ item.text }}</span>
            </div>
          </div>
        </section>
      </section>

      <aside class="right-column">
        <section class="screen-panel focus-panel">
          <div class="side-panel-head">
            <div class="panel-title compact">
              <span class="title-mark"></span>
              <h2>当前聚焦对象</h2>
            </div>
            <span>FOCUS NODE</span>
          </div>

          <div class="focus-stage">{{ focusInfo.stage }}</div>
          <div class="focus-main">
            <h3>{{ focusInfo.name }}</h3>
            <div class="focus-ring">{{ focusInfo.count }}</div>
          </div>

          <div class="focus-tags">
            <span v-for="tag in focusInfo.tags" :key="tag">{{ tag }}</span>
          </div>

          <div class="focus-metrics">
            <div>
              <label>在管患者</label>
              <strong>{{ focusInfo.patients }}</strong>
            </div>
            <div>
              <label>服务完成率</label>
              <strong>{{ focusInfo.complete }}</strong>
            </div>
            <div>
              <label>近7日服务</label>
              <strong>{{ focusInfo.touch }}</strong>
            </div>
            <div class="risk">
              <label>异常预警</label>
              <strong>{{ focusInfo.warning }}</strong>
            </div>
          </div>

          <div class="care-path-title">关联服务路径 / CARE PATH</div>
          <div v-for="(path, rowIndex) in focusInfo.paths" :key="rowIndex" class="care-path">
            <template v-for="(step, index) in path.filter(Boolean)" :key="step">
              <span>{{ step }}</span>
              <i v-if="index < path.filter(Boolean).length - 1">→</i>
            </template>
          </div>
        </section>

        <section class="screen-panel warning-panel">
          <div class="side-panel-head warning-head">
            <div class="panel-title compact">
              <span class="title-mark"></span>
              <h2>异常预警与闭环</h2>
            </div>
            <strong>31<em>待干预</em></strong>
          </div>

          <div class="warning-list">
            <article v-for="item in alerts" :key="item.title" class="warning-item">
              <div class="warning-icon" :class="item.level">{{ item.icon }}</div>
              <div class="warning-info">
                <h3>{{ item.title }}</h3>
                <p>{{ item.desc }}</p>
              </div>
              <strong>{{ item.count }}</strong>
            </article>
          </div>

          <div class="close-rate">
            <span>异常闭环率</span>
            <strong>92.6%</strong>
          </div>
          <div class="close-progress"><span></span></div>
        </section>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.data-overview-screen {
  min-width: 1280px;
  height: calc(100vh - 112px);
  min-height: 720px;
  padding: 14px;
  display: grid;
  grid-template-rows: 56px 112px minmax(0, 1fr);
  gap: 12px;
  overflow: auto;
  color: #dff9ff;
  background:
    radial-gradient(circle at 50% 0%, rgba(26, 115, 141, 0.22), transparent 42%),
    radial-gradient(circle at 12% 70%, rgba(30, 92, 148, 0.16), transparent 34%),
    linear-gradient(180deg, #071b2b 0%, #061725 100%);
  border: 1px solid rgba(73, 185, 207, 0.18);
  border-radius: 10px;
  box-shadow: inset 0 0 60px rgba(13, 148, 166, 0.08);
}

.screen-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #53f5d9;
  font-size: 23px;
  background: rgba(25, 126, 144, 0.18);
  border: 1px solid rgba(83, 245, 217, 0.55);
  box-shadow: 0 0 18px rgba(83, 245, 217, 0.25);
}

.brand-block h1 {
  margin: 0;
  font-size: 25px;
  line-height: 1.15;
  font-weight: 750;
  letter-spacing: 1px;
  color: #d7fbff;
  text-shadow: 0 0 18px rgba(91, 220, 255, 0.38);
}

.brand-block p {
  margin: 3px 0 0;
  font-size: 10px;
  letter-spacing: 2.6px;
  color: rgba(116, 164, 184, 0.82);
}

.header-status {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #8fb2c0;
  font-size: 13px;
  white-space: nowrap;
}

.header-status strong {
  color: #76f7e4;
  font-weight: 600;
}

.header-status .divider {
  color: rgba(128, 178, 194, 0.35);
}

.header-status time {
  color: #d6f7ff;
  margin-left: 4px;
}

.theme-toggle {
  height: 28px;
  padding: 0 12px;
  color: #b9f7ff;
  font-size: 12px;
  cursor: pointer;
  border-radius: 14px;
  border: 1px solid rgba(83, 245, 217, 0.34);
  background: rgba(25, 126, 144, 0.18);
}

.theme-toggle:hover {
  background: rgba(83, 245, 217, 0.18);
}

.live-dot,
.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #53f5d9;
  box-shadow: 0 0 10px #53f5d9;
}

.metric-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  min-height: 0;
}

.metric-card,
.screen-panel {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(13, 50, 73, 0.92), rgba(8, 31, 49, 0.92));
  border: 1px solid rgba(72, 158, 184, 0.22);
  box-shadow: inset 0 0 28px rgba(31, 153, 181, 0.06), 0 8px 24px rgba(0, 0, 0, 0.18);
  border-radius: 8px;
}

.metric-card::before,
.screen-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-top: 1px solid rgba(128, 245, 255, 0.12);
}

.metric-card {
  padding: 15px 16px 12px;
}

.metric-card::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #45f4d2;
  box-shadow: 0 0 12px currentColor;
}

.metric-card.purple::after { background: #a779ff; }
.metric-card.blue::after { background: #4d8dff; }
.metric-card.green::after { background: #45f4d2; }
.metric-card.orange::after { background: #f5a448; }
.metric-card.red::after { background: #f87162; }

.metric-title {
  color: #83a9b8;
  font-size: 13px;
}

.metric-value {
  margin-top: 5px;
  color: #e8fbff;
  font-size: 34px;
  line-height: 1;
  font-weight: 760;
  letter-spacing: -0.8px;
}

.metric-value small {
  margin-left: 3px;
  font-size: 12px;
  font-weight: 400;
  color: #83a9b8;
}

.metric-value .rise {
  margin-left: 3px;
  font-size: 17px;
  font-weight: 500;
  color: #8ab0bd;
  vertical-align: top;
}

.metric-note {
  margin-top: 8px;
  font-size: 12px;
  color: #45f4d2;
}

.metric-card.purple .metric-note { color: #b790ff; }
.metric-card.blue .metric-note { color: #66a6ff; }
.metric-card.orange .metric-note { color: #ffbd6a; }
.metric-card.red .metric-note { color: #ff9287; }

.metric-spark {
  position: absolute;
  right: 12px;
  bottom: 17px;
  width: 72px;
  height: 28px;
}

.metric-spark polyline {
  fill: none;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.metric-card.cyan .metric-spark polyline,
.metric-card.green .metric-spark polyline { stroke: #45f4d2; }
.metric-card.purple .metric-spark polyline { stroke: #a779ff; }
.metric-card.blue .metric-spark polyline { stroke: #4d8dff; }
.metric-card.orange .metric-spark polyline { stroke: #f5a448; }
.metric-card.red .metric-spark polyline { stroke: #f87162; }

.screen-main {
  min-height: 0;
  display: grid;
  grid-template-columns: 370px minmax(0, 1fr) 370px;
  gap: 12px;
}

.left-column,
.center-column,
.right-column {
  min-height: 0;
  display: grid;
  gap: 12px;
}

.left-column {
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
}

.center-column {
  grid-template-rows: minmax(0, 1fr) 160px;
}

.right-column {
  grid-template-rows: minmax(0, 1.08fr) minmax(0, 0.92fr);
}

.screen-panel {
  padding: 14px 16px;
}

.panel-title {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-mark {
  width: 4px;
  height: 17px;
  flex: 0 0 auto;
  border-radius: 3px;
  background: linear-gradient(180deg, #6ffff0, #2ca7c1);
  box-shadow: 0 0 10px rgba(81, 245, 217, 0.6);
}

.panel-title h2 {
  margin: 0;
  color: #e8fbff;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
}

.panel-title p {
  margin: 3px 0 0;
  color: #7194a4;
  font-size: 11px;
  letter-spacing: 1px;
}

.panel-title strong {
  display: block;
  margin-top: 8px;
  font-size: 27px;
  color: #f0fcff;
  line-height: 1;
}

.panel-title strong em {
  margin-left: 9px;
  font-style: normal;
  font-size: 12px;
  font-weight: 400;
  color: #779bad;
}

.panel-unit {
  margin-left: auto;
  color: #66899a;
  font-size: 11px;
}

.trend-chart {
  position: relative;
  z-index: 1;
  width: 100%;
  height: calc(100% - 70px);
  margin-top: 6px;
}

.activity-summary {
  margin-left: auto;
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.activity-summary strong {
  color: #53f5d9;
  font-size: 19px;
}

.activity-summary em {
  font-style: normal;
  font-size: 11px;
  color: #789dac;
}

.activity-chart {
  position: relative;
  z-index: 1;
  width: 100%;
  height: calc(100% - 38px);
}

.graph-panel {
  padding: 12px 14px 10px;
}

.graph-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.graph-tools {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.focus-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 5px;
  color: #7dfceb;
  font-size: 11px;
  background: rgba(30, 124, 132, 0.24);
  border: 1px solid rgba(83, 245, 217, 0.3);
}

.graph-tools button {
  height: 24px;
  padding: 0 10px;
  color: #82a9b9;
  font-size: 11px;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid rgba(93, 148, 170, 0.28);
  background: rgba(15, 50, 72, 0.72);
}

.graph-tools button:first-of-type {
  color: #7dfceb;
  border-color: rgba(83, 245, 217, 0.45);
  background: rgba(37, 126, 132, 0.24);
}

.graph-stage {
  position: relative;
  z-index: 1;
  height: calc(100% - 44px);
}

.graph-chart {
  width: 100%;
  height: 100%;
}

.graph-legend {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 390px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  border: 1px solid rgba(83, 153, 179, 0.18);
  border-radius: 7px;
  background: rgba(5, 25, 40, 0.72);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #91b4c2;
  font-size: 11px;
}

.legend-item i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.legend-item .department { background: #53b9ff; }
.legend-item .disease { background: #b77cff; }
.legend-item .service { background: #53f5cf; }
.legend-item .indicator { background: #5db7e8; }
.legend-item .abnormal { background: #ff8b6b; }

.graph-legend em {
  flex-basis: 100%;
  color: #658797;
  font-size: 10px;
  font-style: normal;
}

.event-panel {
  padding: 12px 16px;
}

.event-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.event-title h2 {
  margin: 0;
  color: #d9f7ff;
  font-size: 13px;
}

.event-list {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 8px;
}

.event-item {
  display: grid;
  grid-template-columns: 70px 74px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-width: 0;
  padding: 7px 10px;
  border-radius: 5px;
  background: rgba(13, 46, 67, 0.62);
  border: 1px solid rgba(70, 145, 172, 0.13);
  font-size: 11px;
}

.event-item time {
  color: #7096a6;
}

.event-item strong {
  color: #83c9e8;
  font-weight: 600;
}

.event-item span {
  color: #9fd0dc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-item strong.warning,
.event-item span.warning {
  color: #ff8b6b;
}

.side-panel-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.side-panel-head > span {
  color: #587d8e;
  font-size: 11px;
  letter-spacing: 1px;
}

.focus-stage {
  position: relative;
  z-index: 1;
  margin-top: 18px;
  color: #6f96a7;
  font-size: 12px;
}

.focus-main {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.focus-main h3 {
  margin: 0;
  color: #effdff;
  font-size: 28px;
  font-weight: 750;
}

.focus-ring {
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #78fcec;
  font-size: 22px;
  font-weight: 750;
  background: radial-gradient(circle, rgba(35, 120, 136, 0.35), rgba(35, 120, 136, 0.05));
  border: 2px solid rgba(83, 245, 217, 0.28);
  box-shadow: 0 0 22px rgba(83, 245, 217, 0.16), inset 0 0 18px rgba(83, 245, 217, 0.12);
}

.focus-tags {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 14px;
}

.focus-tags span {
  padding: 4px 8px;
  border-radius: 4px;
  color: #62f0d8;
  font-size: 11px;
  background: rgba(32, 112, 121, 0.22);
  border: 1px solid rgba(83, 245, 217, 0.22);
}

.focus-metrics {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.focus-metrics div {
  padding: 12px;
  border-radius: 6px;
  background: rgba(13, 46, 67, 0.58);
  border: 1px solid rgba(70, 145, 172, 0.15);
}

.focus-metrics label {
  display: block;
  color: #66899a;
  font-size: 11px;
}

.focus-metrics strong {
  display: block;
  margin-top: 7px;
  color: #e6fbff;
  font-size: 22px;
  line-height: 1;
}

.focus-metrics .risk strong {
  color: #ff9a72;
}

.care-path-title {
  position: relative;
  z-index: 1;
  margin-top: 16px;
  color: #6f96a7;
  font-size: 11px;
}

.care-path {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 8px;
}

.care-path span {
  padding: 5px 8px;
  color: #a9d7e3;
  font-size: 11px;
  border-radius: 4px;
  background: rgba(15, 56, 78, 0.72);
  border: 1px solid rgba(74, 145, 169, 0.2);
}

.care-path i {
  color: #54e6d2;
  font-style: normal;
}

.warning-head strong {
  color: #ffab76;
  font-size: 22px;
}

.warning-head em {
  margin-left: 4px;
  color: #789dac;
  font-size: 11px;
  font-style: normal;
}

.warning-list {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.warning-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 11px;
  border-radius: 6px;
  background: rgba(13, 46, 67, 0.55);
  border: 1px solid rgba(70, 145, 172, 0.13);
}

.warning-icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  color: #ffb183;
  font-size: 13px;
  background: rgba(245, 139, 72, 0.16);
  border: 1px solid rgba(245, 139, 72, 0.28);
}

.warning-icon.red {
  color: #ff8c7d;
  background: rgba(239, 83, 80, 0.15);
  border-color: rgba(239, 83, 80, 0.32);
}

.warning-info h3 {
  margin: 0;
  color: #dff7ff;
  font-size: 13px;
}

.warning-info p {
  margin: 5px 0 0;
  color: #6f95a5;
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.warning-item > strong {
  color: #ffab76;
  font-size: 18px;
}

.close-rate {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  color: #86aabc;
  font-size: 12px;
}

.close-rate strong {
  color: #66f2d7;
  font-size: 18px;
}

.close-progress {
  position: relative;
  z-index: 1;
  height: 4px;
  margin-top: 9px;
  border-radius: 999px;
  background: rgba(70, 139, 164, 0.24);
  overflow: hidden;
}

.close-progress span {
  display: block;
  width: 92.6%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #4d8dff, #45f4d2);
  box-shadow: 0 0 12px rgba(69, 244, 210, 0.5);
}

.data-overview-screen.light-theme {
  color: #0f2b46;
  background:
    radial-gradient(circle at 50% -10%, rgba(37, 99, 235, 0.12), transparent 42%),
    radial-gradient(circle at 8% 72%, rgba(6, 182, 212, 0.10), transparent 32%),
    linear-gradient(180deg, #edf5ff 0%, #f7fbff 100%);
  border-color: rgba(37, 99, 235, 0.18);
  box-shadow: inset 0 0 60px rgba(37, 99, 235, 0.06);
}

.light-theme .brand-icon {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.10);
  border-color: rgba(37, 99, 235, 0.28);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.14);
}

.light-theme .brand-block h1 {
  color: #0f2b46;
  text-shadow: none;
}

.light-theme .brand-block p {
  color: #64748b;
}

.light-theme .header-status {
  color: #64748b;
}

.light-theme .header-status strong {
  color: #2563eb;
}

.light-theme .header-status .divider {
  color: rgba(100, 116, 139, 0.35);
}

.light-theme .header-status time {
  color: #1e3a5f;
}

.light-theme .theme-toggle {
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.24);
  background: rgba(37, 99, 235, 0.08);
}

.light-theme .theme-toggle:hover {
  background: rgba(37, 99, 235, 0.14);
}

.light-theme .live-dot,
.light-theme .pulse-dot {
  background: #06b6d4;
  box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.12);
}

.light-theme .metric-card,
.light-theme .screen-panel {
  background: linear-gradient(180deg, #ffffff 0%, #f4f8ff 100%);
  border-color: rgba(37, 99, 235, 0.16);
  box-shadow: 0 10px 28px rgba(37, 99, 235, 0.08);
}

.light-theme .metric-card::before,
.light-theme .screen-panel::before {
  border-top-color: rgba(37, 99, 235, 0.10);
}

.light-theme .metric-card::after {
  width: 3px;
  box-shadow: none;
}

.light-theme .metric-card.cyan::after,
.light-theme .metric-card.green::after { background: #06b6d4; }
.light-theme .metric-card.purple::after { background: #7c3aed; }
.light-theme .metric-card.blue::after { background: #2563eb; }
.light-theme .metric-card.orange::after { background: #d97706; }
.light-theme .metric-card.red::after { background: #ef4444; }

.light-theme .metric-title,
.light-theme .metric-value small,
.light-theme .metric-value .rise {
  color: #64748b;
}

.light-theme .metric-value {
  color: #0f2942;
}

.light-theme .metric-note,
.light-theme .metric-card.cyan .metric-note,
.light-theme .metric-card.green .metric-note {
  color: #0891b2;
}

.light-theme .metric-card.purple .metric-note { color: #7c3aed; }
.light-theme .metric-card.blue .metric-note { color: #2563eb; }
.light-theme .metric-card.orange .metric-note { color: #d97706; }
.light-theme .metric-card.red .metric-note { color: #dc2626; }

.light-theme .metric-card.cyan .metric-spark polyline,
.light-theme .metric-card.green .metric-spark polyline { stroke: #0891b2; }
.light-theme .metric-card.purple .metric-spark polyline { stroke: #7c3aed; }
.light-theme .metric-card.blue .metric-spark polyline { stroke: #2563eb; }
.light-theme .metric-card.orange .metric-spark polyline { stroke: #d97706; }
.light-theme .metric-card.red .metric-spark polyline { stroke: #ef4444; }

.light-theme .title-mark {
  background: linear-gradient(180deg, #2563eb, #06b6d4);
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.18);
}

.light-theme .panel-title h2,
.light-theme .event-title h2 {
  color: #0f2942;
}

.light-theme .panel-title p,
.light-theme .panel-title strong em,
.light-theme .panel-unit,
.light-theme .activity-summary em,
.light-theme .side-panel-head > span {
  color: #64748b;
}

.light-theme .panel-title strong {
  color: #1e3a5f;
}

.light-theme .activity-summary strong {
  color: #0891b2;
}

.light-theme .focus-pill {
  color: #076f8a;
  background: rgba(6, 182, 212, 0.10);
  border-color: rgba(6, 182, 212, 0.24);
}

.light-theme .graph-tools button {
  color: #475569;
  border-color: rgba(148, 163, 184, 0.35);
  background: #f8fbff;
}

.light-theme .graph-tools button:first-of-type {
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.30);
  background: rgba(37, 99, 235, 0.08);
}

.light-theme .graph-legend {
  border-color: rgba(148, 163, 184, 0.26);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 8px 20px rgba(15, 43, 70, 0.08);
}

.light-theme .legend-item {
  color: #475569;
}

.light-theme .legend-item .department { background: #0284c7; }
.light-theme .legend-item .disease { background: #7c3aed; }
.light-theme .legend-item .service { background: #0891b2; }
.light-theme .legend-item .indicator { background: #2563eb; }
.light-theme .legend-item .abnormal { background: #ef4444; }

.light-theme .graph-legend em {
  color: #64748b;
}

.light-theme .event-item,
.light-theme .focus-metrics div,
.light-theme .care-path span,
.light-theme .warning-item {
  background: #f8fbff;
  border-color: rgba(148, 163, 184, 0.24);
}

.light-theme .event-item time {
  color: #64748b;
}

.light-theme .event-item strong {
  color: #2563eb;
}

.light-theme .event-item span {
  color: #334155;
}

.light-theme .event-item strong.warning,
.light-theme .event-item span.warning {
  color: #dc2626;
}

.light-theme .focus-stage,
.light-theme .care-path-title,
.light-theme .close-rate {
  color: #64748b;
}

.light-theme .focus-main h3 {
  color: #0f2942;
}

.light-theme .focus-ring {
  color: #2563eb;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.14), rgba(37, 99, 235, 0.03));
  border-color: rgba(37, 99, 235, 0.28);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.12), inset 0 0 18px rgba(6, 182, 212, 0.10);
}

.light-theme .focus-tags span {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
  border-color: rgba(37, 99, 235, 0.18);
}

.light-theme .focus-metrics label {
  color: #64748b;
}

.light-theme .focus-metrics strong {
  color: #1e3a5f;
}

.light-theme .focus-metrics .risk strong {
  color: #dc2626;
}

.light-theme .care-path span {
  color: #334155;
}

.light-theme .care-path i {
  color: #0891b2;
}

.light-theme .warning-head strong,
.light-theme .warning-item > strong {
  color: #d97706;
}

.light-theme .warning-head em {
  color: #64748b;
}

.light-theme .warning-icon {
  color: #d97706;
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.24);
}

.light-theme .warning-icon.red {
  color: #dc2626;
  background: rgba(239, 68, 68, 0.10);
  border-color: rgba(239, 68, 68, 0.22);
}

.light-theme .warning-info h3 {
  color: #1e3a5f;
}

.light-theme .warning-info p {
  color: #64748b;
}

.light-theme .close-rate strong {
  color: #2563eb;
}

.light-theme .close-progress {
  background: rgba(148, 163, 184, 0.22);
}

.light-theme .close-progress span {
  background: linear-gradient(90deg, #2563eb, #06b6d4);
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.20);
}

@media (max-width: 1500px) {
  .data-overview-screen {
    min-width: 1280px;
  }

  .screen-main {
    grid-template-columns: 320px minmax(0, 1fr) 320px;
  }

  .metric-value {
    font-size: 29px;
  }
}
</style>

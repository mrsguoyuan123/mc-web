import { computed, ref, watch } from 'vue'

// 通用前端分页：传入 ref/computed 或普通数组，返回分页状态与切片数据
export function useTablePage(list, defaultSize = 10) {
  const page = ref(1)
  const pageSize = ref(defaultSize)
  const getList = () => (Array.isArray(list) ? list : list.value)
  const total = computed(() => getList().length)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
  const pagedData = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return getList().slice(start, start + pageSize.value)
  })
  // 数据/筛选变化后，页码超界时回到第 1 页
  watch(total, () => {
    if (page.value > totalPages.value) page.value = 1
  })
  const resetPage = () => { page.value = 1 }
  return { page, pageSize, total, totalPages, pagedData, resetPage }
}
<script setup>
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getStaffPage, batchAssignPatientsCs } from '../../../api/index.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 勾选患者 ID 集合（雪花 ID 字符串）
  ids: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'saved'])

const formRef = ref(null)
const submitting = ref(false)
// 客服人员选项：来自员工接口 personType=CS；接口未就绪/失败时为空数组
const csOptions = ref([])
const optionsLoading = ref(false)

const form = reactive({ csId: '' })

const rules = {
  csId: [{ required: true, message: '请选择客服人员', trigger: 'change' }]
}

const fetchCsOptions = async () => {
  optionsLoading.value = true
  try {
    const res = await getStaffPage({ personType: 'CS', status: 1, page: 1, pageSize: 100 })
    csOptions.value = Array.isArray(res?.list) ? res.list : []
  } catch {
    // 客服人员接口未就绪时选项为空数组，下拉展示空状态
    csOptions.value = []
  } finally {
    optionsLoading.value = false
  }
}

watch(
  () => props.visible,
  (open) => {
    if (open) {
      form.csId = ''
      formRef.value?.clearValidate?.()
      fetchCsOptions()
    }
  }
)

const handleClose = () => {
  if (submitting.value) return
  emit('close')
}

const handleSubmit = async () => {
  await formRef.value.validate()
  if (!props.ids.length) {
    ElMessage.warning('请先勾选用户')
    return
  }
  submitting.value = true
  try {
    // 批量分配接口路径待后端补，当前占位函数直接 resolve，页面按成功流程处理
    await batchAssignPatientsCs({
      patientIds: props.ids.map((id) => String(id)),
      csId: String(form.csId)
    })
    ElMessage.success('客服分配成功')
    emit('saved')
  } catch (err) {
    ElMessage.error(err?.message || '分配失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="批量分配客服"
    width="460px"
    :close-on-click-modal="false"
    append-to-body
    @close="handleClose"
  >
    <p class="assign-desc">将为已选择的 {{ ids.length }} 位用户指定同一位服务客服。</p>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-form-item label="服务客服" required>
        <el-select
          v-model="form.csId"
          class="full-width"
          filterable
          :loading="optionsLoading"
          placeholder="请选择客服人员"
        >
          <el-option
            v-for="item in csOptions"
            :key="String(item.id)"
            :label="item.name || item.username || `客服 ${item.id}`"
            :value="String(item.id)"
          />
          <template #empty>
            <span class="empty-tip">暂无可选客服人员</span>
          </template>
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确认分配</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.assign-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: #6b7280;
}

.full-width {
  width: 100%;
}

.empty-tip {
  font-size: 13px;
  color: #9ca3af;
}
</style>

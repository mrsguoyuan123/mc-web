/**
 * 文件存储模块接口（api/swagger.json 中 tag = file 的全部接口，共 3 个）
 *
 * 基于 ../frontApikit.js 的 http 封装：
 * - 统一 resolve 响应体中的 data；HTTP 状态恒为 200，业务 code 非 0 时封装层抛 ApiError
 * - 上传走 multipart/form-data，内部用 FormData 包装，封装层自动处理 boundary 与 Content-Type
 * - 本模块参数为目录名 / 文件名（白名单字符串），不含雪花 ID；路径参数仍统一 encodeURIComponent 编码，避免特殊字符破坏 URL
 * - 两个上传接口需登录（JWT，封装层自动注入 Bearer token）；本地读取接口匿名可访问，显式 { skipAuth: true }
 * - 当前为本地存储实现，COS 对象存储为 TODO；单文件 ≤ 20MB
 *
 * 目录白名单 dir：common 通用 / meal 餐食 / diet 饮食 / medical 医疗 / avatar 头像 /
 *   checkin 打卡 / attachment 附件 / chat 聊天
 */

import { http } from '../frontApikit.js'

/**
 * 上传单个文件（JWT 接口，multipart/form-data；图片/文档，≤20MB；当前落本地存储，COS 为 TODO）
 * 路径：POST /files/upload
 * @param {File|Blob} file 文件对象（必填，表单字段名 file）；
 *   允许类型 jpg/jpeg/png/gif/webp/pdf/doc/docx/xls/xlsx
 * @param {string} [dir] 存储目录（表单字段 dir），白名单：common/meal/diet/medical/avatar/checkin/attachment/chat；不传用服务端默认目录
 * @returns {Promise<string>} 上传后的文件访问 URL 字符串
 */
export function uploadFile(file, dir) {
  const formData = new FormData()
  formData.append('file', file)
  if (dir !== undefined && dir !== null && dir !== '') formData.append('dir', dir)
  return http.post('/files/upload', formData)
}

/**
 * 批量上传文件（JWT 接口，multipart/form-data；如其他指标的最多 5 个附件等场景）
 * 路径：POST /files/uploads
 * @param {Array<File|Blob>} files 文件对象数组（必填，重复以表单字段名 files 提交）
 * @param {string} [dir] 存储目录（表单字段 dir），白名单同 uploadFile；不传用服务端默认目录
 * @returns {Promise<Array<string>>} 每个文件对应的访问 URL 字符串数组，顺序与入参 files 一致
 */
export function uploadFiles(files, dir) {
  const formData = new FormData()
  for (const file of files || []) formData.append('files', file)
  if (dir !== undefined && dir !== null && dir !== '') formData.append('dir', dir)
  return http.post('/files/uploads', formData)
}

/**
 * 读取本地存储文件（公开/匿名接口，开发用，不注入 Authorization）
 * 路径：GET /files/{dir}/{filename}
 * @param {string} dir 目录（必填，路径参数，白名单：common/meal/diet/medical/avatar/checkin/attachment/chat）
 * @param {string} filename 文件名（必填，路径参数，含扩展名）
 * @returns {Promise<string>} 文件资源内容/访问结果（swagger 标注为 string；非 JSON 响应时封装层原样返回原始 Response）
 */
export function getLocalFile(dir, filename) {
  return http.get(
    `/files/${encodeURIComponent(String(dir))}/${encodeURIComponent(String(filename))}`,
    undefined,
    { skipAuth: true }
  )
}

export default {
  uploadFile,
  uploadFiles,
  getLocalFile
}

/**
 * 底层请求封装（原生 fetch，零第三方依赖）
 *
 * - 手写 JSON 解析器：超出 JS 安全整数范围的长数字（如雪花 ID）自动转为字符串
 * - token / refreshToken 存取与请求头自动注入
 * - 业务 code 分流：0 成功 / 400 业务错误 / 401 静默 refresh 后重试一次 / 402 清凭证跳登录 / 403 / 500
 * - 并发 401 共享同一个 refresh 请求，避免刷新互踩
 *
 * 仅提供底层 request / http 方法，不包含任何业务接口。
 */

const TOKEN_KEY = 'weijun-admin-token'
const REFRESH_TOKEN_KEY = 'weijun-admin-refresh-token'
const REFRESH_PATH = '/auth/refresh'
const LOGIN_PATH = '/login'
const SUCCESS_CODE = 0
const UNAUTHORIZED_CODE = 401
const REFRESH_INVALID_CODE = 402

// 业务错误统一上报钩子（由入口注入 Element Plus 消息，保持本封装零 UI 耦合）；401/402 走刷新/跳登录，不重复提示
let businessErrorHandler = null
export const setBusinessErrorHandler = (handler) => {
  businessErrorHandler = typeof handler === 'function' ? handler : null
}
const reportBusinessError = (error) => {
  if (typeof businessErrorHandler === 'function') businessErrorHandler(error)
}

export const BASE_URL = (import.meta.env && import.meta.env.VITE_API_BASE_URL) || '/api/v1'
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER // 9007199254740991（16 位）
const MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER

/* -------------------------------------------------------------------------- */
/*  token 存取                                                                */
/* -------------------------------------------------------------------------- */

export const tokenStore = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || ''
  },
  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || ''
  },
  setTokens(token, refreshToken) {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

/* -------------------------------------------------------------------------- */
/*  手写 JSON 解析：把超长整数（雪花 ID 等）解析为字符串                        */
/* -------------------------------------------------------------------------- */

const isDigit = (charCode) => charCode >= 48 && charCode <= 57 // '0'..'9'

class BigIntSafeParser {
  constructor(text) {
    this.text = text
    this.length = text.length
    this.index = 0
  }

  parse() {
    this.skipWhitespace()
    const value = this.parseValue()
    this.skipWhitespace()
    if (this.index !== this.length) {
      throw new SyntaxError(`Unexpected token at position ${this.index}`)
    }
    return value
  }

  skipWhitespace() {
    while (this.index < this.length) {
      const code = this.text.charCodeAt(this.index)
      if (code === 32 || code === 9 || code === 10 || code === 13) {
        this.index += 1
      } else {
        break
      }
    }
  }

  parseValue() {
    this.skipWhitespace()
    const code = this.text.charCodeAt(this.index)
    switch (code) {
      case 34: // "
        return this.parseString()
      case 123: // {
        return this.parseObject()
      case 91: // [
        return this.parseArray()
      case 116: // true
        return this.parseLiteral('true', true)
      case 102: // false
        return this.parseLiteral('false', false)
      case 110: // null
        return this.parseLiteral('null', null)
      default:
        return this.parseNumber()
    }
  }

  parseLiteral(literal, value) {
    if (this.text.startsWith(literal, this.index)) {
      this.index += literal.length
      return value
    }
    throw new SyntaxError(`Unexpected token at position ${this.index}`)
  }

  parseString() {
    this.index += 1 // 跳过开引号
    let result = ''
    while (this.index < this.length) {
      const char = this.text[this.index]
      if (char === '"') {
        this.index += 1
        return result
      }
      if (char === '\\') {
        result += this.parseEscape()
      } else {
        result += char
        this.index += 1
      }
    }
    throw new SyntaxError('Unterminated string')
  }

  parseEscape() {
    this.index += 1 // 跳过反斜杠
    const escaped = this.text[this.index]
    this.index += 1
    switch (escaped) {
      case '"':
      case '\\':
      case '/':
        return escaped
      case 'b':
        return '\b'
      case 'f':
        return '\f'
      case 'n':
        return '\n'
      case 'r':
        return '\r'
      case 't':
        return '\t'
      case 'u': {
        const hex = this.text.slice(this.index, this.index + 4)
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
          throw new SyntaxError(`Bad unicode escape at position ${this.index}`)
        }
        this.index += 4
        return String.fromCharCode(parseInt(hex, 16))
      }
      default:
        throw new SyntaxError(`Bad escape \\${escaped}`)
    }
  }

  parseNumber() {
    const start = this.index
    let code = this.text.charCodeAt(this.index)
    if (code === 45) this.index += 1 // 负号

    const digitStart = this.index
    while (this.index < this.length && isDigit(this.text.charCodeAt(this.index))) {
      this.index += 1
    }
    const integerDigits = this.index - digitStart

    let isFloat = false
    if (this.text.charCodeAt(this.index) === 46) { // 小数点
      isFloat = true
      this.index += 1
      while (this.index < this.length && isDigit(this.text.charCodeAt(this.index))) {
        this.index += 1
      }
    }
    code = this.text.charCodeAt(this.index)
    if (code === 101 || code === 69) { // 科学计数法 e/E
      isFloat = true
      this.index += 1
      code = this.text.charCodeAt(this.index)
      if (code === 43 || code === 45) this.index += 1
      while (this.index < this.length && isDigit(this.text.charCodeAt(this.index))) {
        this.index += 1
      }
    }

    const raw = this.text.slice(start, this.index)
    if (raw === '' || raw === '-') {
      throw new SyntaxError(`Unexpected token at position ${start}`)
    }

    // 纯整数且超出 JS 安全整数范围：保留原始文本转为字符串（雪花 ID 等场景）。
    // 15 位及以内必然安全；16 位需与 MAX_SAFE_INTEGER 精确比较（如 9007199254740991 仍安全）。
    if (!isFloat && integerDigits > MAX_SAFE_INTEGER.toString().length) {
      return raw
    }
    if (!isFloat && integerDigits === MAX_SAFE_INTEGER.toString().length) {
      const numeric = Number(raw)
      if (numeric > MAX_SAFE_INTEGER || numeric < MIN_SAFE_INTEGER) {
        return raw
      }
      return numeric
    }
    return Number(raw)
  }

  parseObject() {
    const object = {}
    this.index += 1 // 跳过 {
    this.skipWhitespace()
    if (this.text.charCodeAt(this.index) === 125) {
      this.index += 1
      return object
    }
    while (true) {
      this.skipWhitespace()
      if (this.text.charCodeAt(this.index) !== 34) {
        throw new SyntaxError(`Expected property name at position ${this.index}`)
      }
      const key = this.parseString()
      this.skipWhitespace()
      if (this.text.charCodeAt(this.index) !== 58) {
        throw new SyntaxError(`Expected ':' at position ${this.index}`)
      }
      this.index += 1
      object[key] = this.parseValue()
      this.skipWhitespace()
      const code = this.text.charCodeAt(this.index)
      if (code === 125) {
        this.index += 1
        return object
      }
      if (code !== 44) {
        throw new SyntaxError(`Expected ',' or '}' at position ${this.index}`)
      }
      this.index += 1
    }
  }

  parseArray() {
    const array = []
    this.index += 1 // 跳过 [
    this.skipWhitespace()
    if (this.text.charCodeAt(this.index) === 93) {
      this.index += 1
      return array
    }
    while (true) {
      array.push(this.parseValue())
      this.skipWhitespace()
      const code = this.text.charCodeAt(this.index)
      if (code === 93) {
        this.index += 1
        return array
      }
      if (code !== 44) {
        throw new SyntaxError(`Expected ',' or ']' at position ${this.index}`)
      }
      this.index += 1
    }
  }
}

/**
 * 解析 JSON：超出安全整数范围的长数字返回字符串，其余行为与 JSON.parse 一致。
 * @param {string} text
 * @returns {unknown}
 */
export function parseJsonBigSafe(text) {
  if (text === '' || text == null) return null
  return new BigIntSafeParser(text).parse()
}

/* -------------------------------------------------------------------------- */
/*  业务错误类型                                                               */
/* -------------------------------------------------------------------------- */

export class ApiError extends Error {
  constructor(message, code, data, response) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.data = data
    this.response = response
  }
}

/* -------------------------------------------------------------------------- */
/*  401 刷新：并发请求共享同一个 refresh Promise，加锁防互踩                    */
/* -------------------------------------------------------------------------- */

let refreshingPromise = null

async function refreshTokens() {
  const refreshToken = tokenStore.getRefreshToken()
  if (!refreshToken) {
    throw new ApiError('登录已失效，请重新登录', REFRESH_INVALID_CODE, null, null)
  }

  const response = await fetch(`${BASE_URL}${REFRESH_PATH}?refreshToken=${encodeURIComponent(refreshToken)}`, {
    method: 'POST',
    headers: { Accept: 'application/json' }
  })
  const body = await parseResponse(response)

  // 刷新接口同样走统一响应体：code !== 0 视为刷新失败（含 402）
  if (!body || typeof body !== 'object' || body.code !== SUCCESS_CODE || !body.data) {
    throw new ApiError((body && body.message) || '登录已失效，请重新登录', REFRESH_INVALID_CODE, null, response)
  }

  const data = body.data
  tokenStore.setTokens(data.token, data.refreshToken)
  return data
}

function handleSessionExpired() {
  tokenStore.clear()
  if (typeof window !== 'undefined' && window.location.pathname !== LOGIN_PATH) {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.assign(`${LOGIN_PATH}?redirect=${redirect}`)
  }
}

/* -------------------------------------------------------------------------- */
/*  响应读取与业务 code 分流                                                    */
/* -------------------------------------------------------------------------- */

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const text = await response.text()
    return text ? parseJsonBigSafe(text) : null
  }
  // 非 JSON 响应（文件流等）直接返回原始 Response，交由调用方处理
  return response
}

function resolveBusiness(body, response) {
  if (body == null || typeof body !== 'object' || !('code' in body)) {
    // 非统一响应体（如文件流）原样返回
    return body
  }
  if (body.code === SUCCESS_CODE) {
    return body.data
  }
  const businessError = new ApiError(body.message || '请求失败', body.code, body.data ?? null, response)
  if (body.code !== UNAUTHORIZED_CODE && body.code !== REFRESH_INVALID_CODE) {
    reportBusinessError(businessError)
  }
  throw businessError
}

/* -------------------------------------------------------------------------- */
/*  核心请求                                                                   */
/* -------------------------------------------------------------------------- */

function buildUrl(url, params) {
  const fullUrl = /^https?:\/\//.test(url) ? url : `${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
  if (!params) return fullUrl
  const search = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
  return search ? `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}${search}` : fullUrl
}

function buildHeaders(customHeaders, skipAuth) {
  const headers = new Headers(customHeaders)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  const token = tokenStore.getToken()
  if (!skipAuth && token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return headers
}

function buildBody(data, headers) {
  if (data === undefined || data === null) return undefined
  if (data instanceof FormData) {
    headers.delete('Content-Type') // 交给浏览器自动带 boundary
    return data
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json;charset=UTF-8')
  }
  return JSON.stringify(data)
}

/**
 * 统一请求方法。
 * @param {string} url 相对 BASE_URL 的路径或完整 http(s) 地址
 * @param {object} [options]
 * @param {'GET'|'POST'|'PUT'|'DELETE'|'PATCH'} [options.method='GET']
 * @param {object} [options.params] query 参数
 * @param {object|FormData} [options.data] 请求体（普通对象自动 JSON 序列化）
 * @param {object} [options.headers] 自定义请求头
 * @param {boolean} [options.skipAuth=false] 跳过 Authorization 注入（登录接口用）
 * @param {boolean} [options._retry=false] 内部标记：是否为 401 刷新后的重试
 * @returns {Promise<any>} 统一响应体中的 data（长数字 ID 已为字符串）
 */
export async function request(url, options = {}) {
  const { method = 'GET', params, data, headers: customHeaders, skipAuth = false, _retry = false } = options
  const headers = buildHeaders(customHeaders, skipAuth)
  const body = buildBody(data, headers)

  let response
  try {
    response = await fetch(buildUrl(url, params), { method: method.toUpperCase(), headers, body })
  } catch (networkError) {
    const networkApiError = new ApiError(networkError.message || '网络异常，请稍后重试', -1, null, null)
    reportBusinessError(networkApiError)
    throw networkApiError
  }

  const parsed = await parseResponse(response)
  const businessCode = parsed && typeof parsed === 'object' && 'code' in parsed ? parsed.code : null

  // 401：access token 失效，静默 refresh 后仅重试一次（刷新接口自身 401 不再重试）
  if (businessCode === UNAUTHORIZED_CODE && !_retry && url !== REFRESH_PATH) {
    if (!refreshingPromise) {
      refreshingPromise = refreshTokens().finally(() => {
        refreshingPromise = null
      })
    }
    try {
      await refreshingPromise
    } catch (refreshError) {
      // 402 或刷新失败：清凭证并跳登录，避免死循环
      handleSessionExpired()
      throw refreshError
    }
    return request(url, { ...options, _retry: true })
  }

  // 402：refreshToken 失效，清凭证跳登录
  if (businessCode === REFRESH_INVALID_CODE) {
    handleSessionExpired()
  }

  return resolveBusiness(parsed, response)
}

/* -------------------------------------------------------------------------- */
/*  语义化快捷方法（底层封装，不含业务接口）                                    */
/* -------------------------------------------------------------------------- */

export const http = {
  get: (url, params, options = {}) => request(url, { ...options, method: 'GET', params }),
  post: (url, data, options = {}) => request(url, { ...options, method: 'POST', data }),
  put: (url, data, options = {}) => request(url, { ...options, method: 'PUT', data }),
  patch: (url, data, options = {}) => request(url, { ...options, method: 'PATCH', data }),
  delete: (url, params, options = {}) => request(url, { ...options, method: 'DELETE', params })
}

export default request

import { clone } from 'lodash-es'
import type { AxiosResponse } from 'axios'
import axios from 'axios'
import { message as aMessage } from 'ant-design-vue'
import { isEmpty, isNull, isString, isUnDef } from '../is'
import { setObjToUrlParams } from '../'
import type { AxiosTransform, CreateAxiosOptions } from './axiosTransform'
import { XAxios } from './axios'
import { formatRequestDate, joinTimestamp } from './helper'
import { checkStatus } from './checkStatus'
import { AxiosRetry } from './axiosRetry'
import { useUserStoreWithout } from '@/store/modules/user'

enum ContentTypeEnum {
  JSON = 'application/json;charset=UTF-8',
  FORM_URLENCODED = 'application/x-www-form-urlencoded;charset=UTF-8',
  FORM_DATA = 'multipart/form-data;charset=UTF-8',
}
enum RequestEnum {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}
enum ResultEnum {
  SUCCESS = 200,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOND = 404,
  REQUEST_TIMEOUT = 408,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  GATEWAY_TIMEOUT = 504,

}

const transform: AxiosTransform = {
  beforeRequestHook: (config, options) => {
    const { apiUrl, joinPrefix, joinParamsToUrl, formatDate, joinTime = false, urlPrefix } = options
    if (joinPrefix)
      config.url = `${urlPrefix}${config.url}`

    if (apiUrl && isString(apiUrl))
      config.url = `${apiUrl}${config.url}`

    const params = config.params || {}
    const data = config.data || false
    formatDate && data && !isString(data) && formatRequestDate(data)
    if (config.method?.toUpperCase() === RequestEnum.GET) {
      if (!isString(params)) {
        // 给 get 请求加上时间戳参数，避免从缓存中拿数据。
        config.params = Object.assign(params || {}, joinTimestamp(joinTime, false))
      }
      else {
        // 兼容restful风格
        config.url = `${config.url + params}${joinTimestamp(joinTime, true)}`
        config.params = undefined
      }
    }
    else {
      if (!isString(params)) {
        formatDate && formatRequestDate(params)
        if (Reflect.has(config, 'data') && config.data && (Object.keys(config.data).length > 0 || config.data instanceof FormData)) {
          config.data = data
          config.params = params
        }
        else {
          // 非GET请求如果没有提供data，则将params视为data
          config.data = params
          config.params = undefined
        }
        if (joinParamsToUrl)
          config.url = setObjToUrlParams(config.url as string, Object.assign({}, config.params, config.data))
      }
      else {
        config.url = config.url + params
        config.params = undefined
      }
    }

    return config
  },
  responseInterceptors: (res: AxiosResponse<any>) => {
    return res
  },
  requestInterceptors: (config, options) => {
    const userStore = useUserStoreWithout()
    // 处理携带token的情况
    const token = userStore.getToken
    if (options.requestOptions?.withToken && token) {
      // 自己把token挂到headers上
      config.headers.zbpToken = token
    }
    return config
  },
  transformResponseHook: (res, options) => {
    const { isTransformResponse, isReturnNativeResponse } = options
    if (isReturnNativeResponse)
      return res

    if (!isTransformResponse)
      return res.data

    // 需要transformResponse的时候
    const { data: rawData } = res
    if (!rawData)
      throw new Error('请求出错，请稍后重试')

    // 根据后端的字段进行修改
    const { state, data, errorMsg: message } = rawData

    // 逻辑根据项目进行修改
    const hasSuccess = rawData && Reflect.has(rawData, 'state') && state === ResultEnum.SUCCESS
    if (hasSuccess) {
      let successMsg = message
      if (isNull(successMsg) || isUnDef(successMsg) || isEmpty(successMsg))
        successMsg = '操作成功'

      if (options.successMessageMode === 'modal') {
        // 这里可以写操作成功的弹窗
      }
      else if (options.successMessageMode === 'message') {
        // 这里可以写操作成功的toast
      }
      return data
    }
    // 如果不成功
    // 在此处根据自己项目的实际情况对不同的code执行不同的操作
    // 如果不希望中断当前请求，请return数据，否则直接抛出异常即可
    let errorMsg = ''
    switch (state) {
      case ResultEnum.UNAUTHORIZED:
        errorMsg = '用户没有权限'
        // 这里可以做logOut的操作
        break
      case ResultEnum.REQUEST_TIMEOUT:
        errorMsg = '网络请求超时'
        break
      case ResultEnum.INTERNAL_SERVER_ERROR:
        errorMsg = '服务器错误，请联系管理员'
        break
      case ResultEnum.BAD_GATEWAY:
        errorMsg = '网络错误'
        break
      case ResultEnum.NOT_FOND:
        errorMsg = '网络请求错误，未找到该资源'
        break
      case ResultEnum.FORBIDDEN:
        errorMsg = '用户得到授权，但是访问是被禁止的'
        break
      case ResultEnum.GATEWAY_TIMEOUT:
        errorMsg = '网络超时'
        break
      default:
        if (message)
          errorMsg = message
    }
    if (options.errorMessageMode === 'modal') { /* empty */ }
    else if (options.errorMessageMode === 'message') {
      aMessage.error(errorMsg)
    }
    throw new Error(errorMsg || '请求出错，请稍后重试')
  },
  responseInterceptorsCatch: (axiosInstance, error: any) => {
    const { response, code, message, config } = error || {}
    const errorMessageMode = config?.requestOptions?.errorMessageMode || 'none'
    const msg: string = response?.data?.error?.message ?? ''
    const err: string = error?.toString?.() ?? ''
    let errMessage = ''

    if (axios.isCancel(error))
      return Promise.reject(error)

    try {
      if (code === 'ECONNABORTED' && message.includes('timeout'))
        errMessage = '接口请求超时,请刷新页面重试'

      if (err?.includes('Network Error'))
        errMessage = '网络异常，请检查您的网络连接是否正常'

      if (errMessage) {
        if (errorMessageMode === 'modal') { /* empty */ }
        else if (errorMessageMode === 'message') { /* empty */ }
        return Promise.reject(error)
      }
    }
    catch (e) {
      throw new Error(e as unknown as string)
    }

    checkStatus(error?.response?.status, msg, errorMessageMode)

    // 添加自动重试机制 保险起见 只针对GET请求
    const retryRequest = new AxiosRetry()
    const { isOpenRetry } = config.requestOptions.retryRequestConfig
    config.method?.toUpperCase() === RequestEnum.GET
      && isOpenRetry
      && retryRequest.retry(axiosInstance, error)
    return Promise.reject(error)
  },
}
function createAxios(_opt?: Partial<CreateAxiosOptions>) {
  return new XAxios({
    // 设置超时时间为10s
    timeout: 10 * 1000,
    headers: { 'Content-Type': ContentTypeEnum.JSON },
    transform: clone(transform),
    requestOptions: {
      // 默认将prefix添加到url
      joinPrefix: true,
      // 不返回原始的response
      isReturnNativeResponse: false,
      // 需要对返回的数据进行处理
      isTransformResponse: true,
      // post请求的时候把params添加到url
      joinParamsToUrl: false,
      // 不加时间戳
      joinTime: false,
      // 格式化提交参数时间
      formatDate: false,
      // 错误消息类型提示
      errorMessageMode: 'message',
      // 成功消息类型提示
      successMessageMode: 'message',
      // 接口地址
      apiUrl: '',
      // url的前缀
      urlPrefix: '',
      withToken: true,
      // 重试配置
      retryRequestConfig: {
        isOpenRetry: false,
        count: 3,
        retryDelay: 1000,
      },
      ignoreCancelToken: true,

    },
  })
}

export const http = createAxios()

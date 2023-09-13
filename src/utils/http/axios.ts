import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'
import { cloneDeep } from 'lodash-es'
import { isFunction } from '../is'
import type { RequestOptions, Result } from '../../types/axios'
import type { CreateAxiosOptions } from './axiosTransform'
import { AxiosCanceler } from './axiosCancel'

export class XAxios {
  private axiosInstance: AxiosInstance
  private readonly options: CreateAxiosOptions

  constructor(options: CreateAxiosOptions) {
    this.options = options
    this.axiosInstance = axios.create(options)
    this.setupInterceptors()
  }

  /**
   * 拦截器配置
   */
  private setupInterceptors() {
    const { axiosInstance, options: { transform } } = this
    // 如果没有设置transform，就不设置拦截器
    if (!transform)
      return

    const {
      requestInterceptors,
      responseInterceptors,
      requestInterceptorsCatch,
      responseInterceptorsCatch,
    } = transform

    const axiosCanceler = new AxiosCanceler()

    // request interceptor
    axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const { requestOptions } = this.options
      const ignoreCancelToken = requestOptions?.ignoreCancelToken ?? true

      !ignoreCancelToken && axiosCanceler.addPending(config)
      if (requestInterceptors && isFunction(requestInterceptors))
        config = requestInterceptors(config, this.options)

      return config
    }, undefined)

    requestInterceptorsCatch && isFunction(requestInterceptorsCatch) && axiosInstance.interceptors.request.use(undefined, requestInterceptorsCatch)

    // response interceptor
    axiosInstance.interceptors.response.use((res: AxiosResponse<any>) => {
      res && axiosCanceler.removePending(res.config)
      if (responseInterceptors && isFunction(responseInterceptors))
        res = responseInterceptors(res)

      return res
    }, undefined)

    responseInterceptorsCatch && isFunction(responseInterceptorsCatch) && axiosInstance.interceptors.response.use(undefined, (err) => {
      return responseInterceptorsCatch(axiosInstance, err)
    })
  }

  /**
   * 请求方法
   */

  request<T = any>(config: AxiosRequestConfig, options?: RequestOptions): Promise<T> {
    let conf: CreateAxiosOptions = cloneDeep(config)
    const { transform, requestOptions } = this.options

    // 用传入的options覆盖默认设置的options
    const opt: RequestOptions = Object.assign({}, requestOptions, options)
    const { beforeRequestHook, requestCatchHook, transformResponseHook } = transform || {}
    if (beforeRequestHook && isFunction(beforeRequestHook))
      conf = beforeRequestHook(conf, opt)

    conf.requestOptions = opt

    return new Promise((resolve, reject) => {
      this.axiosInstance.request<any, AxiosResponse<Result>>(conf).then((res: AxiosResponse<Result>) => {
        if (transformResponseHook && isFunction(transformResponseHook)) {
          try {
            const ret = transformResponseHook(res, opt)
            resolve(ret)
          }
          catch (err) {
            reject(err || new Error('request error!'))
          }
          return
        }
        resolve(res as unknown as Promise<T>)
      }).catch((err: Error | AxiosError) => {
        if (requestCatchHook && isFunction(requestCatchHook)) {
          reject(requestCatchHook(err, opt))
          return
        }
        if (axios.isAxiosError(err)) {
          // 在这里重写axios的错误信息
        }
        reject(err)
      })
    })
  }

  get<T = any>(config: AxiosRequestConfig, options?: RequestOptions): Promise<T> {
    return this.request({ ...config, method: 'GET' }, options)
  }

  post<T = any>(config: AxiosRequestConfig, options?: RequestOptions): Promise<T> {
    return this.request({ ...config, method: 'POST' }, options)
  }

  put<T = any>(config: AxiosRequestConfig, options?: RequestOptions): Promise<T> {
    return this.request({ ...config, method: 'PUT' }, options)
  }

  delete<T = any>(config: AxiosRequestConfig, options?: RequestOptions): Promise<T> {
    return this.request({ ...config, method: 'DELETE' }, options)
  }
}

import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { RequestOptions, Result } from '../../types/axios'

export interface AxiosTransform {
  /**
   * 在发送请求之前会调用的函数，可以根据需要修改请求配置
   * @param config axios的配置
   * @param options 自定义配置
   */
  beforeRequestHook?: (config: AxiosRequestConfig, options: RequestOptions) => AxiosRequestConfig

  /**
   * 处理响应数据，可以根据需要修改响应数据结构
   * @param res 响应结果
   * @param options 自定义配置
   */
  transformResponseHook?: (res: AxiosResponse<Result>, options: RequestOptions) => any

  /**
   * 处理请求失败的情况
   * @param e 错误对象
   * @param options 自定义配置
   */
  requestCatchHook?: (e: Error, options: RequestOptions) => Promise<any>

  /**
   * 请求前的拦截器
   * @param config axios的配置
   * @param options 自定义配置
   */
  requestInterceptors?: (config: InternalAxiosRequestConfig, options: CreateAxiosOptions) => InternalAxiosRequestConfig

  /**
   * 请求后的拦截器
   * @param res 响应结果
   */
  responseInterceptors?: (res: AxiosResponse<any>) => AxiosResponse<any>

  /**
   * 请求前的拦截器错误处理
   * @param error 错误对象
   */
  requestInterceptorsCatch?: (error: Error) => void

  /**
   * 请求后的拦截器错误处理
   * @param axiosInstance axios实例
   * @param error 错误对象
   */
  responseInterceptorsCatch?: (axiosInstance: AxiosInstance, error: Error) => void
}

export interface CreateAxiosOptions extends AxiosRequestConfig {
  transform?: AxiosTransform
  requestOptions?: RequestOptions
}

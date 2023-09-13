import type { AxiosError, AxiosInstance } from 'axios'

export class AxiosRetry {
  /**
   * 重试
   */
  retry(axiosInstance: AxiosInstance, error: AxiosError) {
    // @ts-expect-error
    const { config } = error.response
    const { count, retryDelay } = config?.requestOptions?.RetryRequestConfig || {}
    config.__retryCount = count || 0
    if (config.__retryCount >= count)
      return Promise.reject(error)

    config.__retryCount += 1

    return this.delay(retryDelay).then(() => axiosInstance(config))
  }

  /**
   * 延迟
   */
  private delay(time: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, time)
    })
  }
}

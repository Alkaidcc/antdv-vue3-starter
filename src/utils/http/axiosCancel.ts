import type { AxiosRequestConfig } from 'axios'

// 用于存储每个请求的标识和取消函数
const pendingMap = new Map<string, AbortController>()

function getPendingUrl(config: AxiosRequestConfig): string {
  return [config.method, config.url].join('&')
}

export class AxiosCanceler {
  /**
   * 添加请求
   */
  public addPending(config: AxiosRequestConfig): void {
    this.removePending(config)
    const url = getPendingUrl(config)
    const abortController = new AbortController()
    config.signal = config.signal || abortController.signal
    if (!pendingMap.has(url))
      pendingMap.set(url, abortController)
  }

  /**
   * 移除请求
   */
  public removePending(config: AxiosRequestConfig): void {
    const url = getPendingUrl(config)
    if (pendingMap.has(url)) {
      // 如果当前请求在等待中，取消它并将其从等待中移除
      const abortController = pendingMap.get(url)
      if (abortController)
        abortController.abort()

      pendingMap.delete(url)
    }
  }

  /**
   * 移除所有请求
   */
  public removeAllPending(): void {
    pendingMap.forEach((abortController) => {
      if (abortController)
        abortController.abort()
    })
    this.reset()
  }

  /**
   * 重置
   */
  public reset(): void {
    pendingMap.clear()
  }
}

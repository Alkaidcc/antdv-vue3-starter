export type ErrorMessageMode = 'none' | 'modal' | 'message' | undefined;
export type SuccessMessageMode = ErrorMessageMode;

interface RequestOptions {

  // 是否需要转换响应
  isTransformResponse?: boolean;

  // 是否返回原生响应 比如：需要获取响应头时使用该属性。
  isReturnNativeResponse?: boolean;

  // 是否添加前缀
  joinPrefix?: boolean;

  // url前缀
  urlPrefix?: string;

  // 接口地址
  apiUrl?: string;

  // 是否携带token
  withToken?: boolean;

  // 是否添加时间戳，用于避免接口缓存
  joinTime?: boolean;

  // 是否要把参数加到url上
  joinParamsToUrl?: boolean;

  // 是否要格式化请求参数时间
  formatDate?: boolean;

  // 错误提示类型
  errorMessageMode?: ErrorMessageMode;

  // 成功提示类型
  successMessageMode?: SuccessMessageMode;

  // 请求重试配置
  retryRequestConfig?: RetryRequestConfig;

  // 忽略重复请求
  ignoreCancelToken?: boolean;
}

interface RetryRequestConfig {
  isOpenRetry?: boolean;
  count?: number;
  retryDelay?: number;
}
// 根据后端接口返回的数据结构定义，这里可能需要修改
export interface Result<T = any> {
  state: number;
  type: 'success' | 'error' | 'warning';
  errorMsg: string;
  data: T;
}

export interface UploadFileParams {
  file: File | Blob;
  [key: string]: any;
}
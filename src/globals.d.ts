declare module "node-nlp" {
  export class NlpManager {
    constructor(options?: any);
    addDocument(language: string, text: string, intent: string): void;
    train(): Promise<void>;
    process(
      language: string,
      text: string
    ): Promise<{
      intent: string;
      score: number;
      [key: string]: any;
    }>;
  }
}

declare module "axios" {
  export interface AxiosRequestConfig {
    url?: string;
    method?: string;
    baseURL?: string;
    headers?: any;
    params?: any;
    data?: any;
    timeout?: number;
    withCredentials?: boolean;
    responseType?: string;
  }

  export interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: any;
    config: AxiosRequestConfig;
    request?: any;
  }

  export interface AxiosError<T = any> extends Error {
    config: AxiosRequestConfig;
    code?: string;
    request?: any;
    response?: AxiosResponse<T>;
    isAxiosError: boolean;
  }

  export interface AxiosInstance {
    (config: AxiosRequestConfig): Promise<AxiosResponse>;
    (url: string, config?: AxiosRequestConfig): Promise<AxiosResponse>;
    defaults: AxiosRequestConfig;
    get<T = any>(
      url: string,
      config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>>;
    post<T = any>(
      url: string,
      data?: any,
      config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>>;
    put<T = any>(
      url: string,
      data?: any,
      config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>>;
    delete<T = any>(
      url: string,
      config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>>;
  }

  function create(config?: AxiosRequestConfig): AxiosInstance;
  const axios: AxiosInstance & { create: typeof create };
  export default axios;
}

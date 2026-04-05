export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiMeta = {
  page?: number;
  page_size?: number;
  total?: number;
  [key: string]: unknown;
};

export type ApiResponse<TData = unknown> = {
  success: boolean;
  data: TData | null;
  error: ApiError | null;
  meta: ApiMeta | null;
};

export type ApiSuccessResponse<TData> = {
  success: true;
  data: TData;
  error: null;
  meta: ApiMeta | null;
};

export type ApiErrorResponse = {
  success: false;
  data: null;
  error: ApiError;
  meta: ApiMeta | null;
};

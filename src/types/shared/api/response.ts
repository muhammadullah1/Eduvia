export interface PaginationMeta {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PaginatedPayload<T> {
  items: T[]
  pagination: PaginationMeta
}

export type ApiSuccess<T> = {
  success: true
  message: string
  data: T
}

import type { CrudQuery, CrudFilter } from '@/types/crud'

export class QueryBuilder {
  private query: CrudQuery = {}

  // 페이지네이션 (오프셋 방식)
  paginate(page: number, limit: number = 10): QueryBuilder {
    this.query.page = {
      offset: (page - 1) * limit,
      limit,
    }
    return this
  }

  // 페이지네이션 (페이지 번호 방식)
  paginateByNumber(pageNumber: number, pageSize: number = 10): QueryBuilder {
    this.query.page = {
      number: pageNumber,
      size: pageSize,
    }
    return this
  }

  // 커서 페이지네이션
  paginateByCursor(cursor: string, size: number = 10): QueryBuilder {
    this.query.page = {
      cursor,
      size,
    }
    return this
  }

  // 정렬
  sortBy(...fields: string[]): QueryBuilder {
    this.query.sort = fields
    return this
  }

  // 오름차순 정렬
  sortAsc(field: string): QueryBuilder {
    this.query.sort = [field]
    return this
  }

  // 내림차순 정렬
  sortDesc(field: string): QueryBuilder {
    this.query.sort = [`-${field}`]
    return this
  }

  // 관계 포함
  include(...relations: string[]): QueryBuilder {
    this.query.include = relations
    return this
  }

  // === 필터 메서드들 ===

  // 기본 필터 (직접 설정)
  filter(filters: CrudFilter): QueryBuilder {
    this.query.filter = { ...this.query.filter, ...filters }
    return this
  }

  // 같음 필터
  filterEq(field: string, value: string | number | boolean): QueryBuilder {
    if (!this.query.filter) this.query.filter = {}
    this.query.filter[`${field}_eq`] = value
    return this
  }

  // 다름 필터
  filterNe(field: string, value: string | number | boolean): QueryBuilder {
    if (!this.query.filter) this.query.filter = {}
    this.query.filter[`${field}_ne`] = value
    return this
  }

  // LIKE 필터 (부분 검색)
  filterLike(field: string, value: string, wildcard: boolean = true): QueryBuilder {
    if (!value?.trim()) return this

    if (!this.query.filter) this.query.filter = {}
    const searchValue = wildcard ? `%${value.trim()}%` : value.trim()
    this.query.filter[`${field}_like`] = searchValue
    return this
  }

  // ILIKE 필터 (대소문자 무시)
  filterILike(field: string, value: string, wildcard: boolean = true): QueryBuilder {
    if (!value?.trim()) return this

    if (!this.query.filter) this.query.filter = {}
    const searchValue = wildcard ? `%${value.trim()}%` : value.trim()
    this.query.filter[`${field}_ilike`] = searchValue
    return this
  }

  // 범위 필터 (초과)
  filterGt(field: string, value: number | string): QueryBuilder {
    if (!this.query.filter) this.query.filter = {}
    this.query.filter[`${field}_gt`] = value
    return this
  }

  // 범위 필터 (이상)
  filterGte(field: string, value: number | string): QueryBuilder {
    if (!this.query.filter) this.query.filter = {}
    this.query.filter[`${field}_gte`] = value
    return this
  }

  // 범위 필터 (미만)
  filterLt(field: string, value: number | string): QueryBuilder {
    if (!this.query.filter) this.query.filter = {}
    this.query.filter[`${field}_lt`] = value
    return this
  }

  // 범위 필터 (이하)
  filterLte(field: string, value: number | string): QueryBuilder {
    if (!this.query.filter) this.query.filter = {}
    this.query.filter[`${field}_lte`] = value
    return this
  }

  // 사이 값 필터
  filterBetween(field: string, min: number | string, max: number | string): QueryBuilder {
    if (!this.query.filter) this.query.filter = {}
    this.query.filter[`${field}_between`] = `${min},${max}`
    return this
  }

  // IN 필터 (포함)
  filterIn(field: string, values: (string | number)[]): QueryBuilder {
    if (!values.length) return this

    if (!this.query.filter) this.query.filter = {}
    this.query.filter[`${field}_in`] = values.join(',')
    return this
  }

  // NOT IN 필터 (미포함)
  filterNotIn(field: string, values: (string | number)[]): QueryBuilder {
    if (!values.length) return this

    if (!this.query.filter) this.query.filter = {}
    this.query.filter[`${field}_not_in`] = values.join(',')
    return this
  }

  // NULL 필터
  filterNull(field: string, isNull: boolean = true): QueryBuilder {
    if (!this.query.filter) this.query.filter = {}
    this.query.filter[`${field}_null`] = isNull
    return this
  }

  // NOT NULL 필터
  filterNotNull(field: string): QueryBuilder {
    if (!this.query.filter) this.query.filter = {}
    this.query.filter[`${field}_not_null`] = true
    return this
  }

  // 시작하는 문자열 필터
  filterStartsWith(field: string, value: string): QueryBuilder {
    if (!value?.trim()) return this

    if (!this.query.filter) this.query.filter = {}
    this.query.filter[`${field}_start`] = value.trim()
    return this
  }

  // 끝나는 문자열 필터
  filterEndsWith(field: string, value: string): QueryBuilder {
    if (!value?.trim()) return this

    if (!this.query.filter) this.query.filter = {}
    this.query.filter[`${field}_end`] = value.trim()
    return this
  }

  // 포함하는 문자열 필터
  filterContains(field: string, value: string): QueryBuilder {
    if (!value?.trim()) return this

    if (!this.query.filter) this.query.filter = {}
    this.query.filter[`${field}_contains`] = value.trim()
    return this
  }

  // === 편의 메서드들 ===

  // 날짜 범위 필터 (오늘부터)
  filterFromToday(field: string = 'createdAt'): QueryBuilder {
    const today = new Date().toISOString().split('T')[0]
    return this.filterGte(field, today)
  }

  // 날짜 범위 필터 (이번 주)
  filterThisWeek(field: string = 'createdAt'): QueryBuilder {
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6))

    return this.filterBetween(
      field,
      startOfWeek.toISOString().split('T')[0],
      endOfWeek.toISOString().split('T')[0]
    )
  }

  // 날짜 범위 필터 (이번 달)
  filterThisMonth(field: string = 'createdAt'): QueryBuilder {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    return this.filterBetween(
      field,
      startOfMonth.toISOString().split('T')[0],
      endOfMonth.toISOString().split('T')[0]
    )
  }

  // 활성 상태 필터
  filterActive(field: string = 'isActive'): QueryBuilder {
    return this.filterEq(field, true)
  }

  // 비활성 상태 필터
  filterInactive(field: string = 'isActive'): QueryBuilder {
    return this.filterEq(field, false)
  }

  // 검색 필터 (여러 필드에서 검색)
  search(query: string, fields: string[] = ['name', 'title', 'description']): QueryBuilder {
    if (!query?.trim() || !fields.length) return this

    // 첫 번째 필드에만 적용 (nestjs-crud는 OR 검색을 직접 지원하지 않음)
    return this.filterLike(fields[0], query)
  }

  // 최근 항목 필터 (최근 N일)
  filterRecent(days: number = 7, field: string = 'createdAt'): QueryBuilder {
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - days)

    return this.filterGte(field, daysAgo.toISOString().split('T')[0])
  }

  // 쿼리 초기화
  reset(): QueryBuilder {
    this.query = {}
    return this
  }

  // 쿼리 복사
  clone(): QueryBuilder {
    const newBuilder = new QueryBuilder()
    newBuilder.query = JSON.parse(JSON.stringify(this.query))
    return newBuilder
  }

  // 완성된 쿼리 반환
  build(): CrudQuery {
    return { ...this.query }
  }

  // 쿼리 미리보기 (디버깅용)
  preview(): string {
    return JSON.stringify(this.query, null, 2)
  }
}

// 팩토리 함수
export function createQuery(): QueryBuilder {
  return new QueryBuilder()
}

// 자주 사용하는 쿼리 템플릿들
export const QueryTemplates = {
  // 기본 목록 쿼리 (최신순, 페이지네이션)
  basicList: (page: number = 1, limit: number = 10) =>
    createQuery()
      .paginate(page, limit)
      .sortDesc('createdAt'),

  // 검색 쿼리
  search: (searchTerm: string, searchFields: string[] = ['name'], page: number = 1, limit: number = 10) =>
    createQuery()
      .paginate(page, limit)
      .search(searchTerm, searchFields)
      .sortDesc('createdAt'),

  // 활성 항목만
  activeOnly: (page: number = 1, limit: number = 10) =>
    createQuery()
      .paginate(page, limit)
      .filterActive()
      .sortDesc('createdAt'),

  // 최근 항목 (7일)
  recent: (days: number = 7, page: number = 1, limit: number = 10) =>
    createQuery()
      .paginate(page, limit)
      .filterRecent(days)
      .sortDesc('createdAt'),

  // 이번 달 항목
  thisMonth: (page: number = 1, limit: number = 10) =>
    createQuery()
      .paginate(page, limit)
      .filterThisMonth()
      .sortDesc('createdAt'),
} 
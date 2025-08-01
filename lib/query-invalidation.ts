/**
 * 정밀한 쿼리 무효화 시스템
 */

import { QueryClient } from "@tanstack/react-query";

// 무효화 전략 타입
export type InvalidationStrategy =
  | "exact" // 정확한 쿼리만 무효화
  | "prefix" // 접두사 일치하는 쿼리들 무효화
  | "related" // 관련된 쿼리들 무효화
  | "cascade"; // 연관된 모든 쿼리들 무효화

// 무효화 옵션
export interface InvalidationOptions {
  strategy?: InvalidationStrategy;
  refetchType?: "active" | "inactive" | "all";
  exact?: boolean;
  predicate?: (query: { queryKey: unknown[] }) => boolean;
}

// 엔티티 관계 정의
export interface EntityRelationship {
  entity: string;
  relations: {
    [key: string]: {
      type: "one-to-one" | "one-to-many" | "many-to-many";
      entity: string;
      field?: string;
    }[];
  };
}

/**
 * 쿼리 무효화 관리자
 */
export class QueryInvalidationManager {
  private queryClient: QueryClient;
  private entityRelations: Map<string, EntityRelationship> = new Map();

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.setupDefaultRelations();
  }

  /**
   * 기본 엔티티 관계 설정
   */
  private setupDefaultRelations(): void {
    // User 관계
    this.addEntityRelation({
      entity: "user",
      relations: {
        posts: [
          {
            type: "one-to-many",
            entity: "post",
            field: "authorId",
          },
        ],
        profile: [
          {
            type: "one-to-one",
            entity: "profile",
            field: "userId",
          },
        ],
      },
    });

    // Post 관계
    this.addEntityRelation({
      entity: "post",
      relations: {
        author: [
          {
            type: "one-to-one",
            entity: "user",
            field: "id",
          },
        ],
        comments: [
          {
            type: "one-to-many",
            entity: "comment",
            field: "postId",
          },
        ],
        categories: [
          {
            type: "many-to-many",
            entity: "category",
          },
        ],
      },
    });
  }

  /**
   * 엔티티 관계 추가
   */
  addEntityRelation(relationship: EntityRelationship): void {
    this.entityRelations.set(relationship.entity, relationship);
  }

  /**
   * 정밀한 무효화 실행
   */
  async invalidateQueries(
    queryKey: (string | number)[],
    options: InvalidationOptions = {}
  ): Promise<void> {
    const { strategy = "prefix", refetchType = "active" } = options;

    switch (strategy) {
      case "exact":
        await this.invalidateExact(queryKey, refetchType);
        break;

      case "prefix":
        await this.invalidateByPrefix(queryKey, refetchType);
        break;

      case "related":
        await this.invalidateRelated(queryKey, refetchType);
        break;

      case "cascade":
        await this.invalidateCascade(queryKey, refetchType);
        break;
    }
  }

  /**
   * 정확한 쿼리만 무효화
   */
  private async invalidateExact(
    queryKey: (string | number)[],
    refetchType: "active" | "inactive" | "all"
  ): Promise<void> {
    await this.queryClient.invalidateQueries({
      queryKey,
      exact: true,
      refetchType,
    });

    console.debug(`Invalidated exact query: ${queryKey.join(".")}`);
  }

  /**
   * 접두사로 쿼리 무효화
   */
  private async invalidateByPrefix(
    queryKey: (string | number)[],
    refetchType: "active" | "inactive" | "all"
  ): Promise<void> {
    await this.queryClient.invalidateQueries({
      queryKey,
      exact: false,
      refetchType,
    });

    console.debug(`Invalidated queries with prefix: ${queryKey.join(".")}`);
  }

  /**
   * 관련된 쿼리들 무효화
   */
  private async invalidateRelated(
    queryKey: (string | number)[],
    refetchType: "active" | "inactive" | "all"
  ): Promise<void> {
    const [entityName] = queryKey;
    const entity = this.entityRelations.get(String(entityName));

    if (!entity) {
      // 관계 정보가 없으면 기본 prefix 무효화
      await this.invalidateByPrefix(queryKey, refetchType);
      return;
    }

    // 현재 엔티티 무효화
    await this.invalidateByPrefix(queryKey, refetchType);

    // 관련된 엔티티들 무효화
    for (const relations of Object.values(entity.relations)) {
      for (const relation of relations) {
        const relatedQueryKey = [relation.entity];
        await this.invalidateByPrefix(relatedQueryKey, refetchType);
        console.debug(`Invalidated related entity: ${relation.entity}`);
      }
    }
  }

  /**
   * 연관된 모든 쿼리들 무효화 (주의: 성능 영향)
   */
  private async invalidateCascade(
    queryKey: (string | number)[],
    refetchType: "active" | "inactive" | "all"
  ): Promise<void> {
    const visited = new Set<string>();
    await this.cascadeInvalidate(queryKey, refetchType, visited);
  }

  /**
   * 재귀적 무효화 (cascade용)
   */
  private async cascadeInvalidate(
    queryKey: (string | number)[],
    refetchType: "active" | "inactive" | "all",
    visited: Set<string>
  ): Promise<void> {
    const [entityName] = queryKey;
    const entityKey = String(entityName);

    if (visited.has(entityKey)) {
      return; // 순환 참조 방지
    }
    visited.add(entityKey);

    // 현재 엔티티 무효화
    await this.invalidateByPrefix(queryKey, refetchType);

    const entity = this.entityRelations.get(entityKey);
    if (!entity) return;

    // 관련된 엔티티들 재귀적으로 무효화
    for (const relations of Object.values(entity.relations)) {
      for (const relation of relations) {
        const relatedQueryKey = [relation.entity];
        await this.cascadeInvalidate(relatedQueryKey, refetchType, visited);
      }
    }
  }

  /**
   * CRUD 작업별 최적화된 무효화
   */
  async invalidateForCrudOperation(
    entity: string,
    operation: "create" | "update" | "delete",
    entityId?: string,
    updatedData?: Record<string, unknown>
  ): Promise<void> {
    switch (operation) {
      case "create":
        await this.invalidateForCreate(entity);
        break;

      case "update":
        await this.invalidateForUpdate(entity, entityId, updatedData);
        break;

      case "delete":
        await this.invalidateForDelete(entity, entityId);
        break;
    }
  }

  /**
   * 생성 작업 최적화 무효화
   */
  private async invalidateForCreate(entity: string): Promise<void> {
    // 목록 쿼리만 무효화 (새 항목이 추가되었으므로)
    await this.invalidateQueries([entity, "list"], { strategy: "prefix" });

    // 카운트나 통계 쿼리가 있다면 무효화
    await this.invalidateQueries([entity, "count"], { strategy: "prefix" });
    await this.invalidateQueries([entity, "stats"], { strategy: "prefix" });

    console.debug(`Optimized invalidation for CREATE: ${entity}`);
  }

  /**
   * 수정 작업 최적화 무효화
   */
  private async invalidateForUpdate(
    entity: string,
    entityId?: string,
    updatedData?: Record<string, unknown>
  ): Promise<void> {
    // 특정 엔티티 상세 쿼리 무효화
    if (entityId) {
      await this.invalidateQueries([entity, "detail", entityId], {
        strategy: "exact",
      });
    }

    // 목록 쿼리는 필터에 영향을 줄 수 있는 필드가 변경된 경우만 무효화
    if (updatedData && this.shouldInvalidateList(entity, updatedData)) {
      await this.invalidateQueries([entity, "list"], { strategy: "prefix" });
    }

    // 관련된 엔티티 중 영향받는 것들만 무효화
    if (updatedData) {
      await this.invalidateRelatedForUpdate(entity, updatedData);
    }

    console.debug(
      `Optimized invalidation for UPDATE: ${entity}${
        entityId ? ` (${entityId})` : ""
      }`
    );
  }

  /**
   * 삭제 작업 최적화 무효화
   */
  private async invalidateForDelete(
    entity: string,
    entityId?: string
  ): Promise<void> {
    // 특정 엔티티 쿼리 제거
    if (entityId) {
      this.queryClient.removeQueries({
        queryKey: [entity, "detail", entityId],
      });
    }

    // 목록 쿼리 무효화 (항목이 제거되었으므로)
    await this.invalidateQueries([entity, "list"], { strategy: "prefix" });

    // 카운트/통계 무효화
    await this.invalidateQueries([entity, "count"], { strategy: "prefix" });
    await this.invalidateQueries([entity, "stats"], { strategy: "prefix" });

    // 관련된 엔티티들의 관계 필드 무효화
    await this.invalidateRelated([entity], "active");

    console.debug(
      `Optimized invalidation for DELETE: ${entity}${
        entityId ? ` (${entityId})` : ""
      }`
    );
  }

  /**
   * 리스트 무효화 필요 여부 판단
   */
  private shouldInvalidateList(
    entity: string,
    updatedData: Record<string, unknown>
  ): boolean {
    // 일반적으로 필터링/정렬에 사용되는 필드들
    const commonFilterFields = [
      "name",
      "title",
      "status",
      "isActive",
      "isPublished",
      "category",
      "createdAt",
      "updatedAt",
      "priority",
      "type",
      "visibility",
    ];

    return commonFilterFields.some((field) => field in updatedData);
  }

  /**
   * 수정 시 관련 엔티티 무효화
   */
  private async invalidateRelatedForUpdate(
    entity: string,
    updatedData: Record<string, unknown>
  ): Promise<void> {
    const entityRelation = this.entityRelations.get(entity);
    if (!entityRelation) return;

    for (const relations of Object.values(entityRelation.relations)) {
      for (const relation of relations) {
        // 관계 필드가 변경된 경우에만 관련 엔티티 무효화
        if (relation.field && relation.field in updatedData) {
          await this.invalidateQueries([relation.entity, "list"], {
            strategy: "prefix",
          });
          console.debug(
            `Invalidated related entity for field change: ${relation.entity}`
          );
        }
      }
    }
  }

  /**
   * 현재 캐시 상태 분석
   */
  getCacheAnalysis(): {
    totalQueries: number;
    entitiesCached: string[];
    stalestQueries: { queryKey: unknown[]; lastFetched: number }[];
  } {
    const queryCache = this.queryClient.getQueryCache();
    const queries = queryCache.getAll();

    const entities = new Set<string>();
    const queryInfo: { queryKey: unknown[]; lastFetched: number }[] = [];

    queries.forEach((query) => {
      const [entityName] = query.queryKey;
      if (typeof entityName === "string") {
        entities.add(entityName);
      }

      queryInfo.push({
        queryKey: [...query.queryKey], // readonly를 mutable로 변환
        lastFetched: query.state.dataUpdatedAt,
      });
    });

    // 가장 오래된 쿼리들 찾기
    const stalestQueries = queryInfo
      .sort((a, b) => a.lastFetched - b.lastFetched)
      .slice(0, 10);

    return {
      totalQueries: queries.length,
      entitiesCached: Array.from(entities),
      stalestQueries,
    };
  }
}

/**
 * 싱글톤 인스턴스 생성 함수
 */
let invalidationManager: QueryInvalidationManager | null = null;

export function createInvalidationManager(
  queryClient: QueryClient
): QueryInvalidationManager {
  if (!invalidationManager) {
    invalidationManager = new QueryInvalidationManager(queryClient);
  }
  return invalidationManager;
}

export function getInvalidationManager(): QueryInvalidationManager | null {
  return invalidationManager;
}

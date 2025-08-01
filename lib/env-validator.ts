/**
 * 환경변수 검증 시스템
 */

// 환경변수 타입 정의
export interface EnvironmentSchema {
  [key: string]: {
    required?: boolean;
    default?: string;
    type?: "string" | "number" | "boolean" | "url";
    pattern?: RegExp;
    choices?: string[];
    description?: string;
  };
}

// 검증 결과 타입
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  values: Record<string, string | number | boolean>;
}

export interface ValidationError {
  key: string;
  message: string;
  severity: "error";
}

export interface ValidationWarning {
  key: string;
  message: string;
  severity: "warning";
}

/**
 * 환경변수 검증기
 */
export class EnvironmentValidator {
  private schema: EnvironmentSchema;
  private processEnv: Record<string, string | undefined>;

  constructor(
    schema: EnvironmentSchema,
    processEnv: Record<string, string | undefined> = process.env
  ) {
    this.schema = schema;
    this.processEnv = processEnv;
  }

  /**
   * 환경변수 검증 실행
   */
  validate(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const values: Record<string, string | number | boolean> = {};

    for (const [key, config] of Object.entries(this.schema)) {
      const rawValue = this.processEnv[key];

      try {
        const result = this.validateSingleVariable(key, rawValue, config);

        if (result.error) {
          errors.push(result.error);
        }

        if (result.warning) {
          warnings.push(result.warning);
        }

        if (result.value !== undefined) {
          values[key] = result.value;
        }
      } catch (error) {
        errors.push({
          key,
          message: `Unexpected validation error: ${
            error instanceof Error ? error.message : String(error)
          }`,
          severity: "error",
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      values,
    };
  }

  /**
   * 단일 환경변수 검증
   */
  private validateSingleVariable(
    key: string,
    rawValue: string | undefined,
    config: EnvironmentSchema[string]
  ): {
    value?: string | number | boolean;
    error?: ValidationError;
    warning?: ValidationWarning;
  } {
    // 필수 값 검증
    if (config.required && (rawValue === undefined || rawValue === "")) {
      return {
        error: {
          key,
          message: `Required environment variable '${key}' is missing`,
          severity: "error",
        },
      };
    }

    // 값이 없는 경우 기본값 사용
    if (rawValue === undefined || rawValue === "") {
      if (config.default !== undefined) {
        return {
          value: this.parseValue(config.default, config.type || "string"),
          warning: {
            key,
            message: `Using default value for '${key}': ${config.default}`,
            severity: "warning",
          },
        };
      }
      return {};
    }

    // 타입 변환 및 검증
    const parsedValue = this.parseValue(rawValue, config.type || "string");
    if (parsedValue === undefined) {
      return {
        error: {
          key,
          message: `Invalid type for '${key}'. Expected ${
            config.type || "string"
          }, got: ${rawValue}`,
          severity: "error",
        },
      };
    }

    // 패턴 검증
    if (config.pattern && typeof parsedValue === "string") {
      if (!config.pattern.test(parsedValue)) {
        return {
          error: {
            key,
            message: `Value for '${key}' does not match required pattern: ${config.pattern.source}`,
            severity: "error",
          },
        };
      }
    }

    // 선택지 검증
    if (config.choices && config.choices.length > 0) {
      if (!config.choices.includes(String(parsedValue))) {
        return {
          error: {
            key,
            message: `Invalid value for '${key}'. Must be one of: ${config.choices.join(
              ", "
            )}. Got: ${parsedValue}`,
            severity: "error",
          },
        };
      }
    }

    // URL 타입 특별 검증
    if (config.type === "url") {
      try {
        new URL(String(parsedValue));
      } catch {
        return {
          error: {
            key,
            message: `Invalid URL format for '${key}': ${parsedValue}`,
            severity: "error",
          },
        };
      }
    }

    return { value: parsedValue };
  }

  /**
   * 값 타입 변환
   */
  private parseValue(
    value: string,
    type: string
  ): string | number | boolean | undefined {
    switch (type) {
      case "string":
      case "url":
        return value;

      case "number":
        const num = Number(value);
        return isNaN(num) ? undefined : num;

      case "boolean":
        const lowerValue = value.toLowerCase();
        if (["true", "1", "yes", "on"].includes(lowerValue)) return true;
        if (["false", "0", "no", "off"].includes(lowerValue)) return false;
        return undefined;

      default:
        return value;
    }
  }

  /**
   * 검증 결과 출력
   */
  static printValidationResult(result: ValidationResult): void {
    if (result.isValid) {
      console.log("✅ Environment validation passed");
    } else {
      console.error("❌ Environment validation failed");
    }

    if (result.errors.length > 0) {
      console.error("\n🚨 Errors:");
      result.errors.forEach((error) => {
        console.error(`  - ${error.key}: ${error.message}`);
      });
    }

    if (result.warnings.length > 0) {
      console.warn("\n⚠️  Warnings:");
      result.warnings.forEach((warning) => {
        console.warn(`  - ${warning.key}: ${warning.message}`);
      });
    }

    if (process.env.NODE_ENV === "development") {
      console.log("\n📋 Resolved values:");
      Object.entries(result.values).forEach(([key, value]) => {
        console.log(
          `  - ${key}: ${
            typeof value === "string" && value.length > 50
              ? value.substring(0, 50) + "..."
              : value
          }`
        );
      });
    }
  }
}

/**
 * 서버 사이드 환경변수 스키마
 */
export const SERVER_ENV_SCHEMA: EnvironmentSchema = {
  NODE_ENV: {
    required: true,
    choices: ["development", "production", "test"],
    default: "development",
    description: "Application environment",
  },
  NEXT_PUBLIC_API_URL: {
    required: true,
    type: "url",
    default: "http://localhost:4000",
    description: "Backend API base URL",
  },
  NEXT_PUBLIC_APP_ENV: {
    choices: ["development", "staging", "production"],
    default: "development",
    description: "Public app environment identifier",
  },
  DATABASE_URL: {
    required: false,
    type: "url",
    description: "Database connection URL (if needed)",
  },
  NEXTAUTH_SECRET: {
    required: false,
    pattern: /^.{32,}$/,
    description: "NextAuth secret (32+ characters)",
  },
  NEXTAUTH_URL: {
    required: false,
    type: "url",
    description: "NextAuth base URL",
  },
};

/**
 * 클라이언트 사이드 환경변수 스키마 (NEXT_PUBLIC_* 만)
 */
export const CLIENT_ENV_SCHEMA: EnvironmentSchema = {
  NEXT_PUBLIC_API_URL: {
    required: true,
    type: "url",
    default: "http://localhost:4000",
    description: "Backend API base URL",
  },
  NEXT_PUBLIC_APP_ENV: {
    choices: ["development", "staging", "production"],
    default: "development",
    description: "Public app environment identifier",
  },
};

/**
 * 환경에 따른 적절한 스키마 선택
 */
function getAppropriateSchema(): EnvironmentSchema {
  // 클라이언트 사이드에서는 CLIENT_ENV_SCHEMA 사용
  if (typeof window !== "undefined") {
    return CLIENT_ENV_SCHEMA;
  }

  // 서버 사이드에서는 SERVER_ENV_SCHEMA 사용
  return SERVER_ENV_SCHEMA;
}

/**
 * 환경변수 검증 실행 및 결과 반환
 */
export function validateEnvironment(
  schema?: EnvironmentSchema
): ValidationResult {
  const selectedSchema = schema || getAppropriateSchema();
  const validator = new EnvironmentValidator(selectedSchema);
  const result = validator.validate();

  // 개발 모드에서는 항상 결과 출력
  if (process.env.NODE_ENV === "development") {
    EnvironmentValidator.printValidationResult(result);
  }

  return result;
}

/**
 * 환경변수 검증 및 애플리케이션 종료 (실패 시) - 서버 사이드 전용
 */
export function validateEnvironmentOrExit(
  schema?: EnvironmentSchema
): Record<string, string | number | boolean> {
  // 클라이언트에서는 실행하지 않음
  if (typeof window !== "undefined") {
    console.warn(
      "validateEnvironmentOrExit should only be called on server side"
    );
    return {};
  }

  const result = validateEnvironment(schema);

  if (!result.isValid) {
    console.error(
      "\n💥 Application cannot start due to environment validation errors"
    );
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.warn("\n⚠️  Application started with environment warnings");
  }

  return result.values;
}

/**
 * 타입 안전한 환경변수 접근
 */
export function createEnvAccessor<
  T extends Record<string, string | number | boolean>
>(validatedValues: T) {
  return {
    get<K extends keyof T>(key: K): T[K] {
      return validatedValues[key];
    },

    getString(key: keyof T): string {
      const value = validatedValues[key];
      return typeof value === "string" ? value : String(value);
    },

    getNumber(key: keyof T): number {
      const value = validatedValues[key];
      if (typeof value === "number") return value;
      const parsed = Number(value);
      if (isNaN(parsed)) {
        throw new Error(
          `Environment variable '${String(
            key
          )}' is not a valid number: ${value}`
        );
      }
      return parsed;
    },

    getBoolean(key: keyof T): boolean {
      const value = validatedValues[key];
      return Boolean(value);
    },

    getUrl(key: keyof T): URL {
      const value = this.getString(key);
      try {
        return new URL(value);
      } catch {
        throw new Error(
          `Environment variable '${String(key)}' is not a valid URL: ${value}`
        );
      }
    },
  };
}

// 레거시 호환성을 위한 alias
export const APP_ENV_SCHEMA = SERVER_ENV_SCHEMA;

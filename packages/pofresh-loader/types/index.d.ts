export interface ILoaderOptions {
    enableCache?: boolean;
    maxCacheSize?: number;
    validatePaths?: boolean;
    allowedPaths?: string[];
    enableSecurity?: boolean;
    enablePerformance?: boolean;
    enableRecovery?: boolean;
    strictMode?: boolean;
    profileOperations?: boolean;
    timeout?: number;
}

export interface ICacheStats {
    hits: number;
    misses: number;
    evictions: number;
    memoryUsage: number;
}

export interface IPerformanceMetrics {
    totalLoads: number;
    successfulLoads: number;
    failedLoads: number;
    averageLoadTime: number;
    cacheHits: number;
    cacheMisses: number;
    memoryUsage: number;
}

export interface ISecurityValidationResult {
    isValid: boolean;
    violations: Array<{
        type: string;
        message: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
}

export interface ILoaderError {
    message: string;
    code: string;
    path?: string;
    originalError?: string;
    timestamp: number;
}

export class LoaderError extends Error {
    public code: string;
    public path?: string;
    public originalError?: Error;

    constructor(message: string, code: string, path?: string, originalError?: Error);
}

export class PathValidationError extends LoaderError {
    constructor(message: string, path?: string);
}

export class ModuleLoadError extends LoaderError {
    constructor(message: string, path?: string, originalError?: Error);
}

export class CacheError extends LoaderError {
    constructor(message: string);
}

export interface ICacheManager {
    get(key: string): any;
    set(key: string, value: any): void;
    delete(key: string): void;
    clear(): void;
    has(key: string): boolean;
    size(): number;
    getStats(): ICacheStats;
}

export interface ISecurityValidator {
    validatePath(path: string, options?: { allowedBasePaths?: string[] }): ISecurityValidationResult;
    validateModule(module: any, filePath: string): ISecurityValidationResult;
    createSecureContext(context: any): any;
    getStats(): any;
}

export interface IPerformanceMonitor {
    recordLoad(operation: string, duration: number, success: boolean, metadata?: any): void;
    recordCache(operation: string, key: string, metadata?: any): void;
    startProfile(operation: string, context?: any): string;
    endProfile(profileId: string, result?: any): void;
    getMetrics(): IPerformanceMetrics;
    getReport(): any;
}

export interface IErrorHandler {
    handleError(error: Error, code: string, context?: any, options?: any): any;
    validateParams(params: any, required?: string[], types?: any): Error | null;
    safeCallback(cb: Function, err?: Error, result?: any): void;
    createTimeoutCallback(cb: Function, timeout: number, operation: string): any;
    safeAsyncOperation(fn: Function, cb: Function, operation?: string): void;
    safeJsonParse(jsonString: string, defaultValue?: any): any;
    isPathSafe(path: string): boolean;
    getMetrics(): any;
}
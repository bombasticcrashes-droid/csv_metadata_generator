
/**
 * Generation status enum
 * Provides type-safe status values
 */
export enum GenerationStatusEnum {
    PENDING = 'pending',
    GENERATING = 'generating',
    SUCCESS = 'success',
    ERROR = 'error',
}

/**
 * Batch operation type
 */
export enum BatchOperationType {
    GENERATE_ALL = 'generate_all',
    GENERATE_SELECTED = 'generate_selected',
}

/**
 * Export status
 */
export enum ExportStatus {
    IDLE = 'idle',
    PREPARING = 'preparing',
    READY = 'ready',
    ERROR = 'error',
}


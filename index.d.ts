export declare class NonError extends Error {
    name: string;
    constructor(message: unknown);
    private static _prepareSuperMessage;
}
export interface SerializeErrorOptions {
    maxDepth?: number;
    useToJSON?: boolean;
}
export declare function serializeError(value: unknown, options?: SerializeErrorOptions): unknown;
export interface DeserializeErrorOptions {
    maxDepth?: number;
}
export declare function deserializeError(value: any, options?: DeserializeErrorOptions): Error;
export declare function isErrorLike(value: unknown): value is Error;
export { addKnownErrorConstructor } from "./error-constructors.js";

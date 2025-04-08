type ErrorConstructorLike = new (...args: any[]) => Error;
export declare const errorConstructors: Map<string, ErrorConstructorLike>;
export declare function addKnownErrorConstructor(constructor: ErrorConstructorLike): void;
export {};

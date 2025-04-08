"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorConstructors = void 0;
exports.addKnownErrorConstructor = addKnownErrorConstructor;
const list = [
    // Native ES errors
    Error,
    EvalError,
    RangeError,
    ReferenceError,
    SyntaxError,
    TypeError,
    URIError,
    AggregateError,
    // Built-in errors (browser-specific)
    globalThis.DOMException,
    // Node-specific errors (may be undefined in browser)
    globalThis.AssertionError,
    globalThis.SystemError,
]
    .filter((ctor) => typeof ctor === "function")
    .map((constructor) => [constructor.name, constructor]);
exports.errorConstructors = new Map(list);
function addKnownErrorConstructor(constructor) {
    const name = constructor.name;
    if (exports.errorConstructors.has(name)) {
        throw new Error(`The error constructor "${name}" is already known.`);
    }
    try {
        // We create an instance to ensure compatibility
        new constructor();
    }
    catch (error) {
        throw new Error(`The error constructor "${name}" is not compatible.`, {
            cause: error instanceof Error ? error : undefined,
        });
    }
    exports.errorConstructors.set(name, constructor);
}
//# sourceMappingURL=error-constructors.js.map
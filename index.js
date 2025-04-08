"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addKnownErrorConstructor = exports.NonError = void 0;
exports.serializeError = serializeError;
exports.deserializeError = deserializeError;
exports.isErrorLike = isErrorLike;
const error_constructors_1 = require("./error-constructors");
class NonError extends Error {
    name = "NonError";
    constructor(message) {
        super(NonError._prepareSuperMessage(message));
    }
    static _prepareSuperMessage(message) {
        try {
            return JSON.stringify(message);
        }
        catch {
            return String(message);
        }
    }
}
exports.NonError = NonError;
const errorProperties = [
    { property: "name", enumerable: false },
    { property: "message", enumerable: false },
    { property: "stack", enumerable: false },
    { property: "code", enumerable: true },
    { property: "cause", enumerable: false },
    { property: "errors", enumerable: false },
];
const toJsonWasCalled = new WeakSet();
function toJSON(from) {
    toJsonWasCalled.add(from);
    const json = from.toJSON();
    toJsonWasCalled.delete(from);
    return json;
}
function newError(name, message) {
    const ErrorConstructor = (name ? error_constructors_1.errorConstructors.get(name) : null) ?? Error;
    return ErrorConstructor === AggregateError ? new ErrorConstructor([], message) : new ErrorConstructor(message);
}
function destroyCircular({ from, seen, to, forceEnumerable, maxDepth, depth, useToJSON, serialize }) {
    if (!to) {
        if (Array.isArray(from)) {
            to = [];
        }
        else if (!serialize && isErrorLike(from)) {
            to = newError(from.name);
        }
        else {
            to = {};
        }
    }
    seen.push(from);
    if (depth >= maxDepth) {
        return to;
    }
    if (useToJSON && typeof from.toJSON === "function" && !toJsonWasCalled.has(from)) {
        return toJSON(from);
    }
    const continueDestroyCircular = (value) => destroyCircular({
        from: value,
        seen: [...seen],
        forceEnumerable,
        maxDepth,
        depth,
        useToJSON,
        serialize,
    });
    for (const [key, value] of Object.entries(from)) {
        if (value && value instanceof Uint8Array && value.constructor.name === "Buffer") {
            to[key] = "[object Buffer]";
            continue;
        }
        if (value !== null && typeof value === "object" && typeof value.pipe === "function") {
            to[key] = "[object Stream]";
            continue;
        }
        if (typeof value === "function") {
            continue;
        }
        if (!value || typeof value !== "object") {
            try {
                to[key] = value;
            }
            catch {
                // No empty
            }
            continue;
        }
        if (!seen.includes(from[key])) {
            depth++;
            to[key] = continueDestroyCircular(from[key]);
            continue;
        }
        to[key] = "[Circular]";
    }
    if (serialize || to instanceof Error) {
        for (const { property, enumerable } of errorProperties) {
            if (from[property] !== undefined && from[property] !== null) {
                Object.defineProperty(to, property, {
                    value: isErrorLike(from[property]) || Array.isArray(from[property]) ? continueDestroyCircular(from[property]) : from[property],
                    enumerable: forceEnumerable ? true : enumerable,
                    configurable: true,
                    writable: true,
                });
            }
        }
    }
    return to;
}
function serializeError(value, options = {}) {
    const { maxDepth = Number.POSITIVE_INFINITY, useToJSON = true } = options;
    if (typeof value === "object" && value !== null) {
        return destroyCircular({
            from: value,
            seen: [],
            forceEnumerable: true,
            maxDepth,
            depth: 0,
            useToJSON,
            serialize: true,
        });
    }
    if (typeof value === "function") {
        return `[Function: ${value.name || "anonymous"}]`;
    }
    return value;
}
function deserializeError(value, options = {}) {
    const { maxDepth = Number.POSITIVE_INFINITY } = options;
    if (value instanceof Error) {
        return value;
    }
    if (isMinimumViableSerializedError(value)) {
        return destroyCircular({
            from: value,
            seen: [],
            to: newError(value.name, value.message),
            maxDepth,
            depth: 0,
            serialize: false,
        });
    }
    return new NonError(value);
}
function isErrorLike(value) {
    return Boolean(value) && typeof value === "object" && typeof value.name === "string" && typeof value.message === "string" && typeof value.stack === "string";
}
function isMinimumViableSerializedError(value) {
    return Boolean(value) && typeof value === "object" && typeof value.message === "string" && !Array.isArray(value);
}
var error_constructors_js_1 = require("./error-constructors.js");
Object.defineProperty(exports, "addKnownErrorConstructor", { enumerable: true, get: function () { return error_constructors_js_1.addKnownErrorConstructor; } });
//# sourceMappingURL=index.js.map
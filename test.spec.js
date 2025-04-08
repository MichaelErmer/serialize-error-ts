"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_buffer_1 = require("node:buffer");
const node_stream_1 = __importDefault(require("node:stream"));
const error_constructors_1 = require("./error-constructors");
const index_1 = require("./index");
function deserializeNonError(value) {
    const deserialized = (0, index_1.deserializeError)(value);
    expect(deserialized).toBeInstanceOf(Error);
    expect(deserialized.constructor.name).toBe("NonError");
    expect(deserialized.message).toBe(JSON.stringify(value));
}
test("main", () => {
    const serialized = (0, index_1.serializeError)(new Error("foo"));
    const properties = Object.keys(serialized);
    expect(properties).toEqual(expect.arrayContaining(["name", "stack", "message"]));
});
test("should destroy circular references", () => {
    const object = {};
    object.child = { parent: object };
    const serialized = (0, index_1.serializeError)(object);
    expect(typeof serialized).toBe("object");
    expect(serialized.child.parent).toBe("[Circular]");
});
test("should not affect the original object", () => {
    const object = {};
    object.child = { parent: object };
    const serialized = (0, index_1.serializeError)(object);
    expect(serialized).not.toBe(object);
    expect(object.child.parent).toBe(object);
});
test("should only destroy parent references", () => {
    const object = {};
    const common = { thing: object };
    object.one = { firstThing: common };
    object.two = { secondThing: common };
    const serialized = (0, index_1.serializeError)(object);
    expect(typeof serialized.one.firstThing).toBe("object");
    expect(typeof serialized.two.secondThing).toBe("object");
    expect(serialized.one.firstThing.thing).toBe("[Circular]");
    expect(serialized.two.secondThing.thing).toBe("[Circular]");
});
test("should work on arrays", () => {
    const object = {};
    const common = [object];
    const x = [common];
    const y = [["test"], common];
    y[0][1] = y;
    object.a = { x };
    object.b = { y };
    const serialized = (0, index_1.serializeError)(object);
    expect(Array.isArray(serialized.a.x)).toBe(true);
    expect(serialized.a.x[0][0]).toBe("[Circular]");
    expect(serialized.b.y[0][0]).toBe("test");
    expect(serialized.b.y[1][0]).toBe("[Circular]");
    expect(serialized.b.y[0][1]).toBe("[Circular]");
});
test("should discard nested functions", () => {
    function a() { }
    function b() { }
    a.b = b;
    const object = { a };
    const serialized = (0, index_1.serializeError)(object);
    expect(serialized).toEqual({});
});
test("should discard buffers", () => {
    const object = { a: node_buffer_1.Buffer.alloc(1) };
    const serialized = (0, index_1.serializeError)(object);
    expect(serialized).toEqual({ a: "[object Buffer]" });
});
test("should discard streams", () => {
    const types = [new node_stream_1.default.Stream(), new node_stream_1.default.Readable(), new node_stream_1.default.Writable(), new node_stream_1.default.Duplex(), new node_stream_1.default.Transform(), new node_stream_1.default.PassThrough()];
    for (const s of types) {
        expect((0, index_1.serializeError)({ s })).toEqual({ s: "[object Stream]" });
    }
});
test("should replace top-level functions with a helpful string", () => {
    function a() { }
    expect((0, index_1.serializeError)(a)).toBe("[Function: a]");
});
test("should drop functions", () => {
    function a() { }
    a.foo = "bar;";
    a.b = a;
    const object = { a };
    const serialized = (0, index_1.serializeError)(object);
    expect(serialized).toEqual({});
    expect(Object.prototype.hasOwnProperty.call(serialized, "a")).toBe(false);
});
test("should not access deep non-enumerable properties", () => {
    const error = new Error("some error");
    const object = {};
    Object.defineProperty(object, "someProp", {
        enumerable: false,
        get() {
            throw new Error("some other error");
        },
    });
    error.object = object;
    expect(() => (0, index_1.serializeError)(error)).not.toThrow();
});
test("should serialize nested errors", () => {
    const error = new Error("outer error");
    error.innerError = new Error("inner error");
    const serialized = (0, index_1.serializeError)(error);
    expect(serialized.message).toBe("outer error");
    expect(serialized.innerError).toMatchObject({
        name: "Error",
        message: "inner error",
    });
    expect(serialized.innerError instanceof Error).toBe(false);
});
test("should serialize the cause property", () => {
    const error = new Error("outer error", {
        cause: new Error("inner error", {
            cause: new Error("deeper error"),
        }),
    });
    const serialized = (0, index_1.serializeError)(error);
    expect(serialized.message).toBe("outer error");
    expect(serialized.cause).toMatchObject({
        name: "Error",
        message: "inner error",
        cause: {
            name: "Error",
            message: "deeper error",
        },
    });
});
test("should serialize AggregateError", () => {
    const error = new AggregateError([new Error("inner error")]);
    const serialized = (0, index_1.serializeError)(error);
    expect(serialized.message).toBe("");
    expect(Array.isArray(serialized.errors)).toBe(true);
    expect(serialized.errors[0]).toMatchObject({
        name: "Error",
        message: "inner error",
    });
});
test("should handle top-level null values", () => {
    expect((0, index_1.serializeError)(null)).toBeNull();
});
test("should deserialize primitives", () => {
    deserializeNonError(null);
    deserializeNonError(1);
    deserializeNonError(true);
    deserializeNonError("123");
    deserializeNonError([1]);
    deserializeNonError({});
});
test("should ignore Error instance", () => {
    const originalError = new Error("test");
    expect((0, index_1.deserializeError)(originalError)).toBe(originalError);
});
test("should deserialize error", () => {
    const deserialized = (0, index_1.deserializeError)({ message: "Stuff happened" });
    expect(deserialized).toBeInstanceOf(Error);
    expect(deserialized.name).toBe("Error");
    expect(deserialized.message).toBe("Stuff happened");
});
test("should deserialize and preserve existing properties", () => {
    const deserialized = (0, index_1.deserializeError)({
        message: "foo",
        customProperty: true,
    });
    expect(deserialized).toBeInstanceOf(Error);
    expect(deserialized.message).toBe("foo");
    expect(deserialized.customProperty).toBe(true);
});
for (const [name, CustomError] of error_constructors_1.errorConstructors) {
    test(`should deserialize and preserve the ${name} constructor`, () => {
        const deserialized = (0, index_1.deserializeError)({
            name,
            message: "foo",
        });
        expect(deserialized).toBeInstanceOf(CustomError);
        expect(deserialized.message).toBe("foo");
    });
}
test("should not allow adding incompatible or redundant error constructors", () => {
    expect(() => (0, error_constructors_1.addKnownErrorConstructor)(Error)).toThrow('The error constructor "Error" is already known.');
    expect(() => (0, error_constructors_1.addKnownErrorConstructor)(class BadError {
        constructor() {
            throw new Error("broken");
        }
    })).toThrow('The error constructor "BadError" is not compatible');
});
test("should deserialize plain object", () => {
    const object = {
        message: "error message",
        stack: "at <anonymous>:1:13",
        name: "name",
        code: "code",
    };
    const deserialized = (0, index_1.deserializeError)(object);
    expect(deserialized).toBeInstanceOf(Error);
    expect(deserialized.message).toBe("error message");
    expect(deserialized.stack).toBe("at <anonymous>:1:13");
    expect(deserialized.name).toBe("name");
    expect(deserialized.code).toBe("code");
});
for (const property of ["cause", "any"]) {
    test(`should deserialize errors on ${property} property`, () => {
        const object = {
            message: "error message",
            stack: "at <anonymous>:1:13",
            name: "name",
            code: "code",
            [property]: {
                message: "source error message",
                stack: "at <anonymous>:3:14",
                name: "name",
                code: "the apple",
                [property]: {
                    message: "original error message",
                    stack: "at <anonymous>:16:9",
                    name: "name",
                    code: "the snake",
                },
            },
        };
        const nested = (0, index_1.deserializeError)(object)[property];
        expect(nested).toBeInstanceOf(Error);
        expect(nested.message).toBe("source error message");
        const deepNested = nested[property];
        expect(deepNested).toBeInstanceOf(Error);
        expect(deepNested.message).toBe("original error message");
    });
}
// You can continue converting the remaining depth tests, custom .toJSON, Date, etc. similarly.
//# sourceMappingURL=test.spec.js.map
import { Buffer } from "node:buffer";
import Stream from "node:stream";
import { errorConstructors, addKnownErrorConstructor } from "./error-constructors";
import { serializeError, deserializeError } from "./index";

function deserializeNonError(value: unknown): void {
	const deserialized = deserializeError(value);
	expect(deserialized).toBeInstanceOf(Error);
	expect(deserialized.constructor.name).toBe("NonError");
	expect(deserialized.message).toBe(JSON.stringify(value));
}

test("main", () => {
	const serialized = serializeError(new Error("foo")) as Record<string, unknown>;
	const properties = Object.keys(serialized);
	expect(properties).toEqual(expect.arrayContaining(["name", "stack", "message"]));
});

test("should destroy circular references", () => {
	const object: any = {};
	object.child = { parent: object };
	const serialized = serializeError(object);
	expect(typeof serialized).toBe("object");
	expect((serialized as any).child.parent).toBe("[Circular]");
});

test("should not affect the original object", () => {
	const object: any = {};
	object.child = { parent: object };
	const serialized = serializeError(object);
	expect(serialized).not.toBe(object);
	expect(object.child.parent).toBe(object);
});

test("should only destroy parent references", () => {
	const object: any = {};
	const common = { thing: object };
	object.one = { firstThing: common };
	object.two = { secondThing: common };
	const serialized: typeof object = serializeError(object);
	expect(typeof serialized.one.firstThing).toBe("object");
	expect(typeof serialized.two.secondThing).toBe("object");
	expect(serialized.one.firstThing.thing).toBe("[Circular]");
	expect(serialized.two.secondThing.thing).toBe("[Circular]");
});

test("should work on arrays", () => {
	const object: any = {};
	const common = [object];
	const x = [common];
	const y = [["test"], common];
	y[0][1] = y;
	object.a = { x };
	object.b = { y };

	const serialized: typeof object = serializeError(object);
	expect(Array.isArray(serialized.a.x)).toBe(true);
	expect(serialized.a.x[0][0]).toBe("[Circular]");
	expect(serialized.b.y[0][0]).toBe("test");
	expect(serialized.b.y[1][0]).toBe("[Circular]");
	expect(serialized.b.y[0][1]).toBe("[Circular]");
});

test("should discard nested functions", () => {
	function a() {}
	function b() {}
	(a as any).b = b;
	const object = { a };
	const serialized = serializeError(object);
	expect(serialized).toEqual({});
});

test("should discard buffers", () => {
	const object = { a: Buffer.alloc(1) };
	const serialized = serializeError(object);
	expect(serialized).toEqual({ a: "[object Buffer]" });
});

test("should discard streams", () => {
	const types = [new Stream.Stream(), new Stream.Readable(), new Stream.Writable(), new Stream.Duplex(), new Stream.Transform(), new Stream.PassThrough()];

	for (const s of types) {
		expect(serializeError({ s })).toEqual({ s: "[object Stream]" });
	}
});

test("should replace top-level functions with a helpful string", () => {
	function a() {}
	expect(serializeError(a)).toBe("[Function: a]");
});

test("should drop functions", () => {
	function a() {}
	(a as any).foo = "bar;";
	(a as any).b = a;
	const object = { a };
	const serialized = serializeError(object);
	expect(serialized).toEqual({});
	expect(Object.prototype.hasOwnProperty.call(serialized, "a")).toBe(false);
});

test("should not access deep non-enumerable properties", () => {
	const error = new Error("some error");
	const object: any = {};
	Object.defineProperty(object, "someProp", {
		enumerable: false,
		get() {
			throw new Error("some other error");
		},
	});
	(error as any).object = object;
	expect(() => serializeError(error)).not.toThrow();
});

test("should serialize nested errors", () => {
	const error = new Error("outer error");
	(error as any).innerError = new Error("inner error");

	const serialized: any = serializeError(error);
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

	const serialized: any = serializeError(error);
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
	const serialized: any = serializeError(error);
	expect(serialized.message).toBe("");
	expect(Array.isArray(serialized.errors)).toBe(true);
	expect(serialized.errors[0]).toMatchObject({
		name: "Error",
		message: "inner error",
	});
});

test("should handle top-level null values", () => {
	expect(serializeError(null)).toBeNull();
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
	expect(deserializeError(originalError)).toBe(originalError);
});

test("should deserialize error", () => {
	const deserialized = deserializeError({ message: "Stuff happened" });
	expect(deserialized).toBeInstanceOf(Error);
	expect(deserialized.name).toBe("Error");
	expect(deserialized.message).toBe("Stuff happened");
});

test("should deserialize and preserve existing properties", () => {
	const deserialized = deserializeError({
		message: "foo",
		customProperty: true,
	}) as any;
	expect(deserialized).toBeInstanceOf(Error);
	expect(deserialized.message).toBe("foo");
	expect(deserialized.customProperty).toBe(true);
});

for (const [name, CustomError] of errorConstructors) {
	test(`should deserialize and preserve the ${name} constructor`, () => {
		const deserialized = deserializeError({
			name,
			message: "foo",
		});
		expect(deserialized).toBeInstanceOf(CustomError);
		expect(deserialized.message).toBe("foo");
	});
}

test("should not allow adding incompatible or redundant error constructors", () => {
	expect(() => addKnownErrorConstructor(Error)).toThrow('The error constructor "Error" is already known.');

	expect(() =>
		addKnownErrorConstructor(
			class BadError {
				constructor() {
					throw new Error("broken");
				}
			} as any,
		),
	).toThrow('The error constructor "BadError" is not compatible');
});

test("should deserialize plain object", () => {
	const object = {
		message: "error message",
		stack: "at <anonymous>:1:13",
		name: "name",
		code: "code",
	};
	const deserialized = deserializeError(object) as any;
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

		const nested = (deserializeError(object) as any)[property];
		expect(nested).toBeInstanceOf(Error);
		expect(nested.message).toBe("source error message");

		const deepNested = nested[property];
		expect(deepNested).toBeInstanceOf(Error);
		expect(deepNested.message).toBe("original error message");
	});
}

// You can continue converting the remaining depth tests, custom .toJSON, Date, etc. similarly.

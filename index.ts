import { errorConstructors } from "./error-constructors";

export class NonError extends Error {
	name = "NonError";

	constructor(message: unknown) {
		super(NonError._prepareSuperMessage(message));
	}

	private static _prepareSuperMessage(message: unknown): string {
		try {
			return JSON.stringify(message);
		} catch {
			return String(message);
		}
	}
}

interface ErrorProperty {
	property: keyof Error | "code" | "cause" | "errors";
	enumerable: boolean;
}

const errorProperties: ErrorProperty[] = [
	{ property: "name", enumerable: false },
	{ property: "message", enumerable: false },
	{ property: "stack", enumerable: false },
	{ property: "code", enumerable: true },
	{ property: "cause", enumerable: false },
	{ property: "errors", enumerable: false },
];

const toJsonWasCalled = new WeakSet<object>();

function toJSON(from: any): any {
	toJsonWasCalled.add(from);
	const json = from.toJSON();
	toJsonWasCalled.delete(from);
	return json;
}

function newError(name?: string, message?: string): Error {
	const ErrorConstructor = (name ? errorConstructors.get(name) : null) ?? Error;
	return ErrorConstructor === AggregateError ? new ErrorConstructor([], message) : new ErrorConstructor(message);
}

interface DestroyCircularOptions {
	from: any;
	to?: any;
	seen: any[];
	forceEnumerable?: boolean;
	maxDepth: number;
	depth: number;
	useToJSON?: boolean;
	serialize: boolean;
}

function destroyCircular({ from, seen, to, forceEnumerable, maxDepth, depth, useToJSON, serialize }: DestroyCircularOptions): any {
	if (!to) {
		if (Array.isArray(from)) {
			to = [];
		} else if (!serialize && isErrorLike(from)) {
			to = newError(from.name);
		} else {
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

	const continueDestroyCircular = (value: any) =>
		destroyCircular({
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

		if (value !== null && typeof value === "object" && typeof (value as any).pipe === "function") {
			to[key] = "[object Stream]";
			continue;
		}

		if (typeof value === "function") {
			continue;
		}

		if (!value || typeof value !== "object") {
			try {
				to[key] = value;
			} catch {
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

export interface SerializeErrorOptions {
	maxDepth?: number;
	useToJSON?: boolean;
}

export function serializeError(value: unknown, options: SerializeErrorOptions = {}): unknown {
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

export interface DeserializeErrorOptions {
	maxDepth?: number;
}

export function deserializeError(value: any, options: DeserializeErrorOptions = {}): Error {
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

export function isErrorLike(value: unknown): value is Error {
	return Boolean(value) && typeof value === "object" && typeof (value as Error).name === "string" && typeof (value as Error).message === "string" && typeof (value as Error).stack === "string";
}

function isMinimumViableSerializedError(value: any): boolean {
	return Boolean(value) && typeof value === "object" && typeof value.message === "string" && !Array.isArray(value);
}

export { addKnownErrorConstructor } from "./error-constructors.js";

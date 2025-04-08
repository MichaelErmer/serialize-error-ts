type ErrorConstructorLike = new (...args: any[]) => Error;

const list: [string, ErrorConstructorLike][] = [
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
	(globalThis as any).AssertionError,
	(globalThis as any).SystemError,
]
	.filter((ctor): ctor is ErrorConstructorLike => typeof ctor === "function")
	.map((constructor) => [constructor.name, constructor]);

export const errorConstructors = new Map<string, ErrorConstructorLike>(list);

export function addKnownErrorConstructor(constructor: ErrorConstructorLike): void {
	const name = constructor.name;

	if (errorConstructors.has(name)) {
		throw new Error(`The error constructor "${name}" is already known.`);
	}

	try {
		// We create an instance to ensure compatibility
		new constructor();
	} catch (error) {
		throw new Error(`The error constructor "${name}" is not compatible.`, {
			cause: error instanceof Error ? error : undefined,
		});
	}

	errorConstructors.set(name, constructor);
}

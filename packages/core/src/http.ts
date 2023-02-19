export async function handleErrors<T>(
  promise: Promise<T>
): Promise<{ success: true; data: T } | { success: false; data?: string }> {
  try {
    return { success: true, data: await promise };
  } catch (e) {
    // handle critical errors here, like connectivity, concurrency issues (with transaction) etc
    console.error(e);
    let error: string | undefined = undefined;
    if (typeof e === "string") {
      error = e;
    } else if (e instanceof Error) {
      error = e.message;
    }
    return {
      success: false,
      data: error,
    };
  }
}

export const ok = <T>(d: T) => ({
  statusCode: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(d),
});

export const badRequest = <T>(d: T) => ({
  statusCode: 400,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(d),
});

export const updated = () => ({
  statusCode: 204,
  headers: { "Content-Type": "application/json" },
});

export const created = <T>(d: T) => ({
  statusCode: 201,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(d),
});

export const internalServerError = <T>(d: T) => ({
  statusCode: 500,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(d),
});

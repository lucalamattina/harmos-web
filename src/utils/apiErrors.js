/**
 * Parse the backend error envelope produced by GlobalExceptionHandler.
 *
 * Possible response shapes:
 *   - { error: "message" }                                 (RuntimeException / NoSuchElement)
 *   - { errors: { fieldName: "msg", ... } }                (MethodArgumentNotValid — 400)
 *   - { message: "..." }                                   (legacy)
 *
 * @param {unknown} err Axios error (or other thrown error)
 * @param {string} [fallback] Default message when nothing parseable is found
 * @returns {{ fieldErrors: Record<string,string>, message: string, status: (number|null) }}
 */
export function parseApiError(err, fallback = 'Ocurrió un error inesperado') {
    const status = err && err.response && typeof err.response.status === 'number' ? err.response.status : null;
    const data = err && err.response ? err.response.data : undefined;

    if (data && typeof data === 'object') {
        if (data.errors && typeof data.errors === 'object') {
            const values = Object.values(data.errors);
            const firstMsg = typeof values[0] === 'string' ? values[0] : fallback;
            return { fieldErrors: data.errors, message: firstMsg, status };
        }
        if (typeof data.error === 'string') {
            return { fieldErrors: {}, message: data.error, status };
        }
        if (typeof data.message === 'string') {
            return { fieldErrors: {}, message: data.message, status };
        }
    }
    return { fieldErrors: {}, message: fallback, status };
}

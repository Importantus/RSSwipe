/**
 * Error responses of the backend: `{ message, code, errors? }`.
 * `message` is always a readable sentence, `code` is stable (`validation_error`, `not_authorized`, `forbidden`,
 * `not_found`, `bad_request`, `invalid_json`, `payload_too_large`, `extraction_failed`, `internal_error`, `route_not_found`).
 */
export interface ApiErrorBody {
    message: string
    code: string
    errors?: { field: string, message: string }[]
}

async function bodyOf(error: any): Promise<Partial<ApiErrorBody> | undefined> {
    const data = error?.response?.data
    // error responses are Blobs when the request used responseType 'blob'
    if (data instanceof Blob) {
        try {
            return JSON.parse(await data.text())
        } catch {
            return undefined
        }
    }
    return typeof data === 'object' ? data : undefined
}

/** Text to show the user for a failed request; never throws, also covers network errors without response. */
export async function apiErrorMessage(error: any, fallback: string): Promise<string> {
    const body = await bodyOf(error)
    if (body?.code === 'validation_error' && body.errors?.length) {
        return body.errors.map(e => `${e.field}: ${e.message}`).join(', ')
    }
    return body?.message ?? fallback
}

export async function apiErrorCode(error: any): Promise<string | undefined> {
    return (await bodyOf(error))?.code
}

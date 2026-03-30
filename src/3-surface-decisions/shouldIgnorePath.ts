const regexCache: Record<string, RegExp> = {}

export default function shouldIgnorePath(request: Request, env: Env): boolean {
    if (!env.SURFACE_DECISIONS_IGNORE_PATHS) {
        return false
    }

    const { pathname } = new URL(request.url)
    const patterns = env.SURFACE_DECISIONS_IGNORE_PATHS?.split(',') ?? []
    for (const raw of patterns) {
        const pattern = raw.trim()
        if (!pattern) {
            continue
        }
        try {
            if ((regexCache[pattern] ??= new RegExp(pattern)).test(pathname)) {
                return true
            }
        } catch {
            console.warn(`Invalid SURFACE_DECISIONS_IGNORE_PATHS regex pattern: ${pattern}`)
        }
    }

    return false
}

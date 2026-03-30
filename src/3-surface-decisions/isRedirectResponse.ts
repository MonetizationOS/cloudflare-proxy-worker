export default function isRedirectResponse(response: Response): boolean {
    return response.status >= 300 && response.status < 400
}

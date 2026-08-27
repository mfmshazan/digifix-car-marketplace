import { API_BASE_URL } from '../config';

/**
 * Resolves media paths (e.g. /uploads/profile-8.jpg) to full accessible URLs.
 */
export function resolveMediaUrl(path) {
    if (!path || typeof path !== 'string') return null;
    const trimmed = path.trim();
    if (!trimmed) return null;

    // Already full or self-contained URL
    if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('blob:')
    ) {
        return trimmed;
    }

    // Local file path (from ImagePicker staging)
    if (trimmed.startsWith('file://')) {
        return trimmed;
    }

    const baseOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${baseOrigin}${cleanPath}`;
}

export default resolveMediaUrl;

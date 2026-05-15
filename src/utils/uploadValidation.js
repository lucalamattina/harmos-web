// Allowed extension -> required MIME for document uploads.
// Mirrors backend CloudinaryService.isValidDocument allowlist (extension AND MIME).
export const ALLOWED_DOCUMENT_TYPES = {
    pdf:  'application/pdf',
    doc:  'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt:  'text/plain',
    xls:  'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt:  'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

// Image MIMEs accepted by the announcement image upload flow.
export const ALLOWED_IMAGE_TYPES = {
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    png:  'image/png',
    gif:  'image/gif',
};

// HTML accept attribute strings, ready to drop into <input type="file" accept="..." />
export const DOC_ACCEPT_ATTR = Object.keys(ALLOWED_DOCUMENT_TYPES).map(e => '.' + e).join(',');
export const IMG_ACCEPT_ATTR = 'image/*';

/**
 * Validate a single File against a {extension: requiredMime} allowlist.
 * Backend now requires BOTH extension AND MIME to match — replicate here so we
 * reject before upload instead of getting a 400 from the server.
 *
 * @param {File} file
 * @param {Record<string,string>} allowlist
 * @returns {string|null} Spanish error message or null if the file is valid
 */
export function validateFile(file, allowlist) {
    if (!file) return null;
    const parts = (file.name || '').split('.');
    const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
    const expectedMime = allowlist[ext];
    if (!expectedMime) {
        return `Extensión no permitida: .${ext || '(sin extensión)'}. Permitidas: ${Object.keys(allowlist).join(', ')}`;
    }
    if (file.type && file.type !== expectedMime) {
        return `El tipo MIME (${file.type}) no coincide con la extensión .${ext}.`;
    }
    return null;
}

/**
 * Run validateFile across a FileList/array; returns an array of human-readable
 * errors, one per offending file. Empty array means all files are valid.
 * @param {Iterable<File>} files
 * @param {Record<string,string>} allowlist
 * @returns {string[]}
 */
export function validateFiles(files, allowlist) {
    const errors = [];
    if (!files) return errors;
    for (const f of files) {
        const e = validateFile(f, allowlist);
        if (e) errors.push(`${f.name}: ${e}`);
    }
    return errors;
}

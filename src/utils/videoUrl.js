/**
 * Understands the video links the ministry uses (Vimeo incl. unlisted "hash" links, YouTube,
 * or a file uploaded to this site) and turns them into a clean, consistent record.
 */
const fetch = require('node-fetch');

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

function parseVideoUrl(input) {
    const raw = String(input || '').trim();
    if (!raw) return null;

    // Files uploaded through the admin panel
    if (raw.startsWith('/api/upload/file/') || raw.startsWith('/uploads/')) {
        return { provider: 'file', externalId: raw, url: raw };
    }

    let u;
    try {
        u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    } catch {
        return null;
    }
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    const host = u.hostname.toLowerCase().replace(/^www\./, '');

    // ── Vimeo ── vimeo.com/123, vimeo.com/123/abcdef (unlisted), player.vimeo.com/video/123?h=abcdef,
    //             vimeo.com/channels/x/123, vimeo.com/groups/x/videos/123
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
        const parts = u.pathname.split('/').filter(Boolean);
        const idIdx = parts.findIndex(p => /^\d{5,}$/.test(p));
        if (idIdx === -1) return null;
        const id = parts[idIdx];
        let hash = u.searchParams.get('h');
        const next = parts[idIdx + 1];
        if (!hash && next && /^[a-f0-9]{8,}$/i.test(next)) hash = next;
        return {
            provider: 'vimeo',
            externalId: id,
            hash: hash || null,
            url: `https://vimeo.com/${id}${hash ? `/${hash}` : ''}`,
        };
    }

    // ── YouTube ──
    if (host === 'youtu.be') {
        const id = u.pathname.split('/').filter(Boolean)[0];
        return YT_ID.test(id || '') ? { provider: 'youtube', externalId: id, url: `https://www.youtube.com/watch?v=${id}` } : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
        let id = u.searchParams.get('v');
        const parts = u.pathname.split('/').filter(Boolean);
        if (!id && ['embed', 'shorts', 'live', 'v'].includes(parts[0])) id = parts[1];
        return YT_ID.test(id || '') ? { provider: 'youtube', externalId: id, url: `https://www.youtube.com/watch?v=${id}` } : null;
    }

    // Anything else is kept as a plain link (e.g. a direct .mp4) — but it must look like a real web address
    if (!host.includes('.')) return null;
    return { provider: 'other', externalId: u.href, url: u.href };
}

function formatDuration(seconds) {
    const s = Math.max(0, Math.round(Number(seconds) || 0));
    if (!s) return '';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

/** Looks up title / thumbnail / length from Vimeo or YouTube. Only ever calls those two fixed hosts. */
async function oembed(parsed) {
    if (!parsed) return null;
    let endpoint;
    if (parsed.provider === 'vimeo') {
        endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(parsed.url)}`;
    } else if (parsed.provider === 'youtube') {
        endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(parsed.url)}`;
    } else {
        return null;
    }
    try {
        const res = await fetch(endpoint, { timeout: 8000, headers: { 'User-Agent': 'OMS-Admin/1.0' } });
        if (!res.ok) return { error: res.status === 403 || res.status === 404 ? 'Private or restricted video — details could not be read. You can still type them in.' : `Lookup failed (${res.status})` };
        const j = await res.json();
        return {
            title: j.title || '',
            description: j.description || '',
            thumbnail: j.thumbnail_url_with_play_button ? (j.thumbnail_url || '') : (j.thumbnail_url || ''),
            duration: formatDuration(j.duration),
            durationSeconds: Number(j.duration) || 0,
            author: j.author_name || '',
        };
    } catch (e) {
        return { error: 'Could not reach the video site to read details. You can still type them in.' };
    }
}

module.exports = { parseVideoUrl, oembed, formatDuration };

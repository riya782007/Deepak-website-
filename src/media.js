// Shared by the website and the admin console: how a resource's link or file is shown.
export const RESOURCE_KINDS = ['Update', 'PDF', 'Video', 'Image', 'Link'];
export const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime';

export function youtubeId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : '';
}
export function vimeoId(url) {
  const m = String(url || '').match(/vimeo\.com\/(?:video\/)?(\d{6,12})/);
  return m ? m[1] : '';
}
// A privacy-friendly player address for YouTube or Vimeo links, or '' for anything else.
export function embedUrl(url) {
  const y = youtubeId(url);
  if (y) return `https://www.youtube-nocookie.com/embed/${y}?rel=0`;
  const v = vimeoId(url);
  if (v) return `https://player.vimeo.com/video/${v}?dnt=1`;
  return '';
}
export function thumbUrl(r) {
  if (r.kind === 'Image' && r.url) return r.url;
  const y = youtubeId(r.url);
  return y ? `https://i.ytimg.com/vi/${y}/hqdefault.jpg` : '';
}
export function kindForType(type) {
  if (/^image\//.test(type)) return 'Image';
  if (/^video\//.test(type)) return 'Video';
  if (type === 'application/pdf') return 'PDF';
  return '';
}
export function fileSize(n) {
  n = +n || 0;
  return n >= 1048576 ? `${(n / 1048576).toFixed(n >= 10485760 ? 0 : 1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : n ? `${n} B` : '';
}
export const safeHttp = u => (/^(https?:|data:image\/|data:application\/pdf|data:video\/|\/)/i.test(String(u || '')) ? String(u) : '');

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function cleanText(value, maxLength, field, options) {
  const settings = options || {};
  const text = value === undefined || value === null ? '' : String(value).trim();
  if (settings.required && !text) throw new Error(field + ' is required.');
  if (text.length > maxLength) throw new Error(field + ' must be ' + maxLength + ' characters or fewer.');
  return text;
}

function cleanSlug(value) {
  const slug = cleanText(value, 80, 'Slug', { required: true }).toLowerCase();
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error('Slug may contain lowercase letters, numbers, and single hyphens only.');
  }
  return slug;
}

function cleanImageUrl(value, field, required) {
  const url = cleanText(value, 500, field, { required: Boolean(required) });
  if (!url) return '';
  if (/^https:\/\//i.test(url)) {
    let parsed;
    try { parsed = new URL(url); } catch (error) { throw new Error(field + ' must be a valid https:// URL or a safe local image path.'); }
    if (parsed.protocol !== 'https:') throw new Error(field + ' must use https://.');
    return url;
  }
  if (!/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(url) || url.split('/').some(function (part) { return part === '.' || part === '..'; })) {
    throw new Error(field + ' must be an https:// URL or a safe local image path.');
  }
  return url;
}

function cleanSortOrder(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 100000) {
    throw new Error('Display order must be a whole number between 0 and 100000.');
  }
  return number;
}

function cleanHeroOrder(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 10) {
    throw new Error('Hero order must be blank or a whole number from 1 to 10.');
  }
  return number;
}

function cleanArtist(body, fallback) {
  const current = fallback || {};
  return {
    slug: cleanSlug(body.slug === undefined ? current.slug : body.slug),
    name: cleanText(body.name === undefined ? current.name : body.name, 120, 'Artist name', { required: true }),
    roleLabel: cleanText(body.roleLabel === undefined ? current.roleLabel : body.roleLabel, 120, 'Role', { required: true }),
    bio: cleanText(body.bio === undefined ? current.bio : body.bio, 1600, 'Bio'),
    portraitUrl: cleanImageUrl(body.portraitUrl === undefined ? current.portraitUrl : body.portraitUrl, 'Portrait URL', false),
    portraitAlt: cleanText(body.portraitAlt === undefined ? current.portraitAlt : body.portraitAlt, 200, 'Portrait description'),
    sortOrder: cleanSortOrder(body.sortOrder === undefined ? current.sortOrder : body.sortOrder, 100)
  };
}

function cleanArtwork(body, fallback) {
  const current = fallback || {};
  const category = cleanText(body.category === undefined ? current.category : body.category, 30, 'Category', { required: true }).toLowerCase();
  if (!['worlds', 'characters', 'machines'].includes(category)) {
    throw new Error('Choose Worlds, Characters, or Machines for the category.');
  }
  const orientation = cleanText(body.orientation === undefined ? current.orientation : body.orientation, 20, 'Orientation', { required: true }).toLowerCase();
  if (!['portrait', 'landscape'].includes(orientation)) throw new Error('Orientation must be Portrait or Landscape.');
  const wideValue = body.wide === undefined ? current.wide : body.wide;
  const wide = wideValue === true || wideValue === 1 || wideValue === '1' || wideValue === 'true' || wideValue === 'on';

  return {
    slug: cleanSlug(body.slug === undefined ? current.slug : body.slug),
    artistSlug: cleanSlug(body.artistSlug === undefined ? current.artistSlug : body.artistSlug),
    cardTitle: cleanText(body.cardTitle === undefined ? current.cardTitle : body.cardTitle, 160, 'Card title', { required: true }),
    dialogTitle: cleanText(body.dialogTitle === undefined ? current.dialogTitle : body.dialogTitle, 200, 'Detail title', { required: true }),
    meta: cleanText(body.meta === undefined ? current.meta : body.meta, 255, 'Artwork metadata'),
    description: cleanText(body.description === undefined ? current.description : body.description, 2400, 'Description'),
    category,
    orientation,
    wide,
    imageUrl: cleanImageUrl(body.imageUrl === undefined ? current.imageUrl : body.imageUrl, 'Image URL', true),
    imageAlt: cleanText(body.imageAlt === undefined ? current.imageAlt : body.imageAlt, 300, 'Image description'),
    heroOrder: cleanHeroOrder(body.heroOrder === undefined ? current.heroOrder : body.heroOrder),
    sortOrder: cleanSortOrder(body.sortOrder === undefined ? current.sortOrder : body.sortOrder, 100)
  };
}

module.exports = { cleanText, cleanSlug, cleanImageUrl, cleanSortOrder, cleanHeroOrder, cleanArtist, cleanArtwork };
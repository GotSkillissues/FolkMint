const CLOUDINARY_BASE_SEGMENT = '/image/upload/';

export const toCloudinaryThumbnail = (url, options = {}) => {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') || !url.includes(CLOUDINARY_BASE_SEGMENT)) return url;

  const {
    width = 640,
    height = 800,
    crop = 'limit',
    quality = 'auto',
    format = 'auto',
  } = options;

  const [prefix, rest] = url.split(CLOUDINARY_BASE_SEGMENT);
  if (!rest) return url;

  const transformations = [`f_${format}`, `q_${quality}`, `c_${crop}`, `w_${width}`, `h_${height}`].join(',');

  if (rest.startsWith('f_') || rest.startsWith('q_') || rest.startsWith('c_') || rest.startsWith('w_')) {
    return url;
  }

  return `${prefix}${CLOUDINARY_BASE_SEGMENT}${transformations}/${rest}`;
};

export const getCardImageUrl = (product, options = {}) => {
  const topLevelImages = Array.isArray(product?.images) ? product.images : [];
  const primaryTopLevel = topLevelImages.find((image) => image?.is_primary);

  const direct =
    primaryTopLevel?.secure_url ||
    primaryTopLevel?.image_url ||
    primaryTopLevel?.source_url ||
    topLevelImages[0]?.secure_url ||
    topLevelImages[0]?.image_url ||
    topLevelImages[0]?.source_url ||
    product?.variants?.[0]?.images?.find((image) => image?.is_primary)?.image_url ||
    product?.variants?.[0]?.images?.[0]?.image_url ||
    product?.thumbnail_url ||
    product?.source_thumbnail_url ||
    product?.image_url ||
    product?.image ||
    product?.source_image_urls?.[0] ||
    '';

  return toCloudinaryThumbnail(direct, options);
};

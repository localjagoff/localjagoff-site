// This storefront uses ordinary img tags, not the Next image optimizer.
module.exports = {
  images: { unoptimized: true },
  async headers() {
    return process.env.COMMERCE_ENV === 'preview' ? [{
      source: '/:path*',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
    }] : [];
  },
};

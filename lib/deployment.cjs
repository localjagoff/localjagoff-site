function isProduction(env = process.env) {
  // Netlify's CONTEXT is build-only. Use explicitly scoped runtime configuration
  // and a pinned production site ID; a review site must never inherit live access.
  if (env.SITE_ID) return env.COMMERCE_ENV === 'production' &&
    Boolean(env.COMMERCE_PRODUCTION_SITE_ID) && env.SITE_ID === env.COMMERCE_PRODUCTION_SITE_ID;
  return env.VERCEL_ENV === 'production';
}

module.exports = {isProduction};

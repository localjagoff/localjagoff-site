function isCloudflare(env = process.env) {
  return env.CLOUDFLARE_WORKER_NAME!==undefined || env.COMMERCE_PRODUCTION_WORKER!==undefined;
}
function isProduction(env = process.env) {
  if(isCloudflare(env))return env.COMMERCE_ENV==='production' &&
    env.CLOUDFLARE_WORKER_NAME==='localjagoff-production' &&
    env.COMMERCE_PRODUCTION_WORKER==='localjagoff-production' &&
    env.SITE_URL==='https://www.localjagoff.com';
  // Netlify's CONTEXT is build-only. Use explicitly scoped runtime configuration
  // and a pinned production site ID; a review site must never inherit live access.
  if (env.SITE_ID) return env.COMMERCE_ENV === 'production' &&
    Boolean(env.COMMERCE_PRODUCTION_SITE_ID) && env.SITE_ID === env.COMMERCE_PRODUCTION_SITE_ID;
  return env.VERCEL_ENV === 'production';
}

module.exports = {isProduction,isCloudflare};

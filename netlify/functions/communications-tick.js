import communications from '../../lib/netlify-communications.cjs';
export default async () => { await communications.trigger(); };
export const config={schedule:'*/5 * * * *'};

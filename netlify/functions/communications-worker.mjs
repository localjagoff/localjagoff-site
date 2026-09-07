import communications from '../../lib/netlify-communications.cjs';
export default async request => { await communications.work(request); };
export const config={background:true};

import verification from '../../lib/owner-mail-verification.cjs';

export default async request => {
  try { return await verification.verify(request); }
  catch { return Response.json({outcome: 'incomplete_retry_same_job'}, {status: 503}); }
};

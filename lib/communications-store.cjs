const crypto = require('node:crypto');
const { neon } = require('@neondatabase/serverless');

const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
const hash = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(canonical(value))).digest('hex');
function createStore(env = process.env) {
  if (env.COMMUNICATIONS_ENABLED !== 'true' || !env.DATABASE_URL) throw new Error('communications_unavailable');
  const sql = neon(env.DATABASE_URL);
  const query = (text, params = []) => sql.query(text, params,{fetchOptions:{signal:AbortSignal.timeout(15000)}});
  return {
    sql, query,
    async order(reference) { return (await query('SELECT * FROM comm_orders WHERE reference=$1', [reference]))[0]; },
    async hasJob(key) { return (await query('SELECT key FROM comm_outbox WHERE key=$1', [key])).length > 0; },
    async startOwner({reference,session,customer,items,summary,payload}) {
      // Persist the paid-order warning before fulfillment, including a crash-safe deadline.
      await sql.transaction([
        sql.query(`INSERT INTO comm_orders(reference,session_id,customer,items,owner_summary)
          VALUES($1,$2,$3,$4,$5) ON CONFLICT(reference) DO UPDATE
          SET owner_summary=coalesce(comm_orders.owner_summary,EXCLUDED.owner_summary)`,
          [reference,session.id,JSON.stringify(customer),JSON.stringify(items),JSON.stringify(summary)]),
        sql.query(`INSERT INTO comm_outbox(key,kind,order_ref,payload,payload_hash,next_attempt_at)
          VALUES($1,'owner_alert',$2,$3,$4,now()+interval '5 minutes') ON CONFLICT DO NOTHING`,
          [`owner/${reference}`,reference,JSON.stringify(payload),hash(payload)]),
      ],{fetchOptions:{signal:AbortSignal.timeout(15000)}});
    },
    async resolveOwner(reference,payload,recoveryPayload) {
      await sql.transaction([
        // Never change a payload after a sender can have submitted its idempotency key.
        sql.query(`UPDATE comm_outbox SET kind='owner_order',payload=$2,payload_hash=$3,next_attempt_at=now()
          WHERE key=$1 AND kind='owner_alert' AND status='pending' AND first_attempt_at IS NULL`,
          [`owner/${reference}`,JSON.stringify(payload),hash(payload)]),
        sql.query(`INSERT INTO comm_outbox(key,kind,order_ref,payload,payload_hash)
          SELECT $1,'owner_recovery',$2,$3,$4 FROM comm_outbox
          WHERE key=$5 AND kind='owner_alert' AND (first_attempt_at IS NOT NULL OR status IN ('sending','sent','held'))
          ON CONFLICT DO NOTHING`,
          [`owner-recovery/${reference}`,reference,JSON.stringify(recoveryPayload),hash(recoveryPayload),`owner/${reference}`]),
      ],{fetchOptions:{signal:AbortSignal.timeout(15000)}});
    },
    async expediteOwner(reference) {
      await query(`UPDATE comm_outbox SET next_attempt_at=now() WHERE key=$1
        AND kind='owner_alert' AND status='pending' AND first_attempt_at IS NULL`,[`owner/${reference}`]);
    },
    async recordPaid({reference,session,customer,items,payload,alreadySent,receiptUncertain=false}) {
      await sql.transaction([
        sql.query('INSERT INTO comm_orders(reference,session_id,customer,items) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
          [reference,session.id,JSON.stringify(customer),JSON.stringify(items)]),
        sql.query(`INSERT INTO comm_outbox(key,kind,order_ref,payload,payload_hash,status,sent_at,last_error)
          VALUES($1,'receipt',$2,$3,$4,$5,CASE WHEN $5='sent' THEN now() ELSE NULL END,$6) ON CONFLICT DO NOTHING`,
          [`receipt/${reference}`,reference,JSON.stringify(payload),hash(payload),alreadySent?'sent':receiptUncertain?'held':'pending',receiptUncertain?'historical_receipt_requires_review':null]),
      ],{fetchOptions:{signal:AbortSignal.timeout(15000)}});
    },
    async link(reference, id) {
      const result = await query(`UPDATE comm_orders SET printful_id=$2,unresolved=false,updated_at=now()
        WHERE reference=$1 AND (printful_id IS NULL OR printful_id=$2) RETURNING reference`, [reference,id]);
      if (!result.length) throw new Error('communication_order_link_conflict');
    },
    async contact(fields, challenge, ipHash, emailHash, payload) {
      const result = await query('SELECT comm_accept_contact($1,$2,$3,$4,$5,$6,$7) AS outcome',
        [fields.requestId,hash(fields),hash(challenge),ipHash,emailHash,JSON.stringify(payload),hash(payload)]);
      return result[0].outcome;
    },
    async enqueue(key,kind,reference,payload) {
      await query(`INSERT INTO comm_outbox(key,kind,order_ref,payload,payload_hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [key,kind,reference,JSON.stringify(payload),hash(payload)]);
    },
    async claim(key) {
      // A lease is longer than provider timeout; expired leases reuse the same send key.
      return (await query(`WITH candidate AS (
        SELECT key FROM comm_outbox WHERE ($1::text IS NULL OR key=$1)
        AND ((status='pending' AND next_attempt_at<=now()) OR (status='sending' AND lease_until<now()))
        ORDER BY CASE kind WHEN 'owner_alert' THEN 0 WHEN 'owner_order' THEN 1 WHEN 'owner_recovery' THEN 1
          WHEN 'receipt' THEN 2 WHEN 'contact' THEN 3 WHEN 'review' THEN 5 ELSE 4 END,created_at
        FOR UPDATE SKIP LOCKED LIMIT 1)
        UPDATE comm_outbox j SET status='sending',claim_token=$2,lease_until=now()+interval '5 minutes',
          attempts=attempts+1
        FROM candidate WHERE j.key=candidate.key RETURNING j.*`, [key||null,crypto.randomUUID()]))[0];
    },
    async markAttempt(job) {
      const rows=await query(`UPDATE comm_outbox SET first_attempt_at=coalesce(first_attempt_at,now())
        WHERE key=$1 AND claim_token=$2 AND status='sending' RETURNING first_attempt_at`,[job.key,job.claim_token]);
      if (!rows.length) throw new Error('outbox_claim_lost');
      return rows[0].first_attempt_at;
    },
    async finish(job,status,{providerId=null,error=null,delay=0}={}) {
      const result = await query(`UPDATE comm_outbox SET status=$3,provider_id=coalesce($4,provider_id),last_error=$5,
        sent_at=CASE WHEN $3='sent' THEN now() ELSE sent_at END,next_attempt_at=now()+($6*interval '1 second'),
        lease_until=NULL,claim_token=NULL WHERE key=$1 AND claim_token=$2 AND status='sending' RETURNING key`,
        [job.key,job.claim_token,status,providerId,error,delay]);
      if (!result.length) throw new Error('outbox_claim_lost');
    },
    async mailQuota() { return (await query("SELECT comm_take_rate('mail-attempts',86400,80) AS allowed"))[0].allowed; },
    async cleanup() {
      await sql.transaction([
        sql.query("DELETE FROM comm_rate WHERE window_start<now()-interval '2 days'"),
        sql.query("DELETE FROM comm_contact_requests WHERE created_at<now()-interval '30 days'"),
        sql.query("UPDATE comm_outbox SET payload=NULL WHERE status IN ('sent','suppressed') AND coalesce(sent_at,created_at)<now()-interval '30 days'"),
        sql.query(`UPDATE comm_orders o SET owner_summary=NULL WHERE unresolved=false
          AND updated_at<now()-interval '30 days' AND NOT EXISTS
          (SELECT 1 FROM comm_outbox j WHERE j.order_ref=o.reference AND j.status NOT IN ('sent','suppressed'))`),
        sql.query(`UPDATE comm_orders o SET customer='{}',review_token_hash=NULL,review_expires_at=NULL
          WHERE updated_at<now()-interval '180 days' AND unresolved=false
          AND (review_expires_at IS NULL OR review_expires_at<now())
          AND NOT EXISTS(SELECT 1 FROM comm_outbox j WHERE j.order_ref=o.reference AND j.status NOT IN ('sent','suppressed'))`),
        sql.query("DELETE FROM comm_events WHERE created_at<now()-interval '180 days'"),
      ],{fetchOptions:{signal:AbortSignal.timeout(15000)}});
    },
  };
}
module.exports = {createStore,hash};

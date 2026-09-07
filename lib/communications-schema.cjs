module.exports = [
`CREATE TABLE IF NOT EXISTS comm_orders (
 reference text PRIMARY KEY, session_id text UNIQUE NOT NULL, customer jsonb NOT NULL,
 items jsonb NOT NULL, printful_id bigint, unresolved boolean NOT NULL DEFAULT true,
 review_token_hash text UNIQUE, review_expires_at timestamptz, review_invited_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
)`,
`CREATE TABLE IF NOT EXISTS comm_outbox (
 key text PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('receipt','processing','shipment','review','contact')),
 order_ref text REFERENCES comm_orders(reference), payload jsonb,
 payload_hash text NOT NULL, status text NOT NULL DEFAULT 'pending'
 CHECK (status IN ('pending','sending','sent','held','suppressed')),
 attempts integer NOT NULL DEFAULT 0, first_attempt_at timestamptz,
 next_attempt_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, claim_token uuid,
 provider_id text, last_error text, created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz
)`,
`CREATE INDEX IF NOT EXISTS comm_outbox_due ON comm_outbox(next_attempt_at) WHERE status IN ('pending','sending')`,
`ALTER TABLE comm_outbox DROP CONSTRAINT IF EXISTS comm_outbox_kind_check`,
`ALTER TABLE comm_outbox ADD CONSTRAINT comm_outbox_kind_check CHECK
 (kind IN ('receipt','processing','shipment','review','contact','owner_alert','owner_order','owner_recovery'))`,
`ALTER TABLE comm_orders ADD COLUMN IF NOT EXISTS owner_summary jsonb`,
`ALTER TABLE comm_orders ADD COLUMN IF NOT EXISTS delivery jsonb`,
`ALTER TABLE comm_orders ADD COLUMN IF NOT EXISTS suppress_reviews boolean NOT NULL DEFAULT false`,
`ALTER TABLE comm_orders ADD COLUMN IF NOT EXISTS review_due_at timestamptz`,
`ALTER TABLE comm_orders ADD COLUMN IF NOT EXISTS last_checked_at timestamptz`,
`CREATE TABLE IF NOT EXISTS comm_rate (bucket text NOT NULL, window_start timestamptz NOT NULL,
 count integer NOT NULL, PRIMARY KEY(bucket,window_start))`,
`CREATE TABLE IF NOT EXISTS comm_contact_requests (id uuid PRIMARY KEY, request_hash text NOT NULL,
 challenge_hash text UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
`CREATE TABLE IF NOT EXISTS comm_events (identity text PRIMARY KEY, order_ref text NOT NULL,
 kind text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
`CREATE TABLE IF NOT EXISTS comm_reviews (id uuid PRIMARY KEY, order_ref text NOT NULL REFERENCES comm_orders(reference),
 product_id bigint NOT NULL, rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),
 display_name text NOT NULL, body text NOT NULL, status text NOT NULL DEFAULT 'pending'
 CHECK(status IN ('pending','approved','rejected')), created_at timestamptz NOT NULL DEFAULT now(),
 moderated_at timestamptz, UNIQUE(order_ref,product_id))`,
`CREATE OR REPLACE FUNCTION comm_take_rate(k text, seconds integer, max_count integer) RETURNS boolean
 LANGUAGE plpgsql AS $$ DECLARE n integer; w timestamptz; BEGIN
 w := to_timestamp(floor(extract(epoch from now()) / seconds) * seconds);
 INSERT INTO comm_rate(bucket,window_start,count) VALUES(k,w,1)
 ON CONFLICT(bucket,window_start) DO UPDATE SET count=comm_rate.count+1
 WHERE comm_rate.count < max_count RETURNING count INTO n;
 RETURN n IS NOT NULL; END $$`,
`CREATE OR REPLACE FUNCTION comm_accept_contact(rid uuid, rh text, ch text, ih text, eh text,
 mail jsonb, mh text) RETURNS text LANGUAGE plpgsql AS $$ DECLARE old_hash text; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(rid::text,0));
 SELECT request_hash INTO old_hash FROM comm_contact_requests WHERE id=rid;
 IF old_hash IS NOT NULL THEN
   IF old_hash<>rh THEN RAISE EXCEPTION 'contact_request_conflict'; END IF;
   RETURN 'duplicate';
 END IF;
 IF NOT comm_take_rate('contact-global',86400,30) OR
    NOT comm_take_rate('contact-ip:'||ih,600,3) OR
    NOT comm_take_rate('contact-email:'||eh,86400,5) THEN RAISE EXCEPTION 'contact_rate_limited'; END IF;
 INSERT INTO comm_contact_requests(id,request_hash,challenge_hash) VALUES(rid,rh,ch);
 INSERT INTO comm_outbox(key,kind,payload,payload_hash) VALUES('contact/'||rid,'contact',mail,mh);
 RETURN 'queued'; END $$`,
];

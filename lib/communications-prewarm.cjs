const {hash}=require('./communications-store.cjs');
const {processingEmail,shipmentEmail,reviewEmail}=require('./customer-mail.cjs');
// Pure template/hash initialization only: no environment, client, randomness or I/O at startup.
const order={reference:'SYNTHETIC-STARTUP',email:'startup@example.invalid'};
for(const payload of [processingEmail(order),shipmentEmail(order,{id:1,carrier:'Fixture',
  tracking_number:'SYNTHETIC',tracking_url:'https://example.invalid/tracking',
  shipment_items:[{quantity:1}]}),reviewEmail(order,'https://www.localjagoff.com/review#fixture')])hash(payload);
// Initialize the driver's pure parsers using fixed non-customer values, never a database client.
const {types}=require('@neondatabase/serverless');
for(const [oid,value] of [[16,'t'],[20,'1'],[23,'1'],[25,'fixture'],[1009,'{fixture}'],
  [114,'{}'],[3802,'{}'],[1184,'2026-01-01 00:00:00+00'],[2950,'00000000-0000-4000-8000-000000000001']]){
  types.getTypeParser(oid,'text')(value);
}

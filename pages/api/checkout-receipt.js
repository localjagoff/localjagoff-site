import { createReceiptHandler } from '../../lib/checkout-receipt.cjs';
export const config = { api: { bodyParser: { sizeLimit: '1kb' } } };
export default createReceiptHandler();

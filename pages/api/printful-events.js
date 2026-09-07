import Stripe from 'stripe';
import notifications from '../../lib/printful-notification-handler.cjs';
import communications from '../../lib/communications-service.cjs';
export const config={api:{bodyParser:false}};
export default notifications.createPrintfulNotificationHandler({serviceFactory:store=>communications.createService({store,stripe:new Stripe(process.env.STRIPE_SECRET_KEY)})});

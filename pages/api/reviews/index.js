import reviews from '../../../lib/reviews-handler.cjs';
export const config={api:{bodyParser:{sizeLimit:'10kb'}}};
export default reviews.createReviewsHandler();

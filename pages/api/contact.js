import contact from '../../lib/contact-handler.cjs';
export const config = {api:{bodyParser:{sizeLimit:'20kb'}}};
export default contact.createContactHandler();

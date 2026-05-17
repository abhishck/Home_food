import Razorpay from 'razorpay';
import config from './index.js';

let _instance = null;

/**
 * Returns a singleton Razorpay instance.
 * Lazy-initialised so the module can be imported without crashing
 * when RAZORPAY_* env vars are not set (e.g. during testing).
 */
const getRazorpay = () => {
  if (!_instance) {
    if (!config.razorpay.keyId || !config.razorpay.keySecret) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment');
    }
    _instance = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }
  return _instance;
};

export default getRazorpay;

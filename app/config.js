// Application configuration.
'use strict';

var config = module.exports;
const sSecretKey = process.env.API_WMPOS_SECRET_KEY || '';
const sPaySecretKey = process.env.API_WM_TPAY_SECRET_KEY || '';
const sApiKey = process.env.API_WM_TPAY_API_KEY || '';
const sApiKeyIso = process.env.API_WM_TPAY_API_KEY_ISO || '';
const sMid = process.env.API_WM_TPAY_MID || '';
const sMidIso = process.env.API_WM_TPAY_MID_ISO || '';
const sCancelPw = process.env.API_WM_TPAY_CANCEL_PW || '';
const sRedisToken = process.env.REDIS_TOKEN || '';
const sPassSecretKey = process.env.API_PASS_SECRET_KEY || '';
const sPassIV = process.env.API_PASS_IV || '';
const sPassAccessToken = process.env.API_PASS_ACCESSTOKEN || '';
const sPassAccessUrl = process.env.API_PASS_ACCESSURL || '';
const sAligoSms = process.env.API_ALIGO_SMS_KEY || '';
const sAligoId = process.env.API_ALIGO_SMS_ID || '';
const sAligoSender = process.env.API_ALIGO_SMS_SENDER || '';
const iStoreMasterKey = process.env.API_STORE_MASTER_KEY || '';
const sBitlyCode = process.env.API_BITLY_TOKEN || '';
const sAligoKakaoKey = process.env.API_ALIGO_SENDERKEY || '';
const sAligoCustomerKakaoKey = process.env.API_ALIGO_CUSTOMER_SENDERKEY || '';
const sAwsBucketID = process.env.AWS_BUCKET_SDK_ID || '';
const sAwsBucketSecret = process.env.AWS_BUCKET_SDK_SECRET || '';
const sDesignatedKey = process.env.DESIGNDATE_KEY || '';
const sEnvironment = process.env.NODE_ENV || '';
const sMasterPwd = process.env.API_MPWD || '';

config.db = {
   host: process.env.DB_HOST,
   port: process.env.DB_PORT,
   user: process.env.DB_USERNAME,
   password: process.env.DB_PASSWORD,
   name: process.env.DB_NAME,
   dialect: process.env.DB_DIALECT
};

config.redis = {
   host: process.env.REDIS_HOST,
   port: process.env.REDIS_PORT,
   password: process.env.REDIS_PASSWORD,
   redisQueueNm: process.env.REDIS_QUEUE_NAME,
   redisQueueACancel: process.env.REDIS_QUEUE_ACANCEL
};

config.queryTimeout = 1000;
config.redisToken = sRedisToken;
config.environment = process.env.NODE_ENV;
config.designatedStoreKey = sDesignatedKey;

config.keys = {
   payKey: sPaySecretKey,
   secret: sSecretKey,
   apiKey: sApiKey,
   apiKeyIso: sApiKeyIso,
   mid: sMid,
   midIso: sMidIso,
   cancelPw: sCancelPw,
   tokenKey: 'WMJWT',
   tokenExpireTime: '15m',
   passSecretKey: sPassSecretKey,
   passIV: sPassIV,
   passAccessToken: sPassAccessToken,
   passAccessUrl: sPassAccessUrl,
   aligosmskey: sAligoSms,
   aligosmsid: sAligoId,
   aligosmssender: sAligoSender,
   aligoKakaoKey: sAligoKakaoKey,
   aligoCustomerKakaoKey: sAligoCustomerKakaoKey,
   storeMasterKey: iStoreMasterKey,
   bitlyCode: sBitlyCode,
   awsBucketId: sAwsBucketID,
   awsBucketSecret: sAwsBucketSecret
};

// Order state codes
config.order = {};
config.order['ORDER_AWAITING_CONFIRM_APP'] = 11001;
config.order['ORDER_AWAITING_CONFIRM_OFFLINE'] = 11002;
config.order['ORDER_AWAITING_CONFIRM_WALKIN'] = 11003;
config.order['ORDER_AWAITING_CONFIRM_DELIVERY'] = 11004;
config.order['ORDER_CONFIRMED_APP'] = 12001;             //// Step 2
config.order['ORDER_CONFIRMED_OFFLINE'] = 12002;
config.order['ORDER_CONFIRMED_WALKIN'] = 12003;
config.order['ORDER_CONFIRMED_DELIVERY'] = 12004;
config.order['ORDER_PREPARING'] = 13001;
config.order['ORDER_PREPARING_COMPLETE'] = 13002;        //// Step 3
config.order['PAYMENT_AWAITING'] = 14001;                //// Step 1
config.order['PAYMENT_CONFIRMED_CARD'] = 14002;
config.order['PAYMENT_CONFIRMED_CASH'] = 14003;
config.order['PAYMENT_CANCELLED'] = 14004;
config.order['PAYMENT_POS_CANCELLED'] = 14005;
config.order['ORDER_PICKUP_WAITING'] = 15001;      
config.order['ORDER_PICKUP_COMPLETE'] = 15002;           //// Step 4
config.order['ORDER_CANCELLED'] = 16001;
config.order['ORDER_FINISHED'] = 16002;
config.order['ORDER_CANCELLED_STORE'] = 17001;
config.order['ORDER_DELETE'] = 17002;
config.order['ORDER_CANCELLED_AUTO'] = 18001;

// Payment state codes
config.payment = {};
config.payment['PENDING'] = 20001;
config.payment['COMPLETED'] = 20002;
config.payment['CANCELLED'] = 20003;
config.payment['FAILED'] = 20004;
config.payment['REFUNDED'] = 20005;
config.payment['DENIED'] = 20006;
config.payment['APPROVED'] = 20007;
config.payment['FREE'] = 20008;

var userRoles = config.userRoles = {
   guest: 1, // ...001
   user: 2, // ...010
   admin: 4 // ...100
};


config.default = {};
config.default['environment'] = sEnvironment;
config.default['mpasswd'] = sMasterPwd;

config.accessLevels = {
   guest: userRoles.guest | userRoles.user | userRoles.admin, // ...111
   user: userRoles.user | userRoles.admin, // ...110
   admin: userRoles.admin // ...100
};
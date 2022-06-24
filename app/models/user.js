// The User model.
'use strict';

var bcrypt = require('bcryptjs');

var config = require('../config'),
   knex = require('../services/database');

const axios = require('axios').default;

const CryptoJS = require('crypto-js');

// Bcrypt functions used for hashing password and later verifying it.
const SALT_ROUNDS = 10;
const hashPassword = password => bcrypt.hash(password, SALT_ROUNDS);
const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

// Always perform this logic before saving to db. This includes always hashing
// the password field prior to writing so it is never saved in plain text.
const beforeSave = user => {
   if (!user.password) return Promise.resolve(user)

   // `password` will always be hashed before being saved.
   return hashPassword(user.password)
      .then(hash => ({ ...user, password: hash }))
      .catch(err => `Error hashing password: ${err}`)
}

const sTableName = 'wmpos_user';
const iStore = "wm_store";
const iStoreMedia = "wm_store_media";
const iMerchant = "wm_merchant";
const iStoreManager = "wm_store_manager";
const iMerchantMedia = "wm_merchant_media";
const iStoreCongestion = 'wm_store_time_congestion';
const iWebsiteContact = 'wm_website_contact';
const iPassValidation = 'wm_pass_validation';
const iPosUserToken = 'wmpos_user_token';
const iPosAdminUser = 'wmpos_admin_user';

const { v1: uuidv1 } = require('uuid');
const { async } = require('validate.js');

async function* asyncGenerator(sIndex) {
   let count = 0;
   while (count < sIndex) 
   yield count++;
}

var User = {};

User.getThrooCoperationCompanyList = () => {
   return  knex.select('admin_user_id','group_name')
           .from("wmpos_admin_user")
           .where({sales_type : "owner"})
           .where({status : 1})
           .then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

User.checkdChangedCoperationCompany = (sIndex) => {
   return  knex.select('admin_user_id')
           .from("wmpos_admin_x_group")
           .where({store_id : sIndex})
           .then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

User.insertAlarm = (oUserToken) => {
   return knex('wm_alarm')
      .insert(oUserToken)
      .then(function (result) {
         //console.log("result", result);
         return result;
      }).catch((err) => console.log(err));
}

User.deleteCoperationCompany = (sIndex) => {
   return knex("wmpos_admin_x_group")
      .where({ store_id: sIndex})
      .del()
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

User.addCoperationCompany = (sIndex,aIndex) => {
   return knex('wmpos_admin_x_group')
      .insert({ admin_user_id: aIndex, store_id: sIndex})
      .then(function (result) {
         return result;
      }).catch((err) => console.log(err));
}

User.changedCoperationCompany = (sIndex,aIndex) => {
   return knex('wmpos_admin_x_group')
      .update({ admin_user_id: aIndex })
      .where({ store_id: sIndex})
      .then(function (result) {
         return result;
      }).catch((err) => console.log(err));
}

User.arrivalCustomer = (sOrderId, sIndex) => {
   return knex('wm_order_noti')
      .update({ arrival_customer: sIndex }).update('updated_at', knex.fn.now())
      .where({ order_id: sOrderId })
      .then(function (result) {
         return result;
      }).catch((err) => console.log(err));
}

User.arrivalCustomerConfirmed = (sOrderId, sIndex) => {
   return knex('wm_order_noti')
      .update({ arrival_confirm: sIndex }).update('updated_at', knex.fn.now())
      .where({ order_id: sOrderId })
      .then(function (result) {
         return result;
      }).catch((err) => console.log(err));
}

User.concluded = (sOrderId, sIndex) => {
   return knex('wm_order_noti')
      .update({ concluded: sIndex }).update('updated_at', knex.fn.now())
      .where({ order_id: sOrderId })
      .then(function (result) {
         return result;
      }).catch((err) => console.log(err));
}

User.orderPreparedBef = (sOrderId, sIndex) => {
   return knex('wm_order_noti')
      .update({ order_prepared_bef: sIndex }).update('updated_at', knex.fn.now())
      .where({ order_id: sOrderId })
      .then(function (result) {
         return result;
      }).catch((err) => console.log(err));
}

User.orderPreparedAft = (sOrderId, sIndex) => {
   return knex('wm_order_noti')
      .update({ order_prepared_aft: sIndex }).update('updated_at', knex.fn.now())
      .where({ order_id: sOrderId })
      .then(function (result) {
         return result;
      }).catch((err) => console.log(err));
}

User.orderConfirm = (sOrderId, sIndex) => {
   return knex('wm_order_noti')
      .update({ order_confirm: sIndex }).update('updated_at', knex.fn.now())
      .where({ order_id: sOrderId })
      .then(function (result) {
         return result;
      }).catch((err) => console.log(err));
}

User.autoOrderCancel = (sOrderId, sIndex) => {
   return knex('wm_order_noti')
      .update({ auto_order_cancel: sIndex }).update('updated_at', knex.fn.now())
      .where({ order_id: sOrderId })
      .then(function (result) {
         return result;
      }).catch((err) => console.log(err));
}

User.posOrderCancel = (sOrderId, sIndex) => {
   return knex('wm_order_noti')
      .update({ pos_order_cancel: sIndex }).update('updated_at', knex.fn.now())
      .where({ order_id: sOrderId })
      .then(function (result) {
         return result;
      }).catch((err) => console.log(err));
}


User.parkingPrepare = (sOrderId, sIndex) => {
   return knex('wm_order_noti')
      .update({ parking_prepare: sIndex }).update('updated_at', knex.fn.now())
      .where({ order_id: sOrderId })
      .then(function (result) {
         return result;
      }).catch((err) => console.log(err));
}

User.parkingArrival = (sOrderId, sIndex) => {
   return knex('wm_order_noti')
      .update({ parking_arrival: sIndex }).update('updated_at', knex.fn.now())
      .where({ order_id: sOrderId })
      .then(function (result) {
         return result;
      }).catch((err) => console.log(err));
}

User.insertPushToken = (sIndex,aIndex,zIndex) => {
   return   knex("wm_push_token_pos")
            .insert({ unique_id: sIndex,token: aIndex, store_id: zIndex })
            .then((result) => {
               console.log("result",result);
               return result;
            }).catch((err) => console.log(err));
}

User.updatePushToken = (sIndex,aIndex) => {
   return   knex("wm_push_token_pos")
            .update({ token: aIndex, updated_at: knex.fn.now() })
            .where({ unique_id: sIndex })
            .then((result) => {
               console.log("result",result);
               return result;
            }).catch((err) => console.log(err));
}

User.checkUpdateToken = (sIndex,aIndex) => {
   return  knex.select('push_token_id')
           .from("wm_push_token_pos")
           .where({unique_id : sIndex})
           .where({store_id : aIndex})
           .timeout(config.queryTimeout).then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

User.insertDeviceUUID = (sIndex,aIndex,zIndex,xIndex,cIndex,nIndex) => {
   return   knex("wmpos_user_token")
            .insert({ user_id: sIndex, store_id: aIndex, token: zIndex, refresh_token: xIndex, device_uuid: cIndex, pos_version: nIndex, valid: 1 })
            .then((result) => {
               console.log("result",result);
               return result;
            }).catch((err) => console.log(err));
}

User.publishStamp = (sIndex,aIndex,zIndex,xIndex,cIndex,bIndex) => {
   return   knex("wm_stamp_user")
            .insert({ stamp_id: bIndex, store_id: sIndex, user_id: aIndex, order_id: zIndex, order_amount: xIndex, is_completed: 0, is_cancelled: 0, status: 1, valid_till: cIndex })
            .then((result) => {
               console.log("result",result);
               return result;
            }).catch((err) => console.log(err));
}

User.updateDeviceUUID = (sIndex,aIndex,zIndex,xIndex) => {
   return   knex("wmpos_user_token")
            .update({ token: aIndex, refresh_token: zIndex, pos_version: xIndex, updated_at: knex.fn.now() })
            .where({ device_uuid: sIndex })
            .then((result) => {
               console.log("result",result);
               return result;
            }).catch((err) => console.log(err));
}

User.checkUpdateDeviceUUID = (sIndex,aIndex) => {
   return  knex.select('user_token_id')
           .from("wmpos_user_token")
           .where({device_uuid : sIndex})
           .where({store_id : aIndex})
           .timeout(config.queryTimeout).then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

User.checkSalesThrooManager = (aIndex) => {
   return  knex.select('group_id')
           .from("wmpos_admin_user")
           .where({admin_user_id : aIndex})
           .where({activated : 1})
           .where({status : 1})
           .timeout(config.queryTimeout).then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

User.checkCategory = (sParam,aParam) => {
   let sQuery = knex.raw(`
                  t1.category_id 
      FROM        wm_menu_category  AS t1
      INNER JOIN  wm_menu           AS t2 ON t2.menu_id = t1.menu_id 
      WHERE       t1.name = ?
      AND         t2.store_id = ?
      AND         t1.is_deleted != 1 
   `, [sParam,aParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log("err",err));
}

User.getAppPushToken = () => {
   let sQuery = knex.raw(`
                  t2.token 
      FROM        wm_user AS t1 
      INNER JOIN  wm_push_token AS t2 ON t1.user_id = t2.user_id 
      WHERE       t2.event_notification = 1
      AND         t2.token != ""
   `, []);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log("err",err));
}

User.testGetAppPushToken = () => {
   let sQuery = knex.raw(`
                  t2.token 
      FROM        wm_user AS t1 
      INNER JOIN  wm_push_token AS t2 ON t1.user_id = t2.user_id 
      AND         t1.phone_number = "01039438070"
   `, []);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log("err",err));
}

User.getCategoryCopy = (sParam) => {
   let sQuery = knex.raw(`
                  t2.name, 
                  t2.is_main, 
                  t2.status, 
                  t2.id_order 
   FROM           wm_menu_cat_x_prd AS t1
   INNER JOIN     wm_menu_category  AS t2 ON t1.category_id = t2.category_id
   INNER JOIN     wm_product        AS t3 ON t1.product_id = t3.product_id
   WHERE          t3.product_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log("err",err));
}

User.getThrooCoperationCompanyName = (sParam) => {
   let sQuery = knex.raw(`
                     t2.admin_user_id 
      FROM           wmpos_admin_x_group  AS t1
      INNER JOIN     wmpos_admin_user     AS t2 ON t1.admin_user_id = t2.admin_user_id 
      WHERE          t1.store_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log("err",err));
}

User.getStampConfrim = (sParam,aParam) => {
   let sQuery = knex.raw(`
               minimum_amount,
               end_date
   FROM        wm_stamp 
   WHERE       store_id = ?
   AND         is_deleted = 0
   AND         DATE(?) BETWEEN DATE(start_date) AND DATE(end_date)
   `, [sParam,aParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log("err",err));
}

User.getUserStempListByStore = (sParam,aParam) => {
   let sQuery = knex.raw(`
                  t1.end_date,
                  t1.start_date,
                  t1.stamp_id,
                  t1.minimum_amount
   FROM           wm_stamp          AS t1
   INNER JOIN     wm_stamp_user     AS t2 ON t1.stamp_id = t2.stamp_id 
   WHERE          t2.user_id = ?
   AND            t2.store_id = ?
   AND            t2.is_completed != 1
   `, [sParam,aParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log("err",err));
}

User.checkSalesIdV2 = (sParam,iParam) => {
   let sQuery = knex.raw(`
                     t1.group_id 
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_admin_x_group  AS t2 ON t1.admin_user_id = t2.admin_user_id
      INNER JOIN     wmpos_user           AS t3 ON t3.store_id = t2.store_id 
      WHERE          t3.store_id       = ?
      AND            t1.admin_user_id  = ?
      AND            t1.activated      = 1
      AND            t1.status         = 1
   `, [sParam,iParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log("err",err));
}

User.checkSalesId = (sParam,iParam) => {
   let sQuery = knex.raw(`
                     t1.group_id 
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_user           AS t2 ON t1.group_id = t2.parent_id 
      WHERE          t2.store_id       = ?
      AND            t1.admin_user_id  = ?
      AND            t1.activated      = 1
      AND            t1.status         = 1
   `, [sParam,iParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log("err",err));
}

User.orderRecentlyUser = (aIndex) => {
   let sQuery = knex.raw(`
               created_at
      FROM     wm_order 
      WHERE    user_id = ?
      AND      payment_id != 0 
      AND      cancelled_at IS NULL
      ORDER BY created_at DESC
   `, [aIndex]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log("err",err));
}

User.monthlyOrderCountUser = (aIndex,sIndex,iIndex) => {
   let sQuery = knex.raw(`
               COUNT(*) AS oCount
      FROM     wm_order 
      WHERE    user_id = ?
      AND      payment_id != 0 
      AND      cancelled_at IS NULL
      AND      DATE(created_at) BETWEEN DATE(?) AND DATE(?)
   `, [aIndex,sIndex,iIndex]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log("err",err));
}

User.totalOrderCount = (aIndex) => {
   let sQuery = knex.raw(`
               COUNT(*) AS oCount
      FROM     wm_order 
      WHERE    user_id = ?
      AND      payment_id != 0 
      AND      cancelled_at IS NULL
   `, [aIndex]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log("err",err));
}

User.getTotalUserByDate = (aIndex,sIndex) => {
   let sQuery = knex.raw(`
               COUNT(*) AS total
      FROM     wm_user 
      WHERE    DATE(created_at) BETWEEN DATE(?) AND DATE(?)
   `, [aIndex,sIndex]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log("err",err));
}

User.smsCodeUpdate = (aIndex,sIndex) => {
   return knex("wmpos_user_sms_code")
         .update({ verified: 1, url_image: sIndex.url_path })
         .where({ store_id: aIndex })
         .then((result) => {
            return result;
         }).catch((err) => console.log(err));
}

User.checkSMSVerifyName = (sParam) => {
   return   knex.select('verified')
            .from("wmpos_user_sms_code")
            .where({store_id : sParam})
            .where({verified : 0})
            .timeout(config.queryTimeout).first().then(function (result) {
               return result;
            })
            .catch((err) => console.log(err));
}

User.userId = (sParam) => {
   return   knex.select('email')
            .from("wmpos_user")
            .where({store_id : sParam})
            .timeout(config.queryTimeout).first().then(function (result) {
               return result;
            })
            .catch((err) => console.log(err));
}

User.isRenewStore = (sParam) => {
   return   knex.select('user_sms_id')
            .from("wmpos_user_sms_code")
            .where({verified : 1})
            .where({store_id : sParam})
            .then(function (result) {
               return result;
            })
            .catch((err) => console.log(err));
}

User.haveSalesCode = (sParam) => {
   let sQuery = knex.raw(`
                  t1.user_id
      FROM        wmpos_user AS t1
      INNER JOIN  wm_store    AS t2 ON t1.store_id = t2.store_id 
      WHERE       t1.parent_id IS NOT NULL
      AND         t1.store_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log("err",err));
}

User.getParentId = (oEmail) => {
   return knex.select('group_id')
         .from("wmpos_admin_user")
         .where({admin_user_id : oEmail})
         .where({status : 1})
         .where({activated : 1})
         .timeout(config.queryTimeout).first().then(function (result) {
            return result;
         })
         .catch((err) => console.log(err));
}

User.searchSalesStore = async (sParam,aParam) => {
   let name = "%" + aParam + "%";

   let sQuery = knex.raw(`
                     t2.email,
                     t2.store_id,
                     t2.email,
                     t3.store_name,
                     t4.verified,
                     t5.phone_number 
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_user           AS t2 ON t1.group_id = t2.parent_id 
      INNER JOIN     wm_store             AS t3 ON t3.store_id = t2.store_id 
      LEFT JOIN      wmpos_user_sms_code  AS t4 on t4.store_id = t3.store_id 
      INNER JOIN     wm_merchant  		   AS t5 on t5.store_id = t2.store_id 
      WHERE          t1.admin_user_id = ?
      AND            t3.store_name LIKE ?
      ORDER BY 	   t3.created_at DESC
   `, [sParam,name]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log("err",err));
}

User.searchSalesManagerStore = async (aParam) => {
   let name = "%" + aParam + "%";

   let sQuery = knex.raw(`
                     t1.store_id,
                     t1.store_name,
                     t2.email,
                     t3.phone_number,
                     t4.verified
      FROM           wm_store             AS t1 
      INNER JOIN     wmpos_user           AS t2 ON t2.store_id = t1.store_id 
      INNER JOIN     wm_merchant          AS t3 ON t3.store_id = t1.store_id 
      LEFT JOIN      wmpos_user_sms_code  AS t4 ON t4.store_id = t1.store_id 
      WHERE          t1.store_name        LIKE ?
      GROUP BY       t1.store_id
      ORDER BY 	   t1.created_at DESC
   `, [name]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log("err",err));
}

User.searchSalesStoreV2 = async (sParam,aParam) => {
   let name = "%" + aParam + "%";

   let sQuery = knex.raw(`
                     t3.email,
                     t4.store_id,
                     t4.store_name,
                     t6.verified,
                     t5.phone_number 
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_admin_x_group  AS t2 ON t1.admin_user_id = t2.admin_user_id
      INNER JOIN     wmpos_user           AS t3 ON t3.store_id = t2.store_id
      INNER JOIN     wm_store             AS t4 ON t4.store_id = t3.store_id 
      INNER JOIN     wm_merchant  		   AS t5 ON t5.store_id = t2.store_id 
      LEFT JOIN      wmpos_user_sms_code  AS t6 ON t6.store_id = t3.store_id 
      WHERE          t1.admin_user_id = ?
      AND            t4.store_name LIKE ?
      ORDER BY 	   t4.created_at DESC
   `, [sParam,name]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log("err",err));
}

User.searchSalesStoreExceptOne = async (sParam,aParam,iParam) => {
   let name = "%" + aParam + "%";
   let sQuery = knex.raw(`
                     t2.email,
                     t2.store_id,
                     t2.email,
                     t3.store_name,
                     t4.verified,
                     t5.phone_number 
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_user           AS t2 ON t1.group_id = t2.parent_id 
      INNER JOIN     wm_store             AS t3 ON t3.store_id = t2.store_id 
      LEFT JOIN      wmpos_user_sms_code  AS t4 on t4.store_id = t3.store_id 
      INNER JOIN     wm_merchant  		   AS t5 on t5.store_id = t2.store_id 
      WHERE          t1.admin_user_id = ?
      AND            t3.store_name LIKE ?
      AND            t3.store_id != ?
      ORDER BY 	   t3.created_at DESC
   `, [sParam,name,iParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log("err",err));
}

User.searchSalesStoreExceptOneV2 = async (sParam,aParam,iParam) => {
   let name = "%" + aParam + "%";
   let sQuery = knex.raw(`
                     t3.email,
                     t3.store_id,
                     t4.store_name,
                     t6.verified,
                     t5.phone_number  
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_admin_x_group  AS t2 ON t1.admin_user_id = t2.admin_user_id
      INNER JOIN     wmpos_user           AS t3 ON t3.store_id = t2.store_id
      INNER JOIN     wm_store             AS t4 ON t4.store_id = t3.store_id 
      INNER JOIN     wm_merchant  		   AS t5 ON t5.store_id = t2.store_id 
      LEFT JOIN      wmpos_user_sms_code  AS t6 ON t6.store_id = t3.store_id 
      WHERE          t1.admin_user_id = ?
      AND            t4.store_name LIKE ?
      AND            t4.store_id != ?
      ORDER BY 	   t4.created_at DESC
   `, [sParam,name,iParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log("err",err));
}

User.searchSalesManagerStoreExceptOneV2 = async (aParam,iParam) => {
   let name = "%" + aParam + "%";
   let sQuery = knex.raw(`
                     t1.store_id,
                     t1.store_name,
                     t2.email,
                     t3.phone_number,
                     t4.verified
      FROM           wm_store             AS t1 
      INNER JOIN     wmpos_user           AS t2 ON t2.store_id = t1.store_id 
      INNER JOIN     wm_merchant          AS t3 ON t3.store_id = t1.store_id 
      LEFT JOIN      wmpos_user_sms_code  AS t4 ON t4.store_id = t1.store_id 
      WHERE          t1.store_name        LIKE ?
      AND            t1.store_id          != ?
      GROUP BY       t1.store_id
      ORDER BY 	   t1.created_at DESC
   `, [name,iParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log("err",err));
}

User.getSalesTeamDataExceptOneV2 = async (sParam,aParam) => {
   let sQuery = knex.raw(`
                     t3.email,
                     t3.store_id,
                     t4.store_name,
                     t6.verified,
                     t5.phone_number  
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_admin_x_group  AS t2 ON t1.admin_user_id = t2.admin_user_id
      INNER JOIN     wmpos_user           AS t3 ON t3.store_id = t2.store_id
      INNER JOIN     wm_store             AS t4 ON t4.store_id = t3.store_id 
      INNER JOIN     wm_merchant  		   AS t5 ON t5.store_id = t2.store_id 
      LEFT JOIN      wmpos_user_sms_code  AS t6 ON t6.store_id = t3.store_id 
      WHERE          t1.admin_user_id = ?
      AND            t4.store_id != ?
      ORDER BY       t4.created_at desc
   `, [sParam,aParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log("err",err));
}

User.getSalesTeamDataExceptOne = async (sParam,aParam) => {
   let sQuery = knex.raw(`
                     t2.email,
                     t2.store_id,
                     t2.email,
                     t3.store_name,
                     t4.verified,
                     t5.phone_number 
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_user           AS t2 ON t1.group_id = t2.parent_id 
      INNER JOIN     wm_store             AS t3 ON t3.store_id = t2.store_id 
      LEFT JOIN      wmpos_user_sms_code  AS t4 on t4.store_id = t3.store_id 
      INNER JOIN     wm_merchant  		   AS t5 on t5.store_id = t2.store_id 
      WHERE          t1.admin_user_id = ?
      AND            t3.store_id != ?
      ORDER BY 	   t3.created_at DESC
   `, [sParam,aParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log("err",err));
}

User.getSalesTeamDataV2 = async (sParam) => {
   let sQuery = knex.raw(`
                     t3.email,
                     t3.store_id,
                     t4.store_name,
                     t6.verified,
                     t5.phone_number  
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_admin_x_group  AS t2 ON t1.admin_user_id = t2.admin_user_id
      INNER JOIN     wmpos_user           AS t3 ON t3.store_id = t2.store_id
      INNER JOIN     wm_store             AS t4 ON t4.store_id = t3.store_id 
      INNER JOIN     wm_merchant  		   AS t5 ON t5.store_id = t2.store_id 
      LEFT JOIN      wmpos_user_sms_code  AS t6 ON t6.store_id = t3.store_id 
      WHERE          t1.admin_user_id = ?
      ORDER BY       t4.created_at desc
   `, [sParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log("err",err));
}

User.getSalesManagerDataV2 = async () => {
   let sQuery = knex.raw(`
                        t1.store_name,
                        t2.email,
                        t2.store_id,
                        t3.phone_number,
                        t4.verified
      FROM              wm_store             AS t1
      INNER JOIN        wmpos_user           AS t2 ON t1.store_id = t2.store_id 
      INNER JOIN        wm_merchant          AS t3 ON t1.store_id = t3.store_id 
      LEFT  JOIN        wmpos_user_sms_code  AS t4 ON t1.store_id = t4.store_id
      ORDER BY          t1.created_at DESC
   `, []);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log("err",err));
}

User.getSalesTeamData = async (sParam) => {
   let sQuery = knex.raw(`
                     t2.email,
                     t2.store_id,
                     t3.store_name,
                     t4.verified,
                     t5.phone_number 
      FROM           wmpos_admin_user     AS t1
      INNER JOIN     wmpos_user           AS t2 ON t1.group_id = t2.parent_id 
      INNER JOIN     wm_store             AS t3 ON t3.store_id = t2.store_id 
      LEFT JOIN      wmpos_user_sms_code  AS t4 on t4.store_id = t3.store_id 
      INNER JOIN     wm_merchant  		   AS t5 on t5.store_id = t2.store_id 
      WHERE          t1.admin_user_id = ?
      ORDER BY 	   t3.created_at DESC
   `, [sParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log("err",err));
}

User.findSalesUser = (oEmail) => {
   return knex.select( 'admin_user_id', 'phone_number', 'email', 'full_name', 'content', 'password', 'sales_type', 'group_name', 'group_id' )
         .from("wmpos_admin_user")
         .where({email : oEmail})
         .where({status : 1})
         .where({activated : 1})
         .timeout(config.queryTimeout).first().then(function (result) {
            return result;
         })
         .catch((err) => console.log(err));
}

User.salesUserSignUp = (userName,sCount,userEmail,userPhone,userPwd,groupId,groupName) => {
   return   knex('wmpos_admin_user')
            .insert({
               phone_number: userPhone,
               group_id: groupId,
               group_name: groupName,
               sales_type: "sales",
               email: userEmail,
               password: userPwd,
               content: sCount,
               full_name: userName,
               status: 1,
               activated: 1
            })
            .then(function (result) {
               return result;
            }).catch((err) => console.log(err));
}

User.pickUpInfoCheck = (passId) => {
   return knex.select('address1')
      .from(iStore)
      .where({store_id : passId})
      .then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

User.merchantInfoCheck = (passId) => {
   return knex.select('status', 'full_name', 'business_number')
      .from(iMerchant)
      .where({store_id : passId})
      .then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

User.userBusinessInfo = async (sParam) => {
   let sQuery = knex.raw(`
                  t1.status,
                  t1.address1 AS mAddress1,
                  t1.address2 AS mAddress2,
                  t1.phone_number AS mPhone,
                  t1.full_name,
                  t1.email,
                  t1.business_number,
                  t1.bank_name,
                  t1.account_nm,
                  t2.store_name,
                  t2.address1 AS sAddress1,
                  t2.address2 AS sAddress1,
                  t2.phone_number AS sPhone
      FROM        wm_merchant AS t1
      LEFT JOIN   wm_store    AS t2 ON t1.store_id = t2.store_id 
      WHERE       t1.store_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log("err",err));
}

User.proprietorshipInsert = async (sLat,sLng,sAddress,sAddress2,storeName,storeOwner,sBusinessNm,sPhoneNm,sEmail,sAccountNm,sBank,storeId,sParam,iParam,nParam,userId) => {
   let oResult = "9999";

   const trx = await knex.transaction();
   try {
      if(sParam !== "skip"){
         await trx(iStore)
               .where({ store_id: storeId })
               .update({ phone_number: sPhoneNm, address1: sAddress, address2: sAddress2, store_name: storeName, lat: sLat, lng: sLng })
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
         oResult = '8888';
      } else {
         await trx(iStore)
               .where({ store_id: storeId })
               .update({ store_name: storeName })
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
         oResult = '8888';
      }

      if(iParam){
         await trx("wmpos_user_sms_code")
               .where({ store_id: storeId })
               .update({ new_phone_number: sPhoneNm, updated_at: knex.fn.now()  })
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
      } else {
         if(nParam){
            await trx("wmpos_user_sms_code")
                  .where({ store_id: storeId })
                  .update({ new_phone_number: sPhoneNm, updated_at: knex.fn.now()  })
                  .then(async (res) => {
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
         } else {
            await trx("wmpos_user_sms_code")
                  .insert({ store_id: storeId, email: userId.email, phone_number: sPhoneNm, verified: 1 })
                  .then(async (res) => {
                     return res;
                  })
                  .catch((err) => {
                     console.log(err);
                     throw e;
                  });
         }
      }

      await trx(iMerchant)
            .where({ store_id: storeId })
            .update({ phone_number: sPhoneNm, address1: sAddress, address2: sAddress2, email: sEmail, business_number: sBusinessNm, bank_name : sBank, account_nm: sAccountNm, full_name: storeOwner, account_holder: storeOwner, status: 1})
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });
            
      oResult = '0000';

      await trx.commit();
      return oResult;
   }
   catch (e) {
      console.log("User.proprietorshipInsert fail !!! ===>",e);
      await trx.rollback();
      return oResult;
   }
}

User.verifiedSmsCodeV2 = (aIndex,sIndex,xIndex,mIndex) => {
   return knex("wmpos_user_sms_code")
         .update({ verified: 1 })
         .where({ phone_number: aIndex })
         .where({ sms_code: sIndex })
         .where({ device_uuid: xIndex })
         .where({ email: mIndex })
         .then((result) => {
            return result;
         }).catch((err) => console.log(err));
}

User.verifiedSmsCode = (aIndex,sIndex,xIndex) => {
   return knex("wm_user_sms_code")
         .update({ verified: 1 })
         .where({ phone_number: aIndex })
         .where({ sms_code: sIndex })
         .where({ device_uuid: xIndex })
         .then((result) => {
            return result;
         }).catch((err) => console.log(err));
}

User.verifySmsCodeV2 = (sPhonenumber, sSmsCode, sDeviceUUID, sEmail) => {
   let sQuery = knex.raw(`
                  t1.user_sms_id,
                  t1.phone_number,
                  t1.sms_code,
                  t1.verified,
                  CASE 
                        WHEN  (t1.created_at >= (CURRENT_TIMESTAMP - INTERVAL 2 MINUTE)) 
                        THEN  false
                        ELSE  true
                  END   AS expired
      FROM        wmpos_user_sms_code AS t1
      WHERE       t1.phone_number = ?
      AND         t1.sms_code = ?
      AND         t1.device_uuid = ?
      AND         t1.email = ?
      ORDER BY    t1.created_at DESC
   `, [sPhonenumber, sSmsCode, sDeviceUUID,sEmail]);

   let oQuery = knex.select(sQuery);
   oQuery.limit(1);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log(err));
}

User.verifySmsCode = (sPhonenumber, sSmsCode, sDeviceUUID) => {
   let sQuery = knex.raw(`
         t1.user_sms_id,
         t1.phone_number,
         t1.sms_code,
         t1.verified,
         CASE 
            WHEN (t1.created_at >= (CURRENT_TIMESTAMP - INTERVAL 2 MINUTE)) THEN false
            ELSE true
         END AS expired
      FROM 
         wm_user_sms_code AS t1
      WHERE 
         t1.phone_number = ?
         AND
         t1.sms_code = ?
         AND
         t1.device_uuid = ?
         ORDER BY t1.created_at DESC
   `, [sPhonenumber, sSmsCode, sDeviceUUID]);

   let oQuery = knex.select(sQuery);
   oQuery.limit(1);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log(err));
}

User.createRandomSmsCode = (sPhonenumber, sRandomSmsCode, sMsgContent, sDeviceUUID, sIpAddress) => {
   return knex('wm_user_sms_code')
      .insert({
         phone_number: sPhonenumber,
         sms_code: sRandomSmsCode,
         sms_content: sMsgContent,
         ip_address: sIpAddress,
         device_uuid: sDeviceUUID
      })
      .then(function (result) {
         return result;
      }).catch((err) => console.log(err));
}

User.createRandomSmsCodeV2 = (sPhonenumber, sRandomSmsCode, sMsgContent, sDeviceUUID, sIpAddress, sEmail) => {
   return knex('wmpos_user_sms_code')
      .insert({
         email: sEmail,
         phone_number: sPhonenumber,
         sms_code: sRandomSmsCode,
         sms_content: sMsgContent,
         ip_address: sIpAddress,
         device_uuid: sDeviceUUID
      })
      .then(function (result) {
         return result;
      }).catch((err) => console.log(err));
}

User.checkSpammingSms = (sPhonenumber) => {
   let sQuery = knex.raw(`
         COUNT(t1.user_sms_id) as sent_count
      FROM 
         wm_user_sms_code AS t1
      WHERE 
         t1.phone_number = ?
      AND
         t1.verified = 0
      AND
         t1.created_at >= (CURRENT_TIMESTAMP - INTERVAL 30 MINUTE)
   `, [sPhonenumber]);

   let oQuery = knex.select(sQuery);
   oQuery.limit(1);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log(err));
}

User.checkSpammingSmsV2 = (sPhonenumber,sEmail) => {
   let sQuery = knex.raw(`
         COUNT(t1.user_sms_id) as sent_count
      FROM 
         wmpos_user_sms_code AS t1
      WHERE 
         t1.phone_number = ?
      AND
         t1.verified = 0
      AND
         t1.email = ?
      AND
         t1.created_at >= (CURRENT_TIMESTAMP - INTERVAL 30 MINUTE)
   `, [sPhonenumber,sEmail]);

   let oQuery = knex.select(sQuery);
   oQuery.limit(1);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log(err));
}

User.calculateUser = () => {
   let sQuery = knex.raw(`
               (
                  SELECT   COUNT(*) 
                  FROM     wm_user
                  WHERE    status = 1
                  AND      android_permission = "fineloc,nfc,readstorage"
               )  AS android_user,
               (
                  SELECT   COUNT(*) 
                  FROM     wm_user
                  WHERE    status = 1
                  AND      android_permission != "fineloc,nfc,readstorage"
               )  AS ios_user,
               (
                  SELECT   COUNT(*) 
                  FROM     wm_user 
                  WHERE    kakao_id = "" 
                  AND      apple_id = "" 
                  AND      status = 1
               )  AS normal,
               (
                  SELECT   COUNT(*) 
                  FROM     wm_user 
                  WHERE    kakao_id != "" 
                  AND      apple_id = "" 
                  AND      status = 1
               )  AS kakaoId,
               (
                  SELECT   COUNT(*) 
                  FROM     wm_user 
                  WHERE    kakao_id = "" 
                  AND      apple_id != "" 
                  AND      status = 1
               ) AS appleId,
               COUNT(*) AS total
      FROM     wm_user 
      WHERE    status = 1
   `, []);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
         return result;
   }).catch((err) => console.log("err",err));
}

User.validationStore = (sParam) => {
   return knex.select('pause', 'status')
      .from(iStore)
      .where({store_id : sParam})
      .timeout(config.queryTimeout).first().then(function (result) {
         console.log("result",result);
         return result;
      })
      .catch((err) => console.log(err));
}

User.checkRefreshToken = (sRefreshToken) => {
   let sQuery = knex.select('t1.user_token_id', 't1.user_id', 't2.store_id', 't1.device_uuid')
      .from('wmpos_user_token' + ' AS t1')
      .leftJoin('wmpos_user AS t2', (builder) => {
         builder.on('t1.user_id', 't2.user_id');
      })
      .where({ 't1.refresh_token': sRefreshToken })
      //.where({ 't1.token': sToken })
      .where({ 't1.valid': true })
      .where('t1.expire_at', '>', knex.fn.now());

   //console.log(sQuery.toString());

   return sQuery.timeout(config.queryTimeout).first().then(function (result) {
      return result;
   })
      .catch((err) => console.log(err));

}

User.posSignIn = (sParam) => {
   return knex.select('store_id', 'expire_at', 'token', 'device_uuid')
      .from(iPosUserToken)
      .where({refresh_token : sParam})
      .timeout(config.queryTimeout).first().then(function (result) {
         console.log("result",result);
         return result;
      })
      .catch((err) => console.log(err));
}

User.insertPassAuthorize = (sReqTxId,sTelcoTxId,sCertTxId,sDigitalSign,sResultDttm,sTelcoTycd,sTitle,sPhone,sCompany) => {
   return knex(iPassValidation)
      .insert({ req_tx_id: sReqTxId, telco_tx_id: sTelcoTxId, cert_tx_id: sCertTxId, digitalSign: sDigitalSign, create_time: sResultDttm, tsa_sign : sTelcoTycd, connection_info: sCompany, user_nm: sTitle, phone: sPhone})
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

User.updatePassAuthorize = (storeId,passId) => {
   return knex(iPassValidation)
         .update({ store_id: storeId })
         .where({ pass_validation_id: passId })
         .then((result) => {
            return result;
         }).catch((err) => console.log(err));
}

User.checkUpPassAuthorize = (passId) => {
   return knex.select('user_nm')
      .from(iPassValidation)
      .where({pass_validation_id : passId})
      .timeout(config.queryTimeout).first().then(function (result) {
         console.log("result",result);
         return result;
      })
      .catch((err) => console.log(err));
}

User.createContract = (iCompanyName,sName,sAddress,iPhoneNumber,iEmail,iUserId) => {
   return knex(iWebsiteContact)
      .insert({ company_name: iCompanyName, name: sName, address: sAddress, phone_number: iPhoneNumber, email: iEmail, status: 1, user_id : iUserId })
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

User.getStore = (sParam,iParam) => {
   let sQuery = knex.raw(`
                  t1.user_id, 
                  t1.store_id, 
                  t1.uuid, 
                  t1.phone_number, 
                  t1.email, 
                  t1.full_name, 
                  t1.birthdate 
      FROM        wmpos_user        AS t1 
      INNER JOIN  wmpos_admin_user  AS t2 ON t2.group_id = t1.parent_id 
      WHERE       t2.admin_user_id = ?
      AND         t1.store_id = ?
   `, [sParam, iParam]);

   let oQuery = knex.select(sQuery);
   oQuery.limit(1);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

User.getStoreV2 = (sParam,iParam) => {
   let sQuery = knex.raw(`
                  t1.user_id, 
                  t1.store_id, 
                  t1.uuid, 
                  t1.phone_number, 
                  t1.email, 
                  t1.full_name, 
                  t1.birthdate 
      FROM        wmpos_user           AS t1 
      INNER JOIN  wmpos_admin_x_group  AS t2 ON t2.store_id = t1.store_id 
      INNER JOIN  wmpos_admin_user     AS t3 ON t2.admin_user_id = t3.admin_user_id 
      WHERE       t3.admin_user_id = ?
      AND         t1.store_id = ?
   `, [sParam, iParam]);

   let oQuery = knex.select(sQuery);
   oQuery.limit(1);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

User.getSalesManagerStore = (sParam) => {
   return knex.select('user_id', 'store_id', 'uuid', 'phone_number', 'email', 'full_name', 'birthdate')
      .from("wmpos_user")
      .where({store_id : sParam})
      .then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

User.findOne = (oEmail) => {
   return knex.select('user_id', 'store_id', 'uuid', 'phone_number', 'email', 'full_name', 'birthdate', 'password')
      .from("wmpos_user")
      .where({email : oEmail})
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

User.findOneUser = (storeId) => {
   return knex.select('user_id', 'store_id', 'uuid', 'phone_number', 'email', 'full_name', 'birthdate', 'password')
      .from("wmpos_user")
      .where({store_id : storeId})
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

User.findById = (oId) => {
   return knex.count('*', {as: 'count'})
      .from("wmpos_user")
      .where({email : oId})
      .then(function (result) {
         console.log("result",result);
         return result;
      })
      .catch((err) => console.log(err));
}

User.addSalesStoreUser = async (sPhoneNm,storeOwner,sEmail,userId,userPw,sCount,sType,sKey) => {
   let oResult = {};

   let oStoreInfo = {
      parent_store_id: 0,
      store_type_id: 0,
      phone_number: sPhoneNm,
      store_name: "",
      address1: "",
      lat : parseFloat(37.5657),
      lng : parseFloat(126.9769),
      pause : 1,
      noti_nearby_distance: 100, 
      noti_arrival_distance: 50, 
      parking_time: 5, 
      status: 0
   }
   
   const trx = await knex.transaction();
   try {
      const makeStoreId = await  trx(iStore)
                                 .insert(oStoreInfo)
                                 .then(async (res) => {
                                    return res;
                                 })
                                 .catch((err) => {
                                    console.log(err);
                                    throw e;
                                 });

      oResult.result_cd = '4444';

      let oStoreMedia = {
         store_id: makeStoreId[0],
         type: "logo",
         status: 0
      }
      for await (let iCount of asyncGenerator(4)) {
         await trx(iStoreMedia)
               .insert(oStoreMedia)
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log(err);
                  throw e;
               });
      }

      oResult.result_cd = '4445';

      await trx(iStoreCongestion)
            .insert({store_id : makeStoreId[0], congestion_type : 0, minute : 1, status : 1})
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });

      await trx(iStoreCongestion)
            .insert({store_id : makeStoreId[0], congestion_type : 1, minute : 25, status : 1})
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });

      await trx(iStoreCongestion)
            .insert({store_id : makeStoreId[0], congestion_type : 2, minute : 40, status : 1})
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });

      oResult.result_cd = '4447';

      let oAuthenticate = {
         store_id: makeStoreId[0],
         phone_number: sPhoneNm,
         email: userId,
      }

      await trx("wmpos_user_sms_code")
            .insert(oAuthenticate)
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });

      oResult.result_cd = '6666';    
      
      let oMerchant = {
         store_id: makeStoreId[0],
         phone_number: sPhoneNm,
         full_name: storeOwner,
         address1: "",
         bank_name: "",
         account_nm: "",
         account_holder: "",
         email: sEmail,
         status : 0
      }

      const iMerchantId = await  trx(iMerchant)
                                 .insert(oMerchant)
                                 .then(async (res) => {
                                    return res;
                                 })
                                 .catch((err) => {
                                    console.log(err);
                                    throw e;
                                 });

      oResult.result_cd = '7777';
      
      const convertTo = await beforeSave({ password: userPw });

      let oStoreUser = {};
      if(sType === "owner"){
         await trx("wmpos_admin_x_group")
               .insert({admin_user_id: sKey, store_id: makeStoreId[0]})
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log(err);
                  throw e;
               });

         oStoreUser = {
            email: userId,
            password: convertTo.password,
            uuid: uuidv1(),
            full_name: "none",
            phone_number: sPhoneNm,
            store_id: makeStoreId[0],
            role_id : 1,
            status : 1
         }
      } else {
         oStoreUser = {
            parent_id: sCount,
            email: userId,
            password: convertTo.password,
            uuid: uuidv1(),
            full_name: "none",
            phone_number: sPhoneNm,
            store_id: makeStoreId[0],
            role_id : 1,
            status : 1
         }
      }

      await trx(sTableName)
            .insert(oStoreUser)
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });


      await trx("wm_merchant_points")
            .insert({
               merchant_id: iMerchantId[0],
               uuid: uuidv1(),
               store_id: makeStoreId[0],
               points: 150000,
               type: 1,
               status: 1,
            })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
            throw e;
            });

      oResult.result_cd = '0000';
      oResult.storeId = makeStoreId[0];

      await trx.commit();
      return oResult;
   }
   catch (e) {
      console.log("AuthController.addSalesStoreUser fail !!! ===>",e);
      await trx.rollback();
      return oResult;
   }
}

User.addNewUser = async (sPhoneNm,storeOwner,sEmail,userId,userPw,authenticateId,businessType) => {
   let oResult = {};

   let oStoreInfo = {
      parent_store_id: 0,
      store_type_id: 0,
      phone_number: sPhoneNm,
      store_name: "",
      address1: "",
      lat : parseFloat(37.5657),
      lng : parseFloat(126.9769),
      pause : 1,
      noti_nearby_distance: 100, 
      noti_arrival_distance: 50, 
      parking_time: 5, 
      status: 0
   }
   
   const trx = await knex.transaction();
   try {
      const makeStoreId = await  trx(iStore)
                                 .insert(oStoreInfo)
                                 .then(async (res) => {
                                    return res;
                                 })
                                 .catch((err) => {
                                    console.log(err);
                                    throw e;
                                 });

      oResult.result_cd = '4444';

      let oStoreMedia = {
         store_id: makeStoreId[0],
         type: "logo",
         status: 0
      }
      for await (let iCount of asyncGenerator(4)) {
         await trx(iStoreMedia)
               .insert(oStoreMedia)
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log(err);
                  throw e;
               });
      }

      oResult.result_cd = '4445';

      await trx(iStoreCongestion)
            .insert({store_id : makeStoreId[0], congestion_type : 0, minute : 1, status : 1})
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });

      await trx(iStoreCongestion)
            .insert({store_id : makeStoreId[0], congestion_type : 1, minute : 25, status : 1})
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });

      await trx(iStoreCongestion)
            .insert({store_id : makeStoreId[0], congestion_type : 2, minute : 40, status : 1})
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });

      oResult.result_cd = '4447';

      await trx("wmpos_user_sms_code")
            .where({ user_sms_id: authenticateId })
            .update({ store_id: makeStoreId[0] })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      oResult.result_cd = '6666';

      let oMerchant = {
         store_id: makeStoreId[0],
         phone_number: sPhoneNm,
         full_name: storeOwner,
         address1: "",
         bank_name: "",
         account_nm: "",
         account_holder: "",
         email: sEmail,
         business_type: businessType,
         status : 0
      }
      const iMerchantId = await trx(iMerchant)
                              .insert(oMerchant)
                              .then(async (res) => {
                                 return res;
                              })
                              .catch((err) => {
                                 console.log(err);
                                 throw e;
                              });

      oResult.result_cd = '7777';
      
      const convertTo = await beforeSave({ password: userPw });

      let oStoreUser = {
         email: userId,
         password: convertTo.password,
         uuid: uuidv1(),
         full_name: "none",
         phone_number: sPhoneNm,
         store_id: makeStoreId[0],
         role_id : 1,
         status : 1
      }

      const makeUserId =  await trx(sTableName)
                                 .insert(oStoreUser)
                                 .then(async (res) => {
                                    return res;
                                 })
                                 .catch((err) => {
                                    console.log(err);
                                 throw e;
                                 });
      oResult.result_cd = '6666';     

      await trx("wm_merchant_points")
            .insert({
               merchant_id: iMerchantId[0],
               uuid: uuidv1(),
               store_id: makeStoreId[0],
               points: 150000,
               type: 1,
               status: 1,
            })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
            throw e;
            });

      oResult.result_cd = '0000';
      oResult.storeId = makeStoreId[0];
      oResult.userId = makeUserId[0];
      oResult.password = convertTo.password;

      await trx.commit();
      return oResult;
   }
   catch (e) {
      console.log("AuthController.addNewUser fail !!! ===>",e);
      await trx.rollback();
      return oResult;
   }
}





module.exports = User;
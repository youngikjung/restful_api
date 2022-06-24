'use strict';

const { v1: uuidv1 } = require('uuid');
var   config = require('../config'),
      knex = require('../services/database');

const iWebsiteBanner = 'wm_website_banner';
const iWebsiteInquiry = 'wm_website_inquiry';
const iWebsiteInfo = 'wm_website_info';
const iWmposNotice = 'wmpos_notice';
const iWmNotice = 'wm_notice';
const iWmUser = 'wm_user';
const iWmInquiry = 'wm_inquiry';
const iWmUserCard = 'wm_user_reg_card';
const iWmUserCar = 'wm_user_reg_car';
const iWmUserBluelink = 'wm_user_bluelink';
const iWmUserPoints = 'wm_user_points';
const iWmOrder = 'wm_order';
const iWmStore = 'wm_store';
const iWmStoreInvoice = "wm_store_invoice";
const iThrooAdminDownload = "throo_admin_download";
const sOrder_payment_pg = 'wm_order_payment_pg';
const sOrder_payment_tpay = 'wm_order_payment_tpay';
const sOrder_payment = 'wm_order_payment';
const sUser_points = 'wm_user_points';
const sEventCouponUser = 'wm_event_coupon_user';

let Management = {};

Management.checkUpSalesCompany = async (qDate) => {
   let sQuery = knex.raw(`
                  t2.group_name 
      FROM        wmpos_user        AS t1
      INNER JOIN  wmpos_admin_user  AS t2 ON t2.group_id = t1.parent_id
      WHERE       t1.store_id = ?
   `, [qDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.checkUpOriginCompany = async (qDate) => {
   let sQuery = knex.raw(`
                  t3.group_name 
      FROM        wmpos_user           AS t1
      INNER JOIN  wmpos_admin_x_group  AS t2 ON t2.store_id = t1.store_id 
      INNER JOIN  wmpos_admin_user     AS t3 ON t3.admin_user_id = t2.admin_user_id
      WHERE       t1.store_id = ?
   `, [qDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.getUserStatus = async () => {
   let sQuery = knex.raw(`
      status, 
      (
         SELECT count(order_id) FROM wm_order WHERE user_id = t1.user_id AND payment_id != 0 AND cancelled_at IS NULL
      ) AS sNm
      FROM wm_user   AS t1
   `, []);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.getTotalStore = async (qDate) => {
   let sQuery = knex.raw(`
               COUNT(store_id) AS sNm
      FROM     wm_store
      WHERE    DATE(created_at) = DATE(?)
   `, [qDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.getActivateStore = async (qDate) => {
   let sQuery = knex.raw(`
               COUNT(store_id) AS sNm
      FROM     wm_store
      WHERE    status = 1
      AND      DATE(created_at) = DATE(?)
   `, [qDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.getUnActivateStore = async (qDate) => {
   let sQuery = knex.raw(`
               COUNT(store_id) AS sNm
      FROM     wm_store
      WHERE    status = 0
      AND      DATE(created_at) = DATE(?)
   `, [qDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.getSalesTeam = async () => {
   let sQuery = knex.raw(`
               group_name,
               group_id,
               (
                  SELECT 
                           COUNT(user_id) 
                  FROM     wmpos_user 
                  WHERE    parent_id = group_id
               ) AS total
   FROM        wmpos_admin_user
   WHERE       status = 1
   GROUP BY    group_id
   `, []);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.salesChart = async (qParam,qDate,aDate) => {
   let sQuery = knex.raw(`
                  COUNT(t2.store_id)   AS total
      FROM        wmpos_admin_user     AS t1
      INNER JOIN  wmpos_user           AS t2 ON t2.parent_id = t1.group_id
      WHERE       t1.group_id = ?
      AND         DATE(t2.created_at) BETWEEN DATE(?) AND DATE(?)
   `, [qParam,qDate,aDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.getAllSalesUser = () => {
   return  knex.select("full_name","group_name","content","email","admin_user_id","status")
               .from("wmpos_admin_user")
               .orderBy('created_at', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.getOrderProductOption = (sParam) => {
   return  knex.select("name","price")
               .from("wm_order_detail_option")
               .where({ order_detail_id: sParam})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.getLocationDistance = (sParam) => {
   return  knex.select("lat","lng")
               .from("wm_order_location")
               .where({ order_id: sParam})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.adminProductInfo = async (iUserId) => {
   let sQuery = knex.raw(`
               t2.name, 
               t2.org_price, 
               t2.base_price, 
               t3.url_path 
   FROM        wm_menu_cat_x_prd    AS t1
   INNER JOIN  wm_product           AS t2 ON t2.product_id = t1.product_id 
   LEFT JOIN   wm_product_media     AS t3 ON t3.product_id = t2.product_id 
   WHERE       t1.category_id = ?
   `, [iUserId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.getInfoByStoreId = async (iUserId) => {
   let sQuery = knex.raw(`
               t1.address1, 
               t1.phone_number AS storePhone,
               t1.description, 
               t1.created_at,
               t1.description_extra,
               t1.description_noti,
               t1.parking_time,
               t1.noti_nearby_distance,
               t1.lat,
               t1.lng,
               t1.parking_pan,
               t1.parking_tilt,
               t1.parking_zoom,
               t1.parking_image, 
               t2.full_name,
               t2.address1,
               t2.email AS ownerEmail,
               t2.bank_name,
               t2.account_nm,
               t2.business_number,
               t2.phone_number,
               t3.email,
               t4.minute,
               t4.congestion_type,  
               t5.holiday_from, 
               t5.holiday_to
   FROM        wm_store                   AS t1
   LEFT JOIN   wm_merchant                AS t2 ON t1.store_id = t2.store_id
   LEFT JOIN   wmpos_user                 AS t3 ON t3.store_id = t1.store_id 
   LEFT JOIN   wm_store_time_congestion   AS t4 ON t4.store_id = t1.store_id 
   LEFT JOIN   wm_store_time_holiday      AS t5 ON t5.store_id = t1.store_id  AND t5.type = 1
   WHERE       t1.store_id = ?
   `, [iUserId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.storeTypeByStoreId = async (iUserId) => {
   let sQuery = knex.raw(`
               t1.is_main,
               t2.name 
   FROM        wm_store_x_store_type   AS t1
   INNER JOIN  wm_store_type           AS t2 ON t2.store_type_id = t1.store_type_id 
   WHERE       t1.store_id = ?
   `, [iUserId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.operationTimeByStoreId = async (iUserId) => {
   let sQuery = knex.raw(`
               t1.store_time_id,
               t1.opening_time, 
               t1.closing_time, 
               t1.congestion_type, 
               t1.day_of_week,
               t2.minute
   FROM        wm_store_time_business   AS t1
   INNER JOIN  wm_store_time_congestion AS t2 ON t2.congestion_type = t1.congestion_type 
   WHERE       t1.store_id = ?
   AND         t1.status = 1
   GROUP BY    t1.store_time_id
   `, [iUserId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.storePictureList = (sParam) => {
   return  knex.select("*")
               .from("wm_store_media")
               .where({ store_id: sParam})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.dayOffList = (sParam) => {
   return  knex.select("store_holiday_id","holiday_from","holiday_to","day_of_week","date_type")
               .from("wm_store_time_holiday")
               .where({ store_id: sParam})
               .where({ type: 0})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.orderList = async (iUserId) => {
   let sQuery = knex.raw(`
                  t2.order_detail_id, 
                  t2.product_nm,
                  t2.has_option, 
                  t2.base_price, 
                  t2.quantity
      FROM        wm_order                         AS t1
      INNER JOIN  wm_order_detail                  AS t2 ON t1.order_id = t2.order_id 
      WHERE       t1.order_id = ?
   `, [iUserId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.orderListAdmin = async (iUserId) => {
   let sQuery = knex.raw(`
                  t2.phone_number,
                  t2.email,
                  t1.total_amount_org, 
                  t1.created_at, 
                  t1.state_id,
                  t1.order_id 
      FROM        wm_order                 AS t1
      INNER JOIN  wm_user                  AS t2 ON t1.user_id = t2.user_id 
      WHERE       t1.store_id = ?
      ORDER BY    t1.order_id DESC
   `, [iUserId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.getPartnerCouponByOrderId = async (iUserId) => {
   let sQuery = knex.raw(`
                  t1.amount
      FROM        wm_order_discount AS t1
      INNER JOIN  wm_order AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         t1.CODE = "PARTNER_COUPON"
      AND         t2.order_id = ?
   `, [iUserId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.getThrooCouponByOrderId = async (iUserId) => {
   let sQuery = knex.raw(`
                  t1.amount
      FROM        wm_order_discount AS t1
      INNER JOIN  wm_order AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         t1.CODE = "COUPON"
      AND         t2.order_id = ?
   `, [iUserId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.getThrooPointByOrderId = async (iUserId) => {
   let sQuery = knex.raw(`
                  t1.amount
      FROM        wm_order_discount AS t1
      inner join  wm_order AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         t1.CODE = "ORDER_POINTS"
      AND         t2.order_id = ?
   `, [iUserId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.OrderInfo = async (iUserId) => {
   let sQuery = knex.raw(`
                  t1.created_at, 
                  t1.total_amount_org, 
                  t1.total_amount_excl,
                  t1.state_id,
                  t1.license_number,
                  t1.inquiry,
                  t2.address1,
                  t2.store_name, 
                  t2.phone_number,
                  t2.parking_zoom,
                  t2.parking_pan,
                  t2.parking_tilt,
                  t2.lat,
                  t2.lng, 
                  t3.phone_number as userPhone, 
                  t3.full_name,
                  t3.email,
                  t4.full_name as owner
      FROM        wm_order                 AS t1
      INNER JOIN  wm_store                 AS t2 ON t1.store_id = t2.store_id
      INNER JOIN  wm_user                  AS t3 ON t1.user_id = t3.user_id
      INNER JOIN  wm_merchant              AS t4 ON t4.store_id = t2.store_id 
      WHERE       t1.order_id = ?
   `, [iUserId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.completeCancellationByPG = async (data, sMethod, iUserId, sCancelSource) => {
   let result_cd = '77776';
   const trx = await knex.transaction();
   let iCancelStateId = 16001;
   if (sCancelSource != undefined && sCancelSource === 'autocancel') {
      iCancelStateId = 18001;
   } else if (sCancelSource != undefined && sCancelSource === 'storecancel') {
      iCancelStateId = 17001;
   }

   try {
      await trx(iWmOrder)
            .where({ order_id: data.orderId })
            .update({ state_id: iCancelStateId, cancelled_at: knex.fn.now() })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });

      result_cd = '77777';

      await trx(sOrder_payment)
            .where({ order_id: data.orderId })
            .update({ payment_state_id: 20003, updated_at: knex.fn.now() })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });

      result_cd = '88888';

      let oUserList = {
         amount: data.sAmt,
         cancel_date: data.cancelDate,
         mid: config.keys.mid,
         payment_id: data.payment_id,
         result_cd: '999',
         result_msg: data.content,
         transaction_id: data.tid,
         ccard_no: data.card_no,
         app_dt: data.app_dt + data.app_tm,
         app_no: data.app_no,
         fn_cd: data.fn_cd,
         fn_name: data.fn_nm,
         merchant_no: data.fn_no,
         acqu_nm: data.acqu_nm,
         acqu_co: data.acqu_co
      }

      let orderTable = sOrder_payment_pg;
      if (sMethod === 'online') {
         orderTable = sOrder_payment_tpay;
         oUserList = {
            amount: data.sAmt,
            cancel_date: data.cancelDate,
            mid: config.keys.midIso,
            payment_id: data.payment_id,
            result_cd: '9999',
            result_msg: data.content,
            transaction_id: data.tid,
            ccard_no: data.card_no,
            auth_date: data.app_dt + data.app_tm,
            auth_code: data.app_no,
            fn_cd: data.fn_cd,
            fn_name: data.fn_nm,
            merchant_no: data.fn_no,
            acqu_nm: data.acqu_nm,
            acqu_co: data.acqu_co,
            card_interest: data.cardInterest,
         }
      }

      await trx(orderTable)
            .insert(oUserList)
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });

      oUserList = {
         user_id: iUserId,
         uuid: uuidv1(),
         order_id: data.orderId,
         points: 0,
         type: 'DELETE',
         description: '주문취소로 인한 적립 포인트 삭제 ',
         status: 0,
      }

      await trx(sUser_points)
            .insert(oUserList)
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });

      // Update order point saved to : status > 0
      await trx(sUser_points)
            .where({ order_id: data.orderId, type: 'SAVE' }).orWhere({ order_id: data.orderId, type: 'ORDER' })
            .update({ status: 0, updated_at: knex.fn.now() })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });

      // Update order coupon delete
      await trx(sEventCouponUser)
            .where({ order_id: data.orderId })
            .update({ order_id: 0, status: 1 })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log(err);
               throw e;
            });

      result_cd = '00000';

      await trx.commit();
      return result_cd;
   }
   catch (e) {
      await trx.rollback();
      return result_cd;
   }
}

Management.selectTid = (iOrderId, bIsCancelled) => {

   let sQueryCancel = `INNER JOIN ${sOrder_payment_tpay} AS t2`;
   let sQueryTid = `t2.transaction_id`;
   if (bIsCancelled != undefined && bIsCancelled == 'billingKey') {
      sQueryCancel = `INNER JOIN ${sOrder_payment_pg} AS t2`;
      sQueryTid = `t2.transaction_id`;
   }

   let sQuery = knex.raw(`
         t1.payment_id,
         t1.state_id,
         t1.user_id,
         t1.total_amount_incl,
         t1.cancel_pause,
         t1.cancel_time,
         ${sQueryTid}
      FROM ${iWmOrder} AS t1
      ${sQueryCancel}
      ON t1.payment_id = t2.payment_id
      WHERE t1.order_id = ?        
   `, [iOrderId]);

   let oQuery = knex.select(sQuery);

   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Management.getOrderPayWay = (sParam) => {
   return  knex.select("payment_method","amount")
               .from("wm_order_payment")
               .where({ order_id: sParam})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.getOrderList = async (qDate,sDate) => {
   let sQuery = knex.raw(`
                  t1.created_at, 
                  t1.total_amount_org, 
                  t1.total_amount_incl,
                  t1.discount_amount,
                  t1.state_id,
                  t1.order_id,
                  t2.email, 
                  t2.phone_number AS user_phone, 
                  t3.store_name, 
                  t3.phone_number AS store_phone
      FROM        wm_order                         AS t1
      INNER JOIN  wm_user                          AS t2 ON t1.user_id = t2.user_id 
      INNER JOIN  wm_store                         AS t3 ON t3.store_id = t1.store_id
      WHERE       DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.store_id NOT IN (1,2,707)
      ORDER BY    t1.order_id DESC
   `, [qDate,sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.completeOrderChart = async (qDate) => {
   let sQuery = knex.raw(`
               COUNT(order_id) AS sNm
      FROM     wm_order
      WHERE    state_id IN (13001,13002,15001,15002,16002)
      AND      DATE(created_at) = DATE(?)
   `, [qDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.storeCancelOrderChart = async (qDate) => {
   let sQuery = knex.raw(`
               COUNT(order_id) AS sNm
      FROM     wm_order
      WHERE    state_id IN (14005,17001)
      AND      DATE(created_at) = DATE(?)
   `, [qDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.completeOrderChartByMonth = async (qDate,aDate) => {
   let sQuery = knex.raw(`
               COUNT(order_id) AS sNm
      FROM     wm_order
      WHERE    state_id IN (13001,13002,15001,15002,16002)
      AND      DATE(created_at) BETWEEN DATE(?) AND DATE(?)
      AND      store_id != 1
      AND      store_id != 2
      AND      store_id != 707
   `, [qDate,aDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.storeCancelOrderChartByMonth = async (qDate,aDate) => {
   let sQuery = knex.raw(`
               COUNT(order_id) AS sNm
      FROM     wm_order
      WHERE    state_id IN (14005,17001)
      AND      DATE(created_at) BETWEEN DATE(?) AND DATE(?)
      AND      store_id != 1
      AND      store_id != 2
      AND      store_id != 707
   `, [qDate,aDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.autoCancelOrderChart = async (qDate) => {
   let sQuery = knex.raw(`
               COUNT(order_id) AS sNm
      FROM     wm_order
      WHERE    state_id = 18001
      AND      DATE(created_at) = DATE(?)
   `, [qDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.monthlyStoreIncreaseChart = async (qDate,wDate) => {
   let sQuery = knex.raw(`
                  COUNT(t1.store_id)   AS sNm
      FROM        wm_store             AS t1
      INNER JOIN  wm_merchant          AS t2 ON t1.store_id = t2.store_id          
      WHERE       DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?) 
      AND         t2.phone_number != "01039438070" 
      AND         t1.store_name != "스루"
      AND         t1.store_name != "스루 컨벤션"
      AND         t1.store_name != "스루 강남역점"
   `, [qDate,wDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.monthlyStoreIncreaseChartByActive = async (qDate,wDate) => {
   let sQuery = knex.raw(`
                  COUNT(t1.store_id)   AS sNm
      FROM        wm_store             AS t1
      INNER JOIN  wm_merchant          AS t2 ON t1.store_id = t2.store_id          
      WHERE       DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?) 
      AND         t2.phone_number != "01039438070" 
      AND         t1.store_name != "스루"
      AND         t1.store_name != "스루 컨벤션"
      AND         t1.store_name != "스루 강남역점"
      AND         t1.status = 1
   `, [qDate,wDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.monthlyStoreIncreaseChartByUnActive = async (qDate,wDate) => {
   let sQuery = knex.raw(`
                  COUNT(t1.store_id)   AS sNm
      FROM        wm_store             AS t1
      INNER JOIN  wm_merchant          AS t2 ON t1.store_id = t2.store_id          
      WHERE       DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?) 
      AND         t2.phone_number != "01039438070" 
      AND         t1.store_name != "스루"
      AND         t1.store_name != "스루 컨벤션"
      AND         t1.store_name != "스루 강남역점"
      AND         t1.status = 0
   `, [qDate,wDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.getMonthTotalAmountOrg = async (qDate,wDate,eDate) => {
   let sQuery = knex.raw(`
               SUM(total_amount_org)   AS sNm
      FROM     wm_order 
      WHERE    payment_id != 0
      AND      cancelled_at IS NULL
      AND      DATE(created_at) BETWEEN DATE(?) AND DATE(?) 
      AND      store_id = ?   
   `, [qDate,wDate,eDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.insertQuery = (qParam,wParam,eParam,rParam,tParam,yParam) => {
   return knex(iThrooAdminDownload)
         .insert({ user_id: qParam, type: wParam, ip_address: eParam, purpose: rParam, os_version: tParam, current_path: yParam })
         .then((result) => {
            return result;
         }).catch((err) => console.log(err));
}

Management.storeListByDate = async (qDate,wDate) => {
   let sQuery = knex.raw(`
                     t1.store_id,
                     t1.created_at, 
                     t1.store_name, 
                     t1.phone_number,
                     t1.address1,
                     t1.status,
                     t2.email,
                     t2.business_number,
                     t3.email as storeId, 
                     (
                        SELECT   count(product_id) 
                        FROM     wm_product 
                        WHERE    store_id = t1.store_id
                     ) AS "productNm",
                     (
                        SELECT      COUNT(*) 
                        FROM        wm_order 
                        WHERE       store_id = t1.store_id 
                        AND         state_id NOT IN (14004,14005,16001,17001,18001)
                     ) AS "orderCount"
      FROM           wm_store       AS t1
      INNER JOIN     wm_merchant    AS t2 ON t1.store_id = t2.store_id 
      INNER JOIN     wmpos_user     AS t3 on t3.store_id = t1.store_id
      WHERE          DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
      AND            t2.phone_number NOT IN ("01039438070","01029273377")
      ORDER BY       t1.created_at DESC
   `, [qDate,wDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.userListByDate = async (qDate,wDate,eDate,rDate,tDate,yDate) => {
   let sQuery = knex.raw(`
                  t1.created_at, 
                  t1.apple_id, 
                  t1.device_os_info, 
                  t1.email, 
                  t1.full_name, 
                  t1.kakao_id, 
                  t1.phone_number,
                  t1.user_id, 
                  t2.bluelink_id, 
                  t2.expire_date, 
                  t2.is_disconnected,
                  (
                     SELECT   COUNT(*) 
                     FROM     wm_user_reg_car 
                     WHERE    DATE(created_at) BETWEEN DATE(?) AND DATE(?) 
                     AND      user_id = t1.user_id
                  ) AS carNm,
                  (
                     SELECT   COUNT(*) 
                     FROM     wm_user_reg_card 
                     WHERE    DATE(created_at) BETWEEN DATE(?) AND DATE(?) 
                     AND      user_id = t1.user_id
                  ) AS cardNm
      FROM        wm_user AS t1
      LEFT JOIN   wm_user_bluelink AS t2 ON t1.user_id = t2.user_id
      WHERE       DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
   `, [qDate,wDate,eDate,rDate,tDate,yDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.userIncreaseChartByTotal = async (sDate) => {
   let sQuery = knex.raw(`
               COUNT(*) AS sNm
      FROM     wm_user 
      WHERE    DATE(created_at) = DATE(?); 
   `, [sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.monthlyUserIncreaseChartByTotal = async (sDate,tDate) => {
   let sQuery = knex.raw(`
               COUNT(*) AS sNm
      FROM     wm_user 
      WHERE    DATE(created_at) BETWEEN DATE(?) AND DATE(?)
      AND      status = 1
   `, [sDate,tDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.userIncreaseChartByKakao = async (sDate) => {
   let sQuery = knex.raw(`
               COUNT(*) AS sNm
      FROM     wm_user 
      WHERE    kakao_id != "" 
      AND      apple_id = "" 
      AND      status = 1
      AND      DATE(created_at) = DATE(?);
   `, [sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.monthlyUserIncreaseChartByKakao = async (sDate,tDate) => {
   let sQuery = knex.raw(`
               COUNT(*) AS sNm
      FROM     wm_user 
      WHERE    kakao_id != "" 
      AND      apple_id = "" 
      AND      status = 1
      AND      DATE(created_at) BETWEEN DATE(?) AND DATE(?)
   `, [sDate,tDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.userIncreaseChartByNormal = async (sDate) => {
   let sQuery = knex.raw(`
               COUNT(*) AS sNm
      FROM     wm_user 
      WHERE    kakao_id = "" 
      AND      apple_id = "" 
      AND      status = 1
      AND      DATE(created_at) = DATE(?);
   `, [sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.monthlyUserIncreaseChartByNormal = async (sDate,tDate) => {
   let sQuery = knex.raw(`
               COUNT(*) AS sNm
      FROM     wm_user 
      WHERE    kakao_id = "" 
      AND      apple_id = "" 
      AND      status = 1
      AND      DATE(created_at) BETWEEN DATE(?) AND DATE(?)
   `, [sDate,tDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.userIncreaseChartByApple = async (sDate) => {
   let sQuery = knex.raw(`
               COUNT(*) AS sNm
      FROM     wm_user 
      WHERE    kakao_id = "" 
      AND      apple_id != "" 
      AND      status = 1
      AND      DATE(created_at) = DATE(?);
   `, [sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.monthlyUserIncreaseChartByApple = async (sDate,tDate) => {
   let sQuery = knex.raw(`
               COUNT(*) AS sNm
      FROM     wm_user 
      WHERE    kakao_id = "" 
      AND      apple_id != "" 
      AND      status = 1
      AND      DATE(created_at) BETWEEN DATE(?) AND DATE(?)
   `, [sDate,tDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.sendMailSettlement = async (sParam) => {
   return knex(iWmStoreInvoice)
   .insert({ store_id: sParam, transaction_date: knex.fn.now(), invoice_type: 0 })
   .then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Management.completeSettlement = (sParam) => {
   return knex(iWmStoreInvoice)
         .insert({ store_id: sParam, transaction_date: knex.fn.now(), invoice_type: 1 })
         .then((result) => {
            return result;
         }).catch((err) => console.log(err));
}

Management.storeAmountChart = (fromDate, toDate, sParam) => {
   let sQuery = knex.raw(`
                  SUM(total_amount_org) AS sCount
      FROM        wm_order          
      WHERE       DATE(created_at) BETWEEN DATE(?) AND DATE(?)
      AND         store_id = ?
      AND         payment_id != 0
      AND         cancelled_at IS NULL
   `, [fromDate,toDate,sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Management.getStoreInfo = (sParam) => {
   let sQuery = knex.raw(`
                  t1.store_name,
                  t1.phone_number,
                  t1.order_time,
                  t1.description_holiday,
                  t1.noti_nearby_distance,
                  t1.noti_arrival_distance,
                  t1.parking_time,
                  t1.address1,
                  t1.description,
                  t1.description_noti,
                  t1.description_extra,
                  t1.lat,
                  t1.lng,
                  t1.pause,
                  t2.full_name,
                  t4.name 
      FROM        wm_store                AS t1    	
      INNER JOIN  wm_merchant             AS t2 ON t2.store_id = t1.store_id 
      INNER JOIN  wm_store_x_store_type   AS t3 ON t3.store_id = t1.store_id 
      INNER JOIN  wm_store_type           AS t4 ON t4.store_type_id = t3.store_type_id 
      WHERE       t1.store_id = ? 
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.orderListByStore = (sParam) => {
   return  knex.select("*")
               .from(iWmOrder)
               .where({ store_id: sParam})
               .orderBy('created_at', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.storeTypeChart = (sParam,aParam,xParam) => {
   let sQuery = knex.raw(`
                  COUNT(t1.store_id)      AS total
      FROM        wm_store       AS t1    	
      INNER JOIN  wm_store_type  AS t2 ON t2.store_type_id = t1.store_type_id 
      WHERE       DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t2.parent_store_type_id = t1.parent_store_id 
      AND         t2.store_type_id = ?; 
   `, [sParam,aParam,xParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.getAllStoreList = () => {
   let sQuery = knex.raw(`
                  t1.store_id, 
                  t1.status,
                  t1.pause
      FROM        wm_store       AS t1    	
      INNER JOIN  wm_merchant    AS t2 ON t2.store_id = t1.store_id 
      WHERE       t2.phone_number NOT IN ("01039438070","01029273377");
   `, []);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.searchStoreByName = (sParam) => {
   return  knex.select("store_id", "store_name", "status")
               .from(iWmStore)
               .where("store_name", 'like', `%${sParam}%`)
               .orderBy('created_at', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.getStoreList = (sParam) => {
   return  knex.select("store_id", "store_name", "status")
               .from(iWmStore)
               .orderBy('created_at', 'desc')
               .limit(sParam)
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.userIncreaseChart = (sParam,aParam) => {
   let sQuery = knex.raw(`
            COUNT(*) AS total
      FROM  wm_user
      WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
   `, [sParam,aParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.storeIncreaseChart = (sParam,aParam) => {
   let sQuery = knex.raw(`
            COUNT(*) AS total
      FROM  wm_store
      WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
   `, [sParam,aParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.userCardChart = (sParam,aParam) => {
   let sQuery = knex.raw(`
            COUNT(*) AS total
      FROM  wm_user_reg_card
      WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
   `, [sParam,aParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.userCarChart = (sParam,aParam) => {
   let sQuery = knex.raw(`
            COUNT(*) AS total
      FROM  wm_user_reg_car
      WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
   `, [sParam,aParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.blueLinkUserCount = (sParam,aParam,kParam) => {
   let sQuery = knex.raw(`
               COUNT(*) AS total
      FROM     wm_user_bluelink
      WHERE    DATE(created_at) BETWEEN DATE(?) AND DATE(?)
      AND      type = ?
   `, [sParam,aParam,kParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.userBlueLinkChart = (sParam,aParam) => {
   let sQuery = knex.raw(`
            COUNT(*) AS total
      FROM  wm_user_bluelink
      WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)
   `, [sParam,aParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.getUserPointsById = (aUserId) => {
   let sQuery = knex.raw(`
         t2.points_used,
         t2.points_saved,
         t2.points_to_be,
         (t2.points_saved + t2.points_used) AS points
      FROM (
         SELECT
            SUM(CASE 
               WHEN ((t1.type = 'ORDER' OR t1.type = 'DELETE' OR t1.type = 'CANCEL') AND t1.status = 1) THEN t1.points
               ELSE 0
            END) AS points_used,
            SUM(CASE 
               WHEN (t1.type = 'SAVE' AND t1.status = 1 AND t1.valid_from <= CURRENT_TIMESTAMP) THEN t1.points
               ELSE 0
            END) AS points_saved,
            SUM(CASE 
               WHEN (t1.status = 1) THEN t1.points
               ELSE 0
            END) AS points_to_be
         FROM 
            wm_user_points AS t1
         WHERE 
            t1.user_id IN (?)
      ) AS t2
   `, [aUserId]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log(err));
}

Management.getUserPointsById = (aUserId) => {
   let sQuery = knex.raw(`
         t2.points_used,
         t2.points_saved,
         t2.points_to_be,
         (t2.points_saved + t2.points_used) AS points
      FROM (
         SELECT
            SUM(CASE 
               WHEN ((t1.type = 'ORDER' OR t1.type = 'DELETE' OR t1.type = 'CANCEL') AND t1.status = 1) THEN t1.points
               ELSE 0
            END) AS points_used,
            SUM(CASE 
               WHEN (t1.type = 'SAVE' AND t1.status = 1 AND t1.valid_from <= CURRENT_TIMESTAMP) THEN t1.points
               ELSE 0
            END) AS points_saved,
            SUM(CASE 
               WHEN (t1.status = 1) THEN t1.points
               ELSE 0
            END) AS points_to_be
         FROM 
            wm_user_points AS t1
         WHERE 
            t1.user_id IN (?)
      ) AS t2
   `, [aUserId]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log(err));
}

Management.userDetail = (sParam) => {
   let sQuery = knex.raw(`
                  t1.status, 
                  t1.email, 
                  t1.phone_number, 
                  t1.apple_id, 
                  t1.kakao_id, 
                  t1.full_name, 
                  t2.type
      FROM        wm_user           AS t1    	
      LEFT JOIN   wm_user_bluelink  AS t2 ON t1.user_id = t2.user_id 
      WHERE       t1.user_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.adminUser = (sParam) => {
   return  knex.select("store_name")
               .from(iWmUser)
               .where({ user_id: sParam})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.storeName = (sParam) => {
   return  knex.select("store_name")
               .from(iWmStore)
               .where({ store_id: sParam})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.orderListByUser = (sParam) => {
   let sQuery = knex.raw(`
               license_number,
               state_id,
               store_id,
               created_at,
               total_amount_excl,
               total_amount_org
      FROM     wm_order
      WHERE    user_id = ?
      AND      state_id IN (14004,14005,15002,16001,16002,17001,18001)
      ORDER BY order_id DESC
   `, [sParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.webResponseInquiry = (iParam,kParam) => {
   return   knex("wm_website_inquiry")
            .update({ admin_id : iParam, state_id: 1 })
            .where({ inquiry_id: kParam })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Management.webResponseInquiryConfirm = (iParam,kParam) => {
   return   knex("wm_website_inquiry")
            .update({ admin_id : iParam, confirm_at : knex.fn.now(), state_id: 1 })
            .where({ inquiry_id: kParam })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Management.webResponseInquiryDelivery = (iParam,kParam,qParam,wParam,oParam) => {
   return   knex("wm_website_inquiry")
            .update({ admin_id : iParam, delivered_at : knex.fn.now(), state_id: 2, delivery_param: qParam, delivery_company: wParam, delivery_company_id : oParam })
            .where({ inquiry_id: kParam })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Management.webResponseInquiryFinish = (iParam,kParam) => {
   return   knex("wm_website_inquiry")
            .update({ admin_id : iParam, updated_at : knex.fn.now(), state_id: 3 })
            .where({ inquiry_id: kParam })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Management.responseInquiry = (sParam,iParam,kParam) => {
   return   knex("wm_inquiry")
            .update({ answer : sParam, admin_id : iParam, state_id: 1 })
            .where({ inquiry_id: kParam })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Management.inquiryList = () => {
   let sQuery = knex.raw(`
                        t1.created_at,
                        t1.inquiry_id, 
                        t1.title, 
                        t1.content, 
                        t1.answer, 
                        t1.state_id, 
                        t1.img_url, 
                        t2.full_name, 
                        t3.phone_number, 
                        t3.email 
      FROM              wm_inquiry AS t1 
      LEFT JOIN         wmweb_user AS t2 ON t2.user_id = t1.admin_id
      LEFT JOIN         wm_user AS t3 ON t3.user_id = t1.user_id 
      ORDER BY          t1.created_at DESC
   `, []);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.webInquiryList = () => {
   let sQuery = knex.raw(`
                        t1.created_at,
                        t1.inquiry_id, 
                        t1.content, 
                        t1.email, 
                        t1.address, 
                        t1.phone_number,
                        t1.store_name, 
                        t1.file_type,
                        t1.state_id, 
                        t1.img_url, 
                        t2.full_name
      FROM              wm_website_inquiry AS t1 
      LEFT JOIN         wmweb_user AS t2 ON t2.user_id = t1.admin_id
      WHERE             t1.categories = "event"
      ORDER BY          t1.created_at DESC
   `, []);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.webInquiryList2 = () => {
   let sQuery = knex.raw(`
                        t1.inquiry_id,
                        t1.store_name,
                        t1.phone_number,
                        t1.address,
                        t1.title,
                        t1.delivery_company,
                        t1.delivery_param,
                        t1.created_at,
                        t1.updated_at,
                        t1.confirm_at,
                        t1.delivered_at,
                        t1.state_id, 
                        t2.full_name 
      FROM              throo_db.wm_website_inquiry AS t1 
      LEFT JOIN         throo_db.wmweb_user AS t2 ON t2.user_id = t1.admin_id
      WHERE             t1.categories = "event"
      AND               DATE(t1.created_at) > "2022-06-14"
      ORDER BY          t1.created_at DESC
   `, []);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.userBlueLink = (sParam) => {
   return  knex.select("type")
               .from(iWmUserBluelink)
               .where({ user_id: sParam})
               .where({ is_disconnected: 0})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.userPoints = (sParam) => {
   return  knex.sum("points")
               .from(iWmUserPoints)
               .where({ user_id: sParam})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.cardListByUser = (sParam) => {
   return  knex.select("ccard_name", "created_at", "ccard_company")
               .from(iWmUserCard)
               .where({ user_id: sParam})
               .where({ status: 1})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.carListByUser = (sParam) => {
   return  knex.select("car_name", "car_style", "license_number", "created_at")
               .from(iWmUserCar)
               .where({ user_id: sParam})
               .where({ status: 1})
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.inquiryListByUser = (sParam) => {
   let sQuery = knex.raw(`
                  t1.state_id,
                  t1.admin_id,
                  t1.created_at,
                  t1.title,
                  t1.updated_at,
                  t2.full_name
      FROM        wm_inquiry     AS t1    	
      INNER JOIN  wmweb_user     AS t2 ON t1.admin_id = t2.user_id 
      WHERE       t1.user_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.searchUserByParam = (keyword) => {
   let name = "%" + keyword + "%";
   let email = "%" + keyword + "%";
   let phone = "%" + keyword + "%";

   let sQuery = knex.raw(`
                  user_id,
                  apple_id,
                  kakao_email,
                  kakao_id,
                  phone_number,
                  email,
                  full_name,
                  status,
                  created_at
      FROM        wm_user
      WHERE       full_name LIKE ? || email LIKE ? || phone_number LIKE ?
      ORDER BY    created_at DESC;
   `, [name,email,phone]);

   let oQuery = knex.select(sQuery);

   return oQuery.then( (result) => {
      return result;
   }).catch((err) => console.log(err));
}

Management.getUserList = (sParam) => {
   return  knex.select("user_id", "apple_id", "kakao_email", "kakao_id", "phone_number", "email", "full_name", "status", "created_at")
               .from(iWmUser)
               .orderBy('created_at', 'desc')
               .limit(sParam)
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.getBannerList = () => {
   return  knex.select('banner_id','url_path','title', 'type', "mime_type", 'status')
               .from(iWebsiteBanner)
               .where({site: "ceo"})
               .orderBy('created_at', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.getWebNoticeList = () => {
   return  knex.select('title','content')
               .from("wmpos_notice")
               .orderBy('created_at', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.commencementBusiness = () => {
   return  knex.select('inquiry_id','store_name','phone_number','email',"address","title",'state_id')
               .from(iWebsiteInquiry)
               .where({categories: "inquire"})
               .orderBy('created_at', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.getHomeNoticeList = () => {
   return  knex.select('notice_id','title',"created_at","content")
               .from(iWmposNotice)
               .orderBy('created_at', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}
Management.getAppNoticeList = () => {
   return  knex.select('notice_id','title',"created_at","answer")
               .from(iWmNotice)
               .orderBy('created_at', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Management.insertAppNotice = (sParam,aParam,iParam) => {
   return knex(iWmNotice)
         .insert({ title: sParam, answer: aParam, admin_id : iParam })
         .then((result) => {
            return result;
         }).catch((err) => console.log(err));
}

Management.insertWebNotice = (sParam,aParam,iParam) => {
   return knex("wmpos_notice")
         .insert({ title: sParam, content: aParam, admin_id: iParam })
         .then((result) => {
            return result;
         }).catch((err) => console.log(err));
}

Management.insertHomePageNotice = (sParam, aParam) => {
   return knex(iWmposNotice)
         .insert({ title: sParam, content: aParam })
         .then((result) => {
            return result;
         }).catch((err) => console.log(err));
}

Management.modifyAppNotice = (xParam, sParam, aParam) => {
   return   knex(iWmNotice)
            .update({ title : sParam, answer : aParam })
            .where({ notice_id: xParam })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Management.changeSalesUserStatus = (xParam,sKey,aKey) => {
   return   knex("wmpos_admin_user")
            .update({ status : sKey, activated : aKey })
            .where({ admin_user_id: xParam })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Management.modifyHomeNotice = (xParam, sParam, aParam) => {
   return   knex(iWmposNotice)
            .update({ title : sParam, content : aParam })
            .where({ notice_id: xParam })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Management.bannerInsert = (sTitle, aParam, sType) => {
   return knex(iWebsiteBanner)
         .insert({ title: sTitle, url_path: aParam.url_path, site: "ceo", mime_type: null, type: sType, status: 1})
         .then((result) => {
            return result;
         }).catch((err) => console.log(err));
}

Management.bannerModify = (xParam, sParam, aParam, kParam) => {
   return   knex(iWebsiteBanner)
            .update({ title: sParam.sTitle, url_path: aParam.url_path, site: "ceo", mime_type: kParam, type: sParam.sType, status: sParam.iStatus})
            .where({ banner_id: xParam })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Management.bannerDel = (xParam,kParam) => {
   return   knex(iWebsiteBanner)
            .update({ status: kParam })
            .where({ banner_id: xParam })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Management.updateStoreInquiry = (xParam) => {
   return   knex(iWebsiteInquiry)
            .update({ state_id: 1})
            .where({ inquiry_id: xParam })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Management.notificationSales = () => {
   let sQuery = knex.raw(`
            COUNT(*) AS total
      FROM  wm_website_inquiry
      WHERE categories = "inquire"
      AND   state_id = 0
   `, []);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.notificationMarketing = () => {
   let sQuery = knex.raw(`
            COUNT(*) AS total
      FROM  wm_inquiry
      WHERE state_id = 0
   `, []);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Management.notificationMaster = () => {
   let sQuery = knex.raw(`
         app,
         web
   FROM 
         (
            SELECT 
                     COUNT(inquiry_id) AS app 
            FROM     wm_inquiry 
            WHERE    state_id = 0
         ) AS t1,
         (
            SELECT 
                     COUNT(inquiry_id) AS web 
            FROM     wm_website_inquiry 
            WHERE    state_id = 0 
            AND      categories = "inquire"
         ) AS t2
   `, []);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}


module.exports = Management;
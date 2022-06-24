// The Website model.
'use strict';

var config = require('../config'),
   knex = require('../services/database');
const { async } = require('validate.js');
const { v1: uuidv1 } = require('uuid');


const STableNmOrder_history = 'wm_order_history';
const STableNmsStore = 'wm_store';
const STableNmUser = 'wm_user';
const STableNmOrder_detail = 'wm_order_detail';
const STableNmProduct = 'wm_product';
const STableNmProduct_option = 'wm_product_option';
const STableNmMerchant = 'wm_merchant';
const STableNmOrder_discount = 'wm_order_discount';
const STableNmOrder_receipt = 'wm_order_receipt';
const STableNmOrder_detail_option = 'wm_order_detail_option';
const sTableName = 'wm_order';
const sOrder_payment = 'wm_order_payment';
const sOrder_payment_pg = 'wm_order_payment_pg';
const sOrder_payment_tpay = 'wm_order_payment_tpay';
const sOrder_payment_van = 'wm_order_payment_van';
const sUser_reg_card = 'wm_user_reg_card';
const sUser_points = 'wm_user_points';
const sPush_token = 'wm_push_token';
const sEventCouponUser = 'wm_event_coupon_user';
const iStoreInvoice = 'wm_store_invoice';


const {
   padString,
   getCurrentDatetime
} = require('../helpers/stringHelper');
const e = require('express');


var Order = {};

Order.insertStoreInvoice = (sIndex,iIndex) => {
   return   knex("wm_store_invoice")
            .insert({ store_id: sIndex, transaction_date: iIndex, invoice_type: 1, status: 1, created_at: iIndex, updated_at: iIndex })
            .then((result) => {
               console.log("result",result)
               return result;
            }).catch((err) => console.log("err",err));
}

Order.checkPosPushCancelSent = (iPushTokenId, iOrderId) => {
   return knex.select(
      't1.order_pos_noti', 't1.noti_order_cancel', 't1.noti_nearby_cancel', 't1.noti_arrive_cancel')
      .from('wm_order_noti_pos AS t1')
      .where({ push_token_id: parseInt(iPushTokenId), order_id: iOrderId })
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Order.getPushTokensByStoreIds = (aStoreIds) => {
   return knex.select(
      't1.token',
      't1.push_token_id',
      't1.unique_id'
   )
      .from('wm_push_token_pos AS t1')
      .whereIn('t1.store_id', aStoreIds)
      .where({ status: 1 })
      .timeout(config.queryTimeout).then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Order.getParentStoreIdByOrderId = (iOrderId) => {
   return knex.select('parent_store_id', 'store_id', 'noti_type')
      .from('wm_order')
      .where({ order_id: iOrderId })
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Order.updateOrder = (oOrderData, iOrderId, isCancel) => {
   let iStatus = 1;
   if (isCancel !== undefined && isCancel == true) {
      iStatus = 0;
   }

   return knex('wm_order')
      .update(oOrderData).update('updated_at', knex.fn.now()).update('status', iStatus)
      .where({ order_id: parseInt(iOrderId) })
      .then(function (result) {
         return result;
      }).catch((err) => console.log(err));
}

Order.selectOrderStateById = (iOrderId) => {
   return knex.select('t1.state_id', 't1.store_prepare_time AS order_time', 't1.user_id', 't2.parking_time', 't2.store_name', 't2.store_id', 't1.arrival_time', 't1.prepared_at')
      .from('wm_order AS t1')
      .leftJoin('wm_store AS t2', (builder) => {
         builder.on('t1.store_id', 't2.store_id');
      })
      .where({ order_id: parseInt(iOrderId) })
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Order.changeNotiTypeConfirm = (sOrder_id) => {
   return knex(sTableName)
      .update({ noti_type: 8 })
      .where({ order_id: sOrder_id })
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

Order.selectOrderByIdForNoti = (iOrderId) => {
   return knex.select('t1.user_id',
      't1.store_id',
      't1.license_number',
      't1.order_id',
      't2.store_name',
      't3.phone_number')
      .from('wm_order AS t1')
      .innerJoin('wm_store AS t2', (builder) => {
         builder.on('t1.store_id', 't2.store_id');
      })
      .innerJoin('wm_merchant AS t3', (builder) => {
         builder.on('t1.store_id', 't3.store_id');
      })
      .where({ order_id: parseInt(iOrderId) })
      //.where({ 't1.status': 1 })
      //.whereIn('t1.state_id', [11001, 11002, 11003, 11004, 14001, 14002, 14003])
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Order.changeNotiType = (iOrderId, iNotiType) => {
   return knex(sTableName)
      .update({ noti_type: iNotiType })
      .where({ order_id: iOrderId })
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

Order.deletePosTargetPushToken = (iUserId) => {
   return knex("wm_push_token_pos")
      .where({ push_token_id: iUserId })
      .del()
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

Order.setGiftCoupon = (sIndex,aIndex) => {
   return   knex("wm_event_coupon_x_store")
            .insert({ coupon_id: sIndex, store_id: aIndex })
            .then((result) => {
               console.log("result",result)
               return result;
            }).catch((err) => console.log("err",err));
}

Order.giftCouponForOrderCancel = (sIndex) => {
   return   knex("wm_event_coupon")
            .insert({ type_id: 0, store_id: 0, product_id: 0, duplicate_user: 0, event_id: 0, price: sIndex, partnership: 0, requirement: sIndex, count_limit: 1, name: "주문 자동취소 고객쿠폰", status: 1, hidden: 1, end_date: "2025-12-31" })
            .then((result) => {
               console.log("result",result)
               return result;
            }).catch((err) => console.log("err",err));
}

Order.chatMessageInsert = (sIndex,aIndex,qIndex,wIndex,rIndex,zIndex,gIndex) => {
   return   knex("wm_order_chat")
            .insert({ sender: sIndex, user_id: aIndex, store_id: qIndex, room_id: wIndex, store_read: 1, user_read: 1, os_version: rIndex, created_at: zIndex, message: gIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Order.setCancelOrderCoupon = (sIndex,aIndex,qIndex,wIndex,rIndex,zIndex,gIndex,hIndex) => {
   return   knex("wm_event_coupon_user")
            .insert({ user_id: sIndex, coupon_id: aIndex, price: qIndex, requirement: wIndex, name: rIndex, description: zIndex, status: 1, hidden: 1, start_date: gIndex, end_date: hIndex })
            .then((result) => {
               return result;
            }).catch((err) => console.log(`Order.setCancelOrderCoupon Err =======> order_id : ${zIndex}`,err));
}

Order.getUserPushToken = (sIndex) => {
   return  knex.select('token','push_token_id')
           .from("wm_push_token")
           .where({user_id : sIndex})
           .timeout(config.queryTimeout).then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Order.getPosPushToken = (sIndex) => {
   return  knex.select('token','unique_id','push_token_id')
           .from("wm_push_token_pos")
           .where({store_id : sIndex})
           .timeout(config.queryTimeout).then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Order.getChatMessage = (aIndex) => {
   return  knex.select('sender', 'message','store_read','user_read','created_at')
               .from("wm_order_chat")
               .where({ room_id : aIndex })
               .then((result) => {
                  return result;
               })
               .catch((err) => console.log(err));
}

Order.chatMessageInfo = (storeId,orderId,userId) => {
   let sQuery = knex.raw(`
                  t1.license_number, 
                  t2.email, 
                  t3.store_name 
      FROM        wm_order    AS t1
      INNER JOIN  wm_user     AS t2 ON t1.user_id = t2.user_id
      INNER JOIN  wm_store    AS t3 ON t3.store_id = t1.store_id 
      WHERE       t1.order_id = ?
      AND         t1.user_id = ?
      AND         t1.store_id = ?
   `, [orderId,userId,storeId]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.checkUpCancelOrder = (sParam) => {
   let sQuery = knex.raw(`
                  t1.order_id, 
                  t1.state_id, 
                  t1.payment_id, 
                  t1.cancelled_at, 
                  t1.total_amount_excl, 
                  t1.phone_number,
                  t1.user_id, 
                  t1.store_id,
                  t2.marketing_agreed_at,
                  t2.marketing_agreed,
                  t3.store_name
      FROM        wm_order                      AS t1
      INNER JOIN  wm_user                       AS t2 ON t1.user_id = t2.user_id 
      INNER JOIN  wm_store                      AS t3 ON t1.store_id = t3.store_id
      WHERE       t1.cancelled_at IS NOT NULL
      AND         t1.payment_id IS NOT NULL
      AND         t1.payment_id != 0
      AND         t1.state_id = "18001"
      AND         DATE(t1.created_at) = DATE(?)
   `, [sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getOrderDetailByOrderId = (sParam) => {
   let sQuery = knex.raw(`
                  t1.order_id, 
                  t1.total_amount_excl, 
                  t1.user_id, 
                  t1.store_id,
                  t2.store_name
      FROM        wm_order       AS t1
      INNER JOIN  wm_store       AS t2 ON t1.store_id = t2.store_id          
      WHERE       t1.order_id = ?
   `, [sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.updateUserChatMessage = async (roomId) => {
   return   knex('wm_order_chat')
            .update({ user_read: 1 })
            .where({ room_id: roomId })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Order.updateStoreChatMessage = async (roomId) => {
   return   knex('wm_order_chat')
            .update({ store_read: 1 })
            .where({ room_id: roomId })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Order.editStoreOrderTime = async (storeId,sParam,aParam) => {
   return   knex(STableNmsStore)
            .update({ order_time: 0, pause: sParam, order_time: aParam })
            .where({ store_id: storeId })
            .then((result) => {
               console.log("result",result);
               return result;
            }).catch((err) => console.log(err));
}

Order.exChangeStoreStatus = async (storeId) => {
   return   knex(STableNmsStore)
            .update({ order_time: 0, pause: 0 })
            .where({ store_id: storeId })
            .then((result) => {
               console.log("result",result);
               return result;
            }).catch((err) => console.log(err));
}

Order.getOrderDetail = (aIndex) => {
   let sQuery = knex.raw(`
                     t1.state_id,
                     t1.created_at,
                     t1.discount_amount, 
                     t1.total_amount_org, 
                     t1.total_amount_excl, 
                     t1.license_number, 
                     t1.phone_number, 
                     t2.quantity,
                     t2.has_option,
                     t2.order_detail_id,
                     t4.name, 
                     t4.base_price, 
                     t4.org_price
      FROM           wm_order          AS t1
      INNER JOIN     wm_order_detail   AS t2 ON t1.order_id = t2.order_id
      INNER JOIN     wm_product        AS t4 ON t4.product_id = t2.product_id
      WHERE          t1.order_id = ?
   `, [aIndex]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getStoreOrderListByDate = (aIndex,sIndex,nIndex) => {
   let sQuery = knex.raw(`
                  order_id
      FROM        wm_order 
      WHERE       store_id = ?
      AND         DATE(created_at) BETWEEN DATE(?) AND DATE(?)
      ORDER BY    created_at DESC
   `, [aIndex,sIndex,nIndex]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.prepareOrder = (aIndex) => {
   let sQuery = knex.raw(`
                  store_prepare_time, 
                  confirmed_at, 
                  prepared_at
      FROM        wm_order 
      WHERE       store_id = ?
      AND         prepared_at IS NOT NULL
      ORDER BY    created_at DESC
      LIMIT       5
   `, [aIndex]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.acceptOrder = (aIndex) => {
   let sQuery = knex.raw(`
                  COUNT (DISTINCT t1.order_id) AS total, 
                  COUNT (DISTINCT t2.order_id) AS xdata
      FROM        wm_order    AS t1
      LEFT JOIN   wm_order    AS t2 ON t1.store_id = t2.store_id AND t2.confirmed_at IS NOT NULL
      WHERE       t1.store_id = ?
   `, [aIndex]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getOrderProductOption = (aIndex) => {
   return  knex.select('name', 'price')
               .from("wm_order_detail_option")
               .where({ order_detail_id: aIndex })
               .then((result) => {
                  return result;
               })
               .catch((err) => console.log(err));
}

Order.getStoreOriginLocation = (aIndex) => {
   return  knex.select('lat', 'lng','store_name')
               .from(STableNmsStore)
               .where({ store_id: aIndex })
               .timeout(config.queryTimeout).first().then((result) => {
                  return result;
               })
               .catch((err) => console.log(err));
}

Order.acceptOrderTime = (aIndex) => {
   return  knex.select('confirmed_at', 'created_at')
               .from("wm_order")
               .where({ store_id: aIndex })
               .whereNot({ confirmed_at: null })
               .then((result) => {
                  return result;
               })
               .catch((err) => console.log(err));
}

Order.prepareOrderHour = (aIndex) => {
   return  knex.select('confirmed_at', 'prepared_at')
               .from("wm_order")
               .where({ store_id: aIndex })
               .whereNot({ prepared_at: null })
               .then((result) => {
                  return result;
               })
               .catch((err) => console.log(err));
}

Order.getUserLocation = (sIndex) => {
   let sQuery = knex.raw(`
                  lat,
                  lng
      FROM        wm_order_location 
      WHERE       order_id = ?
      AND         type = "watchpos"
      ORDER BY    created_at DESC
      LIMIT       1
   `, [sIndex]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.paymentDataByStoreInvoice = (fromMonth,toMonth,storeId) => {
   let sQuery = knex.raw(`
                  transaction_date
      FROM        wm_store_invoice 
      WHERE       store_id = ?
      AND         DATE(transaction_date) BETWEEN DATE(?) AND DATE(?)
      AND         status = 1
      AND         invoice_type = 1
      ORDER BY    transaction_date DESC
   `, [storeId,fromMonth,toMonth]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.calculatePercent = (sParam,aParam) => {
   let sQuery = knex.raw(`
            CONCAT(ROUND((amount/total * 100),'%')) AS percentage 
      FROM 
            (
               SELECT 
                        COUNT(*) AS amount 
               FROM     wm_order 
               WHERE    store_id = ? 
               AND      payment_id != 0 
               AND      cancelled_at IS NULL
            ) t1,
            (
               SELECT 
                        COUNT(*) AS total 
               FROM     wm_order
               WHERE    store_id = ?
            ) t2
   `, [sParam,aParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.dashboardChartData = (sParam,sFrom,sTo) => {
   let sQuery = knex.raw(`
                  payment_id, 
                  cancelled_at, 
                  created_at, 
                  total_amount_org, 
                  state_id 
      FROM        wm_order 
      WHERE       store_id = ?
      AND         DATE(created_at) BETWEEN DATE(?) AND DATE(?)
      AND         cancelled_at IS NULL
      AND         payment_id != 0
   `, [sParam,sFrom,sTo]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.paymentColumnChartData = (sParam,sFrom,sTo) => {
   let sQuery = knex.raw(`
                  COUNT(order_id) AS sNm
      FROM        wm_order 
      WHERE       store_id = ?
      AND         DATE(created_at) BETWEEN DATE(?) AND DATE(?)
      AND         cancelled_at IS NULL
      AND         payment_id != 0
   `, [sParam,sFrom,sTo]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getPartnerCouponByStoreId = (sFrom,sTo,sParam) => {
   let sQuery = knex.raw(`
                  SUM(t1.amount) AS sAmount
      FROM        wm_order_discount AS t1
      inner join  wm_order AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         DATE(t2.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.CODE = "PARTNER_COUPON"
      AND         t2.store_id = ?
   `, [sFrom,sTo,sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getPartnerCouponPercentByStoreId = (sFrom,sTo,sParam) => {
   let sQuery = knex.raw(`
                  SUM(t1.amount) AS sAmount
      FROM        wm_order_discount AS t1
      inner join  wm_order AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         DATE(t2.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.CODE = "PARTNER_COUPON_PERCENT"
      AND         t2.store_id = ?
   `, [sFrom,sTo,sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getPartnerCouponPercentByOrderId = (sFrom,sTo,aParam,sParam) => {
   let sQuery = knex.raw(`
                  SUM(t1.amount) AS sAmount
      FROM        wm_order_discount AS t1
      inner join  wm_order AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         DATE(t2.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.CODE = "PARTNER_COUPON_PERCENT"
      AND         t1.order_id = ?
      AND         t2.store_id = ?
   `, [sFrom,sTo,aParam,sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getPartnerCouponByOrderId = (sFrom,sTo,aParam,sParam) => {
   let sQuery = knex.raw(`
               SUM(t1.amount) AS sAmount
   FROM        wm_order_discount AS t1
   inner join  wm_order AS t2 on t1.order_id = t2.order_id 
   WHERE       t2.payment_id != 0
   AND         t2.cancelled_at IS NULL
   AND         DATE(t2.created_at) BETWEEN DATE(?) AND DATE(?)
   AND         t1.CODE = "PARTNER_COUPON"
   AND         t1.order_id = ?
   AND         t2.store_id = ?
   `, [sFrom,sTo,aParam,sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getPartnerStampCouponByStoreId = (sFrom,sTo,sParam) => {
   let sQuery = knex.raw(`
                  SUM(t1.amount) AS sAmount
      FROM        wm_order_discount AS t1
      inner join  wm_order AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         DATE(t2.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.CODE = "PARTNER_STAMP_COUPON"
      AND         t2.store_id = ?
   `, [sFrom,sTo,sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getPartnerStampCouponByOrderId = (sFrom,sTo,aParam,sParam) => {
   let sQuery = knex.raw(`
                  SUM(t1.amount) AS sAmount
      FROM        wm_order_discount AS t1
      inner join  wm_order AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         DATE(t2.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.CODE = "PARTNER_STAMP_COUPON"
      AND         t1.order_id = ?
      AND         t2.store_id = ?
   `, [sFrom,sTo,aParam,sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getPointByStoreId = (sFrom,sTo,sParam) => {
   let sQuery = knex.raw(`
                  SUM(t1.amount) AS sAmount
      FROM        wm_order_discount AS t1
      inner join  wm_order AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         DATE(t2.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.CODE = "ORDER_POINTS"
      AND         t2.store_id = ?
   `, [sFrom,sTo,sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getPointByOrderId = (sParam) => {
   let sQuery = knex.raw(`
                  t1.amount AS sAmount
      FROM        wm_order_discount AS t1
      inner join  wm_order          AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         t1.CODE = "ORDER_POINTS"
      AND         t1.order_id = ?      
   `, [sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getCouponByStoreId = (sFrom,sTo,sParam) => {
   let sQuery = knex.raw(`
                  SUM(t1.amount) AS sAmount
      FROM        wm_order_discount AS t1
      inner join  wm_order AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         DATE(t2.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.CODE != "ORDER_POINTS"
      AND         t1.CODE != "PARTNER_COUPON"
      AND         t2.store_id = ?
   `, [sFrom,sTo,sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getCouponByStoreIdV2 = (sFrom,sTo,sParam) => {
   let sQuery = knex.raw(`
                  SUM(t1.amount) AS sAmount
      FROM        wm_order_discount AS t1
      inner join  wm_order AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         DATE(t2.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.CODE = "COUPON"
      AND         t1.CODE = "COUPON_CODE"
      AND         t2.store_id = ?
   `, [sFrom,sTo,sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getCouponNormalByStoreId = (sFrom,sTo,sParam) => {
   let sQuery = knex.raw(`
                  SUM(t1.amount) AS sAmount
      FROM        wm_order_discount AS t1
      inner join  wm_order AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         DATE(t2.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.CODE = "COUPON"
      AND         t2.store_id = ?
   `, [sFrom,sTo,sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getCouponNormalByOrderId = (sParam) => {
   let sQuery = knex.raw(`
                  t1.amount AS sAmount
      FROM        wm_order_discount AS t1
      inner join  wm_order AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         t1.CODE = "COUPON"
      AND         t2.order_id = ?
   `, [sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getCouponCodeByStoreId = (sFrom,sTo,sParam) => {
   let sQuery = knex.raw(`
                  SUM(t1.amount) AS sAmount
      FROM        wm_order_discount AS t1
      inner join  wm_order AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         DATE(t2.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.CODE = "COUPON_CODE"
      AND         t2.store_id = ?
   `, [sFrom,sTo,sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getCouponByOrderId = (sParam) => {
   let sQuery = knex.raw(`
                  t1.amount         AS sAmount
      FROM        wm_order_discount AS t1
      inner join  wm_order          AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         t1.CODE = "COUPON"
      AND         t1.order_id = ?          
   `, [sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getCouponCodeByOrderId = (sParam) => {
   let sQuery = knex.raw(`
                  t1.amount         AS sAmount
      FROM        wm_order_discount AS t1
      inner join  wm_order          AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         t1.CODE = "COUPON_CODE"
      AND         t1.order_id = ?          
   `, [sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getOrderPointByOrderId = (sParam) => {
   let sQuery = knex.raw(`
                  t1.amount         AS sAmount
      FROM        wm_order_discount AS t1
      inner join  wm_order          AS t2 on t1.order_id = t2.order_id 
      WHERE       t2.payment_id != 0
      AND         t2.cancelled_at IS NULL
      AND         t1.CODE = "ORDER_POINTS"
      AND         t1.order_id = ?          
   `, [sParam]);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getStoreInvoiceEmail = (sFrom,sParam) => {
   let sQuery = knex.raw(`
            store_invoice 
      FROM  wm_store_invoice 
      WHERE DATE(transaction_date) = DATE(?)
      AND   store_id = ?
      AND   invoice_type = 0;
   `, [sFrom,sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getStoreInvoice = (sFrom,sParam) => {
   let sQuery = knex.raw(`
            store_invoice 
      FROM  wm_store_invoice 
      WHERE DATE(transaction_date) = DATE(?)
      AND   store_id = ?
      AND   invoice_type = 1;
   `, [sFrom,sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getStoreInvoiceMail = (sFrom,sTo,sParam) => {
   let sQuery = knex.raw(`
            store_invoice 
      FROM  wm_store_invoice 
      WHERE DATE(transaction_date) BETWEEN DATE(?) AND DATE(?)
      AND   store_id = ?
      AND   invoice_type = 0;
   `, [sFrom,sTo,sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.dashboardMerchantData = (sFrom,sTo,sParam) => {
   let sQuery = knex.raw(`
                  (SELECT SUM(amount) FROM wm_order_discount WHERE order_id = t1.order_id AND CODE = 'PARTNER_COUPON' ) AS coupon_partner_amount,
                  (t1.total_amount_incl) AS payment,
                  (t1.total_amount_org) AS totalAmount
      FROM        wm_order AS t1
      LEFT JOIN   wm_store AS t2 ON t1.store_id = t2.store_id
      INNER JOIN  wm_order_state AS t4 ON t4.order_state_id = t1.state_id
      LEFT JOIN   wm_merchant AS t5 ON t5.store_id = t1.store_id
      WHERE       t1.payment_id != 0
      AND         t1.cancelled_at IS NULL
      AND         DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.store_id = ?;       
   `, [sFrom,sTo,sParam]
   );
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getSettlementGroupByStoreID = (sFrom,sTo) => {
   let sQuery = knex.raw(`
                     t2.store_id,
                     t2.store_name,
                     t5.full_name,
                     t5.phone_number,
                     t5.address1,
                     t5.business_number,
                     t5.bank_name,
                     t5.account_nm,
                     t5.account_holder,
                     t5.email,
                     t1.created_at
         FROM        wm_order AS t1
         LEFT JOIN   wm_store AS t2 ON t1.store_id = t2.store_id
         INNER JOIN  wm_order_state AS t4 ON t4.order_state_id = t1.state_id
         LEFT JOIN   wm_merchant AS t5 ON t5.store_id = t1.store_id
         WHERE       t1.payment_id != 0
         AND         t1.cancelled_at IS NULL
         AND         t1.store_id != 1
         AND         t1.store_id != 707
         AND         DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
         GROUP BY    t1.store_id
         ORDER BY    t2.store_name, t1.created_at DESC;
      `, [sFrom,sTo]
   );
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getMonthlySettlement = (sFrom,sTo) => {
   let sQuery = knex.raw(`
                  t2.store_id,
                  t2.store_name,
                  t5.full_name,
                  t5.phone_number,
                  t5.address1,
                  t5.business_number,
                  t5.bank_name,
                  t5.account_nm,
                  t5.account_holder,
                  t5.email,
                  SUM(t1.total_amount_incl) AS payment,
                  SUM(t1.discount_amount) AS discount,
                  SUM(t1.total_amount_org) AS totalAmount,
                  t1.created_at           
      FROM        wm_order AS t1
      LEFT JOIN   wm_store AS t2 ON t1.store_id = t2.store_id
      INNER JOIN  wm_order_state AS t4 ON t4.order_state_id = t1.state_id
      LEFT JOIN   wm_merchant AS t5 ON t5.store_id = t1.store_id
      WHERE       t1.payment_id != 0
      AND         t1.cancelled_at IS NULL
      AND         DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
      GROUP BY    t1.store_id
      ORDER BY    t2.store_name, t1.created_at DESC;        
   `, [sFrom,sTo]
   );
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getSettlementStoreID = (sFrom,sTo,iStoreId) => {
   let sQuery = knex.raw(`
                  t1.order_id,
                  t1.total_amount_incl AS payment,
                  t1.discount_amount   AS discount,
                  t1.total_amount_org  AS totalAmount          
      FROM        wm_order             AS t1
      WHERE       t1.payment_id != 0
      AND         t1.cancelled_at IS NULL
      AND         DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.store_id = ?
   `, [sFrom,sTo,iStoreId]
   );
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.settlementToEmailSender = (sFrom,sTo) => {
   let sQuery = knex.raw(`
                  t2.store_name, 
                  t2.store_id,
                  t5.email
      FROM        wm_order AS t1
      LEFT JOIN   wm_store AS t2 ON t1.store_id = t2.store_id
      INNER JOIN  wm_order_state AS t4 ON t4.order_state_id = t1.state_id
      LEFT JOIN   wm_merchant AS t5 ON t5.store_id = t1.store_id
      WHERE       t1.payment_id != 0
      AND         t1.cancelled_at IS NULL
      AND         DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
      GROUP BY    t1.store_id
      ORDER BY    t2.store_name, t1.created_at DESC;
   `, [sFrom,sTo]
   );
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getSettlementSenderData = (sFrom) => {
   let sQuery = knex.raw(`
                  store_id
      FROM        wm_store_invoice 
      WHERE       invoice_type = 0
      AND         status = 1
      AND         DATE(created_at) = DATE(?)
   `, [sFrom]
   );
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getMonthlySettlementByStoreId = (sFrom,sTo,sParam) => {
   let sQuery = knex.raw(`
                  t2.store_id,
                  t2.store_name,
                  t1.total_amount_incl,
                  t1.discount_amount,
                  t1.total_amount_org,
                  t1.created_at,
                  (SELECT amount FROM wm_order_discount WHERE order_id = t1.order_id AND CODE = 'COUPON' ) AS coupon_amount,
                  (SELECT amount FROM wm_order_discount WHERE order_id = t1.order_id AND CODE = 'ORDER_POINTS' ) AS points_amount,
                  (SELECT amount FROM wm_order_discount WHERE order_id = t1.order_id AND CODE = 'PARTNER_COUPON' ) AS coupon_partner_amount
      FROM        wm_order AS t1
      LEFT JOIN   wm_store AS t2 ON t1.store_id = t2.store_id
      WHERE       t1.payment_id != 0
      AND         t1.cancelled_at IS NULL
      AND         DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.store_id = ?
      ORDER BY    t2.store_name, t1.created_at DESC; 
   `, [sFrom,sTo,sParam]
   );
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getMonthlySettlementByStoreIdV2 = (sFrom,sTo,sParam) => {
   let sQuery = knex.raw(`
                  t1.order_id,
                  t2.store_id,
                  t2.store_name,
                  t1.total_amount_incl,
                  t1.discount_amount,
                  t1.total_amount_org,
                  t1.created_at
      FROM        wm_order AS t1
      LEFT JOIN   wm_store AS t2 ON t1.store_id = t2.store_id
      WHERE       t1.payment_id != 0
      AND         t1.cancelled_at IS NULL
      AND         DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.store_id = ?
      ORDER BY    t2.store_name, t1.created_at DESC; 
   `, [sFrom,sTo,sParam]
   );
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.orderListLimit = (sParam) => {
   let sQuery = knex.raw(`
                  t1.total_amount_org, 
                  t1.cancelled_at, 
                  t2.store_name 
      FROM        wm_order          AS t1
      INNER JOIN  wm_store          AS t2 ON t1.store_id = t2.store_id
      INNER JOIN  wm_merchant       AS t3 ON t1.store_id = t3.store_id
      WHERE       t1.payment_id != 0  
      AND         t3.phone_number != "01039438070"
      AND         t2.store_name != "스루"
      AND         t2.store_name != "스루 컨벤션"
      AND         t2.store_name != "스루 강남역점"
      ORDER BY    t1.order_id DESC 
      LIMIT       ?
   `, [sParam]);
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.checkReturnPay = (storeId,fromDate,toDate) => {
   let sQuery = knex.raw(`
                  transaction_date
      FROM        ${iStoreInvoice} 
      WHERE       store_id = ? 
      AND         DATE(transaction_date) BETWEEN DATE(?) AND DATE(?)
      AND         status = 1
      `, [storeId,fromDate,toDate]
   );
   let oQuery = knex.select(sQuery);

   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.adjustmentDiscount = (orderId) => {
   let sQuery = knex.raw(`
                  amount, 
                  code
      FROM        ${STableNmOrder_discount} 
      WHERE       order_id = ? 
      ORDER BY    created_at ASC;
      `, [orderId]
   );
   let oQuery = knex.select(sQuery);

   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.adjustmentPayment = (storeId,fromDate,toDate) => {
   let sQuery = knex.raw(`
                  order_id,
                  license_number, 
                  created_at, 
                  total_amount_org, 
                  total_amount_excl
      FROM        ${sTableName} 
      WHERE       store_id = ? 
      AND         cancelled_at IS NULL 
      AND         payment_id != 0
      AND         DATE(created_at) BETWEEN DATE(?) AND DATE(?)
      ORDER BY    created_at ASC;
      `, [storeId,fromDate,toDate]
   );
   let oQuery = knex.select(sQuery);

   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.itemDetailListOptions = (iOrder_detail_id) => {
   let sQuery = knex.raw(`
                  distinct (t2.product_option_id),
                  t1.quantity, 
                  t3.name,
                  t3.price 
      FROM        ${STableNmOrder_detail} AS t1 
      LEFT JOIN   ${STableNmOrder_detail_option} AS t2 ON t2.order_detail_id = t1.order_detail_id
      INNER JOIN  ${STableNmProduct_option} AS t3 ON t3.option_id = t2.product_option_id
      INNER JOIN  ${STableNmProduct} AS t4 ON t4.product_id = t3.product_id                                                      
      WHERE       t1.order_detail_id = ?            
      `, [iOrder_detail_id]
   );
   let oQuery = knex.select(sQuery);

   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.itemDetailList = (iOrder_id) => {
   let sQuery = knex.raw(`
                  distinct (t4.name) as itemNm, 
                  t1.amount_tax_excl,
                  t1.amount_tax_incl,
                  t1.quantity,
                  t4.product_id AS options,
                  t1.product_id,
                  t1.order_prd_key,
                  t1.order_detail_id,
                  t4.base_price AS prd_price         
      FROM        ${STableNmOrder_detail} AS t1 
      LEFT JOIN   ${STableNmOrder_detail_option} AS t2 ON t2.order_detail_id = t1.order_detail_id
      LEFT JOIN   ${STableNmProduct_option} AS t3 ON t3.option_id = t2.product_option_id
      INNER JOIN  ${STableNmProduct} AS t4 ON t4.product_id = t1.product_id                                                      
      WHERE       order_id = ?            
      `, [iOrder_id]
   );
   let oQuery = knex.select(sQuery);

   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.itemDetailListByPGNormal = (iOrder_id, bIsCancelled) => {

   let sQueryCancel = ' AND t5.cancel_date IS NULL';
   if (bIsCancelled != undefined && bIsCancelled == 'true') {
      sQueryCancel = ' AND t5.cancel_date IS NOT NULL';
   }

   let sQuery = knex.raw(`
                  t1.total_amount_incl AS totalAmount,
                  t2.store_name AS storeNm,
                  t2.address1 AS storeAddress,
                  t2.phone_number AS storePhone,
                  t3.ccard_company as cardCompany,
                  t3.created_at as createDate,
                  t3.updated_at as updateDate,
                  t4.full_name AS storeOwner,
                  t5.auth_code AS app_no, 
                  t5.merchant_no,
                  t5.fn_name,
                  t5.acqu_co,
                  t5.acqu_nm,
                  t5.card_interest,
                  t5.ccard_no,
                  t5.auth_date,
                  t5.cancel_date,
                  t6.ccard_id,
                  t7.points
      FROM 		   ${sTableName} AS t1
      INNER JOIN  ${STableNmsStore} AS t2 ON t2.store_id = t1.store_id
      INNER JOIN  ${sOrder_payment} AS t3 ON t3.payment_id = t1.payment_id
      INNER JOIN  ${STableNmMerchant} AS t4 on t4.store_id = t2.store_id
      LEFT JOIN   ${sOrder_payment_tpay} AS t5 on t5.payment_id = t1.payment_id ${sQueryCancel} 
      LEFT JOIN   ${sUser_reg_card} AS t6 on t6.user_id = t1.user_id AND t6.is_default = 1
      LEFT JOIN   ${sUser_points} AS t7 on t7.order_id = t1.order_id AND t7.type = 'ORDER'
      WHERE       t1.order_id = ?
      `, [iOrder_id]
   );
   let oQuery = knex.select(sQuery);

   return oQuery.then((result) => {
      return result;

   }).catch((err) => console.log(err));

}

Order.itemDetailListByPG = (iOrder_id, bIsCancelled) => {

   let sQueryCancel = ' AND t5.cancel_date IS NULL';
   if (bIsCancelled != undefined && bIsCancelled == 'true') {
      sQueryCancel = ' AND t5.cancel_date IS NOT NULL';
   }

   let sQuery = knex.raw(`
                  t1.total_amount_incl AS totalAmount,
                  t2.store_name AS storeNm,
                  t2.address1 AS storeAddress,
                  t2.phone_number AS storePhone,
                  t3.ccard_company as cardCompany,
                  t3.created_at as createDate,
                  t3.updated_at as updateDate,
                  t4.full_name AS storeOwner,
                  t5.app_no, 
                  t5.merchant_no,
                  t5.fn_name,
                  t5.acqu_co,
                  t5.acqu_nm,
                  t5.ccard_no,
                  t5.app_dt,
                  t5.cancel_date,
                  t6.ccard_id,
                  t7.points
      FROM 		   ${sTableName} AS t1
      INNER JOIN  ${STableNmsStore} AS t2 ON t2.store_id = t1.store_id
      INNER JOIN  ${sOrder_payment} AS t3 ON t3.payment_id = t1.payment_id
      INNER JOIN  ${STableNmMerchant} AS t4 on t4.store_id = t2.store_id
      LEFT JOIN   ${sOrder_payment_pg} AS t5 on t5.payment_id = t1.payment_id ${sQueryCancel} 
      LEFT JOIN   ${sUser_reg_card} AS t6 on t6.user_id = t1.user_id AND t6.is_default = 1
      LEFT JOIN   ${sUser_points} AS t7 on t7.order_id = t1.order_id AND t7.type = 'ORDER'
      WHERE       t1.order_id = ?
      `, [iOrder_id]
   );
   let oQuery = knex.select(sQuery);

   return oQuery.then((result) => {
      return result;

   }).catch((err) => console.log(err));

}

Order.getAllOrderList = (iOrder_id, fromDate, toDate) => {
   let sQuery = knex.raw(`
                  t1.order_id AS orderId,
                  t2.payment_state_id AS statement,
                  t1.total_amount_org AS amount,
                  t2.created_at AS createDate,
                  t2.updated_at AS updateDate,
                  t1.total_amount_incl,
                  t1.discount_amount, 
                  t1.total_amount_incl,
                  t1.discount_amount, 
                  t1.status, 
                  t3.phone_number,
                  t2.payment_method,
                  t1.cancelled_at, 
                  CASE 
                        WHEN  t1.license_number != ''
                        THEN  t1.license_number 
                        ELSE  'WALKIN'
                  END   AS carNm                                
      FROM        wm_order          AS t1 
      LEFT JOIN   wm_order_payment  AS t2 ON t1.order_id = t2.order_id
      LEFT JOIN   wm_user           AS t3 ON t3.user_id = t1.user_id 
      WHERE       t1.store_id = ?
      AND         DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.payment_id != 0
      ORDER BY    t1.order_id DESC
   `, [iOrder_id,fromDate,toDate]);

   let oQuery = knex.select(sQuery);

   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getCancelOrderList = (iOrder_id, fromDate, toDate) => {
   let sQuery = knex.raw(`
                  t1.order_id AS orderId,
                  t2.payment_state_id AS statement,
                  t1.total_amount_org AS amount,
                  t2.created_at AS createDate,
                  t2.updated_at AS updateDate,
                  t1.status,
                  t2.payment_method, 
                  t1.cancelled_at,
                  t3.phone_number,
                  CASE 
                        WHEN  t1.license_number != ''
                        THEN  t1.license_number 
                        ELSE  'WALKIN'
                  END   AS carNm                                
      FROM        wm_order          AS t1 
      LEFT JOIN   wm_order_payment  AS t2 ON t1.order_id = t2.order_id
      LEFT JOIN   wm_user           AS t3 ON t3.user_id = t1.user_id 
      WHERE       t1.store_id = ?
      AND         DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.cancelled_at IS NOT NULL
      AND         t1.payment_id != 0
      ORDER BY    t1.order_id DESC
   `, [iOrder_id,fromDate,toDate]);

   let oQuery = knex.select(sQuery);

   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getOrderList = (iOrder_id, fromDate, toDate) => {
   let sQuery = knex.raw(`
                  t1.order_id AS orderId,
                  t2.payment_state_id AS statement,
                  t1.total_amount_org AS amount,
                  t2.created_at AS createDate,
                  t2.updated_at AS updateDate,
                  t1.total_amount_incl,
                  t1.discount_amount, 
                  t1.status, 
                  t2.payment_method,
                  t1.cancelled_at,
                  t3.phone_number, 
                  CASE 
                        WHEN  t1.license_number != ''
                        THEN  t1.license_number 
                        ELSE  'WALKIN'
                  END   AS carNm                                
      FROM        wm_order          AS t1 
      LEFT JOIN   wm_order_payment  AS t2 ON t1.order_id = t2.order_id
      LEFT JOIN   wm_user           AS t3 ON t3.user_id = t1.user_id 
      WHERE       t1.store_id = ?
      AND         DATE(t1.created_at) BETWEEN DATE(?) AND DATE(?)
      AND         t1.cancelled_at IS NULL
      AND         t1.payment_id != 0
      ORDER BY    t1.order_id DESC
   `, [iOrder_id,fromDate,toDate]);

   let oQuery = knex.select(sQuery);

   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getProductName = (iOrder_id) => {
   let sQuery = knex.raw(`
            t2.name
      FROM  wm_order_detail AS t1
      INNER JOIN wm_product AS t2 ON t1.product_id = t2.product_id 
      WHERE order_id = ?
   `, [iOrder_id]);

   let oQuery = knex.select(sQuery);

   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

Order.getOrderListPos = (iStoreId, aStoreId) => {
   // row_number() OVER (ORDER BY sequence, t2.order_detail_id ASC) as row_num,
   let OrderPickup = config.order['ORDER_PICKUP_COMPLETE'];
   let OrderPrepare = [
      config.order['ORDER_PREPARING'],
      config.order['ORDER_PREPARING_COMPLETE']
   ];
   let OrderConfirm = [
      config.order['ORDER_CONFIRMED_APP'],
      config.order['ORDER_CONFIRMED_OFFLINE'],
      config.order['ORDER_CONFIRMED_WALKIN'],
      config.order['ORDER_CONFIRMED_DELIVERY']
   ].join(',');
   let OrderPaymentConfirm = [
      config.order['PAYMENT_CONFIRMED_CARD'],
      config.order['PAYMENT_CONFIRMED_CASH']
   ].join(',');
   let OrderCancel = [
      config.order['ORDER_CANCELLED'],
      config.order['ORDER_CANCELLED_STORE'],
      config.order['ORDER_CANCELLED_AUTO']
   ].join(',');

   let aAllStoreId = [];
   aAllStoreId.push(iStoreId);

   if (aStoreId != undefined && aStoreId.length > 0) {
      //aAllStoreId = aAllStoreId.concat(aStoreId);
      for (let oStr of aStoreId) {
         aAllStoreId.push(oStr['store_id']);
      }
   }

   // t2.order_detail_id, 
   // t2.product_id, 
   // t2.amount_tax_incl AS item_amount_tax_incl, 
   // t2.amount_tax_excl AS item_amount_tax_excl, 
   // t2.quantity AS item_quantity, 
   // t2.order_prd_key AS order_prd_key, 
   // t2.request_message AS request_message, 
   // t3.price AS option_price,
   // t3.name AS option_name,
   // t3.name2 AS option_name2,
   // t3.product_option_id AS product_option_id,
   // t4.name AS prd_name,
   // t4.name2 AS prd_name2,
   // t4.base_price AS prd_price,

   let sQuery = knex.raw(`
         DENSE_RANK() OVER (ORDER BY t1.order_id) row_num,
         LPAD(RIGHT(t1.order_id, 3), 3, '0') AS order_sequence,
         t1.uuid, t1.state_id, t1.dist_remaining, t1.license_number, t1.type_id, 
         t1.quantity AS order_total_quantity, 
         t1.discount_amount AS order_discount_amount, 
         t1.total_amount_org AS order_total_amount_org, 
         t1.total_amount_incl AS order_total_amount_incl, 
         t1.total_amount_excl AS order_total_amount_excl, 
         t1.order_id,
         t1.order_nr,
         t1.lat,
         t1.lng,
         t1.user_id,
         t1.inquiry,
         t1.store_prepare_time,
         t1.arrival_time,
         t1.created_at,
         t1.updated_at,
         t1.confirmed_at,
         t1.prepared_at,
         t1.picked_up_at,
         t1.pickup_type,
         t1.cancelled_at,
         t1.noti_type,
         t6.payment_state_id,
         coalesce(t5.full_name, '') AS user_full_name,
         t5.phone_number,
         (CASE 
            WHEN t1.state_id = ${OrderPickup} THEN CONCAT('A', LPAD(coalesce(t1.dist_remaining, '0'), 6, '0') )
            WHEN t1.state_id IN(${OrderPrepare}) THEN CONCAT('B', LPAD(coalesce(t1.dist_remaining, '0'), 6, '0') )
            WHEN t1.state_id IN(${OrderConfirm}) THEN CONCAT('C', LPAD(coalesce(t1.dist_remaining, '0'), 6, '0') )
            WHEN t1.state_id IN(${OrderPaymentConfirm}) THEN CONCAT('D', LPAD(coalesce(t1.dist_remaining, '0'), 6, '0') )
            WHEN t1.state_id IN(${OrderCancel}) THEN CONCAT('E', LPAD(coalesce(t1.dist_remaining, '0'), 6, '0') )
            ELSE CONCAT('Z', LPAD(coalesce(999, '0'), 6, '0') )
         END) AS sequence,
         t7.ccard_id,
         t8.name AS type_name,
         t8.name2 AS type_name2,
         t8.code AS type_code,
         t9.parking_arrival AS noti_parking_arrival,
         t9.parking_prepare AS noti_parking_prepare,
         t9.auto_order_cancel AS noti_auto_order_cancel,
         t9.pos_order_cancel AS noti_pos_order_cancel,
         t9.order_confirm AS noti_order_confirm,
         t9.order_prepared_aft AS noti_order_prepared_aft,
         t9.order_prepared_bef AS noti_order_prepared_bef,
         t9.concluded AS noti_concluded,
         t1.store_id,
         t10.store_name,
         t10.lat,
         t10.lng
   
         FROM wm_order AS t1
         INNER JOIN wm_user AS t5
            ON t5.user_id = t1.user_id
         INNER JOIN wm_order_payment AS t6 
            ON t6.payment_id = t1.payment_id
         LEFT JOIN wm_user_reg_card AS t7 
            ON t7.ccard_id = (SELECT ccard_id FROM wm_user_reg_card WHERE user_id = t1.user_id AND is_default = 1 LIMIT 1)
         LEFT JOIN wm_order_type AS t8 
            ON t8.order_type_id = t1.type_id
         INNER JOIN wm_order_noti AS t9 
            ON t9.order_id = t1.order_id
         INNER JOIN wm_store AS t10 
            ON t10.store_id = t1.store_id
         WHERE t1.store_id IN (?)
         AND ( 
               ( t1.state_id IN (${OrderPaymentConfirm}, ${OrderConfirm}, ${OrderPrepare}, ${OrderPickup}, ${OrderCancel}) AND t1.created_at >= (CURRENT_TIMESTAMP - INTERVAL 24 HOUR) )
         ) 
         AND t1.status = 1         
         ORDER BY t1.created_at ASC
   `, [aAllStoreId]);
   // OR 
   //   ( t1.state_id IN (${OrderPickup}) AND t1.updated_at >= (CURRENT_TIMESTAMP - INTERVAL 10 MINUTE) ) 
   //  ORDER BY t1.created_at ASC, sequence, t1.uuid ASC, t2.order_detail_id ASC
   // LEFT JOIN wm_user_reg_card AS t7 
   // ON t7.user_id = t1.user_id AND t7.is_default = 1

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log(err));
}

Order.getOrderLocation = (iOrderId) => {
   return knex.select(
      't1.lat',
      't1.lng')
      .from('wm_order_location AS t1')
      .where({ order_id: parseInt(iOrderId) })
      .orderBy('created_at', 'desc').limit(1)
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Order.getOrderProductAndOptions = (iOrderId) => {
   // t2.order_detail_id, 
   // t2.product_id, 
   // t2.amount_tax_incl AS item_amount_tax_incl, 
   // t2.amount_tax_excl AS item_amount_tax_excl, 
   // t2.quantity AS item_quantity, 
   // t2.order_prd_key AS order_prd_key, 
   // t2.request_message AS request_message, 
   // t3.price AS option_price,
   // t3.name AS option_name,
   // t3.name2 AS option_name2,
   // t3.product_option_id AS product_option_id,
   // t4.name AS prd_name,
   // t4.name2 AS prd_name2,
   // t4.base_price AS prd_price,

   let sQuery = knex.raw(`
         t1.order_detail_id, 
         t1.product_id, 
         t1.amount_tax_incl AS item_amount_tax_incl, 
         t1.amount_tax_excl AS item_amount_tax_excl,
         t1.quantity AS item_quantity, 
         t1.order_prd_key AS order_prd_key, 
         t1.request_message AS request_message, 
         t1.product_nm AS prd_name,
         t1.product_nm AS prd_name2,
         t1.base_price AS prd_price,
         t2.price AS option_price,
         t2.name AS option_name,
         t2.name2 AS option_name2,
         t2.product_option_id AS product_option_id
         FROM wm_order_detail AS t1
         LEFT JOIN wm_order_detail_option AS t2
            ON t2.order_detail_id = t1.order_detail_id
         WHERE t1.order_id = ?
   `, [iOrderId]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log(err));
}

Order.getFirebaseToken = (iUserId, sNm) => {
   return knex(sPush_token)
      .select('token', 'os')
      .where({ user_id: iUserId })
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

Order.getOrderNotiCount = (iOrderId) => {
   return knex.select(
      "parking_arrival",
      "parking_prepare",
      "auto_order_cancel",
      "pos_order_cancel",
      "order_confirm",
      "order_prepared_aft",
      "order_prepared_bef",
      "concluded",
      "arrival_customer",
      "arrival_confirm"
   )
      .from('wm_order_noti')
      .where({ order_id: iOrderId })
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

module.exports = Order;
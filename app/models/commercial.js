// The Website model.
'use strict';

var config = require('../config'),
   knex = require('../services/database');

const moment = require('moment-timezone');
require('moment/locale/ko');

async function* asyncGenerator(sIndex) {
   let count = 0;
   while (count < sIndex) 
   yield count++;
};


var Commercial = {};

// knex

Commercial.editCommercialEventId = (storeNm,aIndex,zIndex,dIndex,fIndex) => {
   return   knex('wm_event')
            .update({ title: storeNm,content: zIndex, subtitle: dIndex, img_url1: fIndex, img_url_thumbnail: fIndex })
            .where({ event_id: aIndex })
            .where({ status: 1 })
            .where({ event_type: "popup_adver" })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Commercial.getStoreNm = (iStoreId) => {
   return   knex.select("store_name")
            .from('wm_store')
            .where({ store_id: iStoreId })
            .then(function (result) {
               return result;
            })
            .catch((err) => console.log(err));
}

Commercial.checkThrooDeliveryKit = (iStoreId) => {
   return   knex.select("*")
            .from('wm_adver_throo_kit')
            .where({ store_id: iStoreId })
            .then(function (result) {
               return result;
            })
            .catch((err) => console.log(err));
}

Commercial.checkThrooDeliveryBanner = (iStoreId) => {
   return   knex.select("*")
            .from('wm_adver_throo_banner')
            .where({ store_id: iStoreId })
            .then(function (result) {
               return result;
            })
            .catch((err) => console.log(err));
}

Commercial.checkPointOrderDoneDeal = (iStoreId,iParam) => {
   return   knex.select("state_id")
            .from('wm_adver_order')
            .where({ order_id: iParam })
            .where({ store_id: iStoreId })
            .then(function (result) {
               return result;
            })
            .catch((err) => console.log(err));
}

Commercial.checkCommercialEventId = (iStoreId,iParam) => {
   return   knex.select("event_id")
            .from('wm_adver_event')
            .where({ store_id: iStoreId })
            .where({ adver_event_id: iParam })
            .where({ status: 1 })
            .then(function (result) {
               return result;
            })
            .catch((err) => console.log(err));
}

Commercial.storeCouponList = (aIndex) => {
   return  knex.select('*')
           .from("wm_event_coupon")
           .where({store_id : aIndex})
           .where({status : 1})
           .where({partnership : 1})
           .then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Commercial.getPointDetail = (aIndex) => {
   return  knex.select('type','points')
           .from("wm_merchant_points")
           .where({order_id : aIndex})
           .where({status : 1})
           .then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Commercial.completeCommercialChargedDB = (aIndex,zIndex,dIndex) => {
   return   knex('wm_merchant_points')
            .update({ status: 1, updated_at: knex.fn.now(), description: "결제완료" })
            .where({ store_id: aIndex })
            .where({ order_id: zIndex })
            .where({ points: (dIndex + (dIndex * 10 / 100)) })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}

Commercial.getMerchantPoints = (aIndex) => {
   return  knex.select('store_point_id','merchant_id','order_id','points','type')
           .from("wm_merchant_points")
           .where({store_id : aIndex})
           .where({status : 1})
           .then(function (result) {
               return result;
           })
           .catch((err) => console.log(err));
}

Commercial.getAdverEventChartList = async (storeId) => {
   return  knex.select('adver_event_id', 'created_at', 'end_date')
               .from('wm_adver_event')
               .where({store_id : storeId})
               .where({status : 1})
               .orderBy('adver_event_id', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Commercial.getAdverPopularChartList = async (storeId) => {
   return  knex.select('adver_product_popular_id', 'created_at', 'end_date')
               .from('wm_adver_product_popular')
               .where({store_id : storeId})
               .where({status : 1})
               .orderBy('adver_product_popular_id', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Commercial.getAdverThrooOnlyChartList = async (storeId) => {
   return  knex.select('adver_product_throo_only_id', 'created_at', 'end_date')
               .from('wm_adver_product_throo_only')
               .where({store_id : storeId})
               .where({status : 1})
               .orderBy('adver_product_throo_only_id', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Commercial.getAdverStoreChartList = async (storeId) => {
   return  knex.select('adver_store_id', 'created_at', 'end_date')
               .from('wm_adver_store')
               .where({store_id : storeId})
               .where({status : 1})
               .orderBy('adver_store_id', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Commercial.getAdverCouponChartList = async (storeId) => {
   return  knex.select('adver_coupon_id', 'created_at', 'end_date')
               .from('wm_adver_coupon')
               .where({store_id : storeId})
               .where({status : 1})
               .orderBy('adver_coupon_id', 'desc')
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

// sql

Commercial.getCommercialOrderTime = async (sIndex) => {
   let sQuery = knex.raw(`
               t3.minute AS walking,
               t2.minute AS drive
   FROM        wm_store_time_business                 AS t1 
   LEFT JOIN   wm_store_time_congestion               AS t2 ON t1.congestion_type = t2.congestion_type 
   LEFT JOIN   wm_store_time_congestion_delivery      AS t3 ON t3.congestion_type = t1.congestion_type 
   WHERE       t1.store_id = ?
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}


Commercial.getSoreCommercialStoreDetail = async (sIndex) => {
   let sQuery = knex.raw(`
               t1.store_name,
               t1.parking_time,
               t2.url_path
   FROM        wm_store        AS t1 
   LEFT JOIN   wm_store_media  AS t2 ON t1.store_id = t2.store_id 
   WHERE       t1.store_id = ?
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverStoreChartCommercialClicked = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(clicked_count) AS sNm
      FROM     wm_adver_store_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_store_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverProductPopularChartCommercialClicked = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(clicked_count) AS sNm
      FROM     wm_adver_product_popular_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_product_popular_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverProductThroo_onlyChartCommercialClicked = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(clicked_count) AS sNm
      FROM     wm_adver_product_throo_only_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_product_throo_only_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverEventChartCommercialClicked = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(clicked_count) AS sNm
      FROM     wm_adver_event_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_event_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverCouponChartCommercialClicked = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(clicked_count) AS sNm
      FROM     wm_adver_coupon_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_coupon_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}


Commercial.adverCouponDisplayCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(display_count) AS amount
      FROM        wm_adver_coupon_stats          
      WHERE       store_id = ?
      AND         adver_coupon_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverProductThrooOnlyDisplayCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(display_count) AS amount
      FROM        wm_adver_product_throo_only_stats          
      WHERE       store_id = ?
      AND         adver_product_throo_only_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverProductPopularDisplayCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(display_count) AS amount
      FROM        wm_adver_product_popular_stats          
      WHERE       store_id = ?
      AND         adver_product_popular_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverProductPopularClickCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(clicked_count) AS amount
      FROM        wm_adver_product_popular_stats          
      WHERE       store_id = ?
      AND         adver_product_popular_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}


Commercial.adverStoreDisplayCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(display_count) AS amount
      FROM        wm_adver_store_stats          
      WHERE       store_id = ?
      AND         adver_store_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverStoreClickCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(clicked_count) AS amount
      FROM        wm_adver_store_stats          
      WHERE       store_id = ?
      AND         adver_store_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverProductThrooOnlyClickCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(clicked_count) AS amount
      FROM        wm_adver_product_throo_only_stats          
      WHERE       store_id = ?
      AND         adver_product_throo_only_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}


Commercial.adverCouponClickCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(clicked_count) AS amount
      FROM        wm_adver_coupon_stats          
      WHERE       store_id = ?
      AND         adver_coupon_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverEventDisplayCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(display_count) AS amount
      FROM        wm_adver_event_stats          
      WHERE       store_id = ?
      AND         adver_event_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverEventClickCount = (storeId, sId) => {
   let sQuery = knex.raw(`
                  SUM(clicked_count) AS amount
      FROM        wm_adver_event_stats          
      WHERE       store_id = ?
      AND         adver_event_id = ?
   `, [storeId,sId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverEventData = async (iParam) => {
   return  knex.select("event_id", "content", "subtitle", "img_url_thumbnail", "img_url1")
               .from('wm_event')
               .where({ 'event_type': "popup_adver" })
               .where({ 'event_id': iParam })
               .then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Commercial.adverEventChartCommercial = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(display_count) AS sNm
      FROM     wm_adver_event_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_event_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverProductPopularChartCommercial = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(display_count) AS sNm
      FROM     wm_adver_product_popular_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_product_popular_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverCouponChartCommercial = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(display_count) AS sNm
      FROM     wm_adver_coupon_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_coupon_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverProductThroo_onlyChartCommercial = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(display_count) AS sNm
      FROM     wm_adver_product_throo_only_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_product_throo_only_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.adverStoreChartCommercial = async (sIndex,aIndex,nIndex) => {
   let sQuery = knex.raw(`
               SUM(display_count) AS sNm
      FROM     wm_adver_store_stats
      WHERE    store_id = ?
      AND      DATE(created_at) = DATE(?)
      AND      adver_store_id = ?
   `, [sIndex,aIndex,nIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.checkNewStoreCommercial = async (sParam) => {
   let sQuery = knex.raw(`
               t2.adver_coupon_id,
               t3.adver_event_id, 
               t4.adver_product_popular_id, 
               t5.adver_product_throo_only_id, 
               t6.adver_store_id 
   FROM        wm_merchant_points                  AS t1
   LEFT JOIN   wm_adver_coupon                     AS t2 ON t1.store_id = t2.store_id 
   LEFT JOIN   wm_adver_event                      AS t3 ON t1.store_id = t3.store_id
   LEFT JOIN   wm_adver_product_popular            AS t4 ON t1.store_id = t4.store_id 
   LEFT JOIN   wm_adver_product_throo_only         AS t5 ON t1.store_id = t5.store_id
   LEFT JOIN   wm_adver_store                      AS t6 ON t1.store_id = t6.store_id 
   WHERE       t1.store_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Commercial.getAdverEvent = async (storeId,sDate) => {
   let sQuery = knex.raw(`
               adver_event_id,
               event_id, 
               end_date 
      FROM     wm_adver_event 
      WHERE    store_id = ?
      AND      DATE(end_date) >= DATE(?)
      AND      status = 1
   `, [storeId,sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.getAdverBanner = async (storeId) => {
   let sQuery = knex.raw(`
               adver_throo_banner_id, 
               end_date 
      FROM     wm_adver_throo_banner 
      WHERE    store_id = ?
      AND      status = 1
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.getCommercialPaymentList = async (sParam,fDate,tDate) => {
   let sQuery = knex.raw(`   
                     order_id,
                     discount_amount, 
                     total_amount_org,
                     total_amount_incl,
                     created_at
      FROM           wm_adver_order         
      WHERE          store_id = ?
      AND            created_at BETWEEN DATE(?) AND DATE(?)
   `, [sParam,fDate,tDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Commercial.getAdverThrooKit = async (storeId) => {
   let sQuery = knex.raw(`
               adver_throo_kit_id, 
               end_date 
      FROM     wm_adver_throo_kit 
      WHERE    store_id = ?
      AND      status = 1
   `, [storeId]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.getAdverStore = async (storeId,sDate) => {
   let sQuery = knex.raw(`
               adver_store_id, 
               end_date 
      FROM     wm_adver_store 
      WHERE    store_id = ?
      AND      DATE(end_date) >= DATE(?)
      AND      status = 1
   `, [storeId,sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.getAdverProductThrooOnly = async (storeId,sDate) => {
   let sQuery = knex.raw(`
               adver_product_throo_only_id, 
               end_date 
      FROM     wm_adver_product_throo_only 
      WHERE    store_id = ?
      AND      DATE(end_date) >= DATE(?)
      AND      status = 1
   `, [storeId,sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.getAdverCoupon = async (storeId,sDate) => {
   let sQuery = knex.raw(`
               adver_coupon_id, 
               end_date 
      FROM     wm_adver_coupon 
      WHERE    store_id = ?
      AND      DATE(end_date) >= DATE(?)
      AND      status = 1
   `, [storeId,sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.getAdverProductPopular = async (storeId,sDate) => {
   let sQuery = knex.raw(`
               adver_product_popular_id, 
               end_date 
      FROM     wm_adver_product_popular 
      WHERE    store_id = ?
      AND      DATE(end_date) >= DATE(?)
      AND      status = 1
   `, [storeId,sDate]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.couponUserDownload = async (sParam) => {
   let sQuery = knex.raw(`             
                  COUNT(user_coupon_id) AS nm
      FROM        wm_event_coupon_user       
      WHERE       coupon_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Commercial.getChargedInfomationCommercial = async (sParam) => {
   let sQuery = knex.raw(`   
                     t1.state_id, 
                     t1.discount_amount, 
                     t3.result_cd, 
                     t3.amount,
                     t4.type
         FROM        wm_adver_order                AS t1
         INNER JOIN  wm_adver_order_payment        AS t2 ON t2.payment_id = t1.payment_id
         INNER JOIN  wm_adver_order_payment_tpay   AS t3 ON t3.payment_id = t2.payment_id 
         INNER JOIN  wm_merchant_points            AS t4 ON t4.order_id = t1.order_id 
         WHERE       t1.order_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Commercial.getThrooBannerKit = async (sParam) => {
   let sQuery = knex.raw(`   
                        t1.created_at, 
                        t2.state_id, 
                        t2.delivery_company, 
                        t2.delivery_param, 
                        t2.delivered_at, 
                        t2.updated_at, 
                        t2.confirm_at,
                        t2.delivery_company_id 
         FROM           wm_adver_throo_banner   AS t1
         INNER JOIN     wm_website_inquiry      AS t2 ON t1.inquiry_id = t2.inquiry_id 
         WHERE          t1.store_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Commercial.getThrooKit = async (sParam) => {
   let sQuery = knex.raw(` 
                        t1.created_at, 
                        t2.state_id, 
                        t2.delivery_company, 
                        t2.delivery_param, 
                        t2.delivered_at, 
                        t2.updated_at, 
                        t2.confirm_at,
                        t2.delivery_company_id 
         FROM           wm_adver_throo_kit   AS t1
         INNER JOIN     wm_website_inquiry   AS t2 ON t1.inquiry_id = t2.inquiry_id 
         WHERE          t1.store_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Commercial.getBasicInfomationCommercial = async (sParam) => {
   let sQuery = knex.raw(`             
                  t1.phone_number, 
                  t1.merchant_id, 
                  t2.store_name,
                  t2.lat,
                  t2.lng
      FROM        wm_merchant              AS t1 
      INNER JOIN  wm_store                 AS t2 ON t1.store_id = t2.store_id
      WHERE       t1.store_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Commercial.getBasicInfomationCommercial = async (sParam) => {
   let sQuery = knex.raw(`             
                  t1.phone_number, 
                  t1.merchant_id, 
                  t2.store_name,
                  t2.lat,
                  t2.lng
      FROM        wm_merchant              AS t1 
      INNER JOIN  wm_store                 AS t2 ON t1.store_id = t2.store_id
      WHERE       t1.store_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Commercial.getSoreCommercialThrooOnlyListWithImg = async (sIndex) => {
   let sQuery = knex.raw(`
               t1.product_id,
               t1.name,
               t1.base_price,
               t1.org_price,
               t2.url_path
   FROM        wm_product        AS t1 
   left join   wm_product_media  AS t2 ON t1.product_id = t2.product_id 
   WHERE       t1.store_id = ?
   AND         t1.status = 1
   AND         t1.is_deleted = 0
   AND         t1.is_throo_only = 1
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.getSoreCommercialProductListWithImg = async (sIndex) => {
   let sQuery = knex.raw(`
               t1.product_id,
               t1.name,
               t1.base_price,
               t1.org_price,
               t2.url_path
   FROM        wm_product        AS t1 
   left join   wm_product_media  AS t2 ON t1.product_id = t2.product_id 
   WHERE       t1.store_id = ?
   AND         t1.status = 1
   AND         t1.is_deleted = 0
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.bannerCommercialEndList = async (sIndex) => {
   let sQuery = knex.raw(`
                     t1.created_at, 
                     t1.end_date, 
                     t1.store_id, 
                     t1.adver_event_id,
                     t2.store_name
      FROM           wm_adver_event    AS t1
      INNER JOIN     wm_store          AS t2 ON t2.store_id = t1.store_id
      WHERE          DATE(t1.end_date) < ?
      AND            t1.status = 1
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.bannerCommercialList = async (sIndex) => {
   let sQuery = knex.raw(`
                     t1.created_at, 
                     t1.end_date, 
                     t1.store_id, 
                     t1.adver_event_id,
                     t2.store_name
      FROM           wm_adver_event    AS t1
      INNER JOIN     wm_store          AS t2 ON t2.store_id = t1.store_id
      WHERE          DATE(t1.end_date) >= ?
      AND            t1.status = 1
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.couponCommercialEndList = async (sIndex) => {
   let sQuery = knex.raw(`
                     t1.created_at, 
                     t1.end_date, 
                     t1.store_id, 
                     t1.adver_coupon_id,
                     t2.store_name
      FROM           wm_adver_coupon      AS t1
      INNER JOIN     wm_store             AS t2 ON t2.store_id = t1.store_id
      WHERE          DATE(t1.end_date) < ?
      AND            t1.status = 1
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.couponCommercialList = async (sIndex) => {
   let sQuery = knex.raw(`
                     t1.created_at, 
                     t1.end_date, 
                     t1.store_id, 
                     t1.adver_coupon_id,
                     t2.store_name
      FROM           wm_adver_coupon      AS t1
      INNER JOIN     wm_store             AS t2 ON t2.store_id = t1.store_id
      WHERE          DATE(t1.end_date) >= ?
      AND            t1.status = 1
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.couponCommercialEndList = async (sIndex) => {
   let sQuery = knex.raw(`
                     t1.created_at, 
                     t1.end_date, 
                     t1.store_id, 
                     t1.adver_coupon_id,
                     t2.store_name
      FROM           wm_adver_coupon      AS t1
      INNER JOIN     wm_store             AS t2 ON t2.store_id = t1.store_id
      WHERE          DATE(t1.end_date) < ?
      AND            t1.status = 1
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.couponCommercialList = async (sIndex) => {
   let sQuery = knex.raw(`
                     t1.created_at, 
                     t1.end_date, 
                     t1.store_id, 
                     t1.adver_coupon_id,
                     t2.store_name
      FROM           wm_adver_coupon      AS t1
      INNER JOIN     wm_store             AS t2 ON t2.store_id = t1.store_id
      WHERE          DATE(t1.end_date) >= ?
      AND            t1.status = 1
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.storeCommercialEndList = async (sIndex) => {
   let sQuery = knex.raw(`
                     t1.created_at, 
                     t1.end_date, 
                     t1.store_id, 
                     t1.adver_store_id,
                     t2.store_name
      FROM           wm_adver_store       AS t1
      INNER JOIN     wm_store             AS t2 ON t2.store_id = t1.store_id
      WHERE          DATE(t1.end_date) < ?
      AND            t1.status = 1
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.storeCommercialList = async (sIndex) => {
   let sQuery = knex.raw(`
                     t1.created_at, 
                     t1.end_date, 
                     t1.store_id, 
                     t1.adver_store_id,
                     t2.store_name
      FROM           wm_adver_store       AS t1
      INNER JOIN     wm_store             AS t2 ON t2.store_id = t1.store_id
      WHERE          DATE(t1.end_date) >= ?
      AND            t1.status = 1
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.productCommercialEndList = async (sIndex) => {
   let sQuery = knex.raw(`
                     t1.created_at, 
                     t1.end_date, 
                     t1.store_id, 
                     t1.adver_product_popular_id,
                     t2.store_name
      FROM           wm_adver_product_popular         AS t1
      INNER JOIN     wm_store                         AS t2 ON t2.store_id = t1.store_id
      WHERE          DATE(t1.end_date) < ?
      AND            t1.status = 1
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.productCommercialList = async (sIndex) => {
   let sQuery = knex.raw(`
                     t1.created_at, 
                     t1.end_date, 
                     t1.store_id, 
                     t1.adver_product_popular_id,
                     t2.store_name
      FROM           wm_adver_product_popular         AS t1
      INNER JOIN     wm_store                         AS t2 ON t2.store_id = t1.store_id
      WHERE          DATE(t1.end_date) >= ?
      AND            t1.status = 1
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.throoOnlyCommercialEndList = async (sIndex) => {
   let sQuery = knex.raw(`
                     t1.created_at, 
                     t1.end_date, 
                     t1.store_id, 
                     t1.adver_product_throo_only_id,
                     t2.store_name
      FROM           wm_adver_product_throo_only         AS t1
      INNER JOIN     wm_store                            AS t2 ON t2.store_id = t1.store_id
      WHERE          DATE(t1.end_date) < ?
      AND            t1.status = 1
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.throoOnlyCommercialList = async (sIndex) => {
   let sQuery = knex.raw(`
                     t1.created_at, 
                     t1.end_date, 
                     t1.store_id, 
                     t1.adver_product_throo_only_id,
                     t2.store_name
      FROM           wm_adver_product_throo_only         AS t1
      INNER JOIN     wm_store                            AS t2 ON t2.store_id = t1.store_id
      WHERE          DATE(t1.end_date) >= ?
      AND            t1.status = 1
   `, [sIndex]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.kitCommercialEndList = async () => {
   let sQuery = knex.raw(`
                     t1.created_at, 
                     t2.store_name, 
                     t3.updated_at AS end_date
      FROM           wm_adver_throo_kit         AS t1
      INNER JOIN     wm_store                   AS t2 ON t2.store_id = t1.store_id
      INNER JOIN     wm_website_inquiry         AS t3 ON t3.inquiry_id = t1.inquiry_id
      WHERE          t3.state_id = 3
   `, []);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.kitCommercialList = async () => {
   let sQuery = knex.raw(`
                     t1.created_at, 
                     t2.store_name, 
                     t3.updated_at AS end_date
      FROM           wm_adver_throo_kit         AS t1
      INNER JOIN     wm_store                   AS t2 ON t2.store_id = t1.store_id
      INNER JOIN     wm_website_inquiry         AS t3 ON t3.inquiry_id = t1.inquiry_id
      WHERE          t3.state_id != 3
   `, []);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.placardCommercialEndList = async () => {
   let sQuery = knex.raw(`
                     t1.created_at, 
                     t2.store_name, 
                     t3.updated_at AS end_date
      FROM           wm_adver_throo_banner         AS t1
      INNER JOIN     wm_store                      AS t2 ON t2.store_id = t1.store_id
      INNER JOIN     wm_website_inquiry            AS t3 ON t3.inquiry_id = t1.inquiry_id
      WHERE          t3.state_id = 3
   `, []);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.placardCommercialList = async () => {
   let sQuery = knex.raw(`
                     t1.created_at, 
                     t2.store_name, 
                     t3.updated_at AS end_date
      FROM           wm_adver_throo_banner         AS t1
      INNER JOIN     wm_store                      AS t2 ON t2.store_id = t1.store_id
      INNER JOIN     wm_website_inquiry            AS t3 ON t3.inquiry_id = t1.inquiry_id
      WHERE          t3.state_id != 3
   `, []);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Commercial.getChargedInfomationCommercial = async (sParam) => {
   let sQuery = knex.raw(`   
                     t1.state_id, 
                     t1.discount_amount, 
                     t3.result_cd, 
                     t3.amount,
                     t4.type
         FROM        wm_adver_order                AS t1
         INNER JOIN  wm_adver_order_payment        AS t2 ON t2.payment_id = t1.payment_id
         INNER JOIN  wm_adver_order_payment_tpay   AS t3 ON t3.payment_id = t2.payment_id 
         INNER JOIN  wm_merchant_points            AS t4 ON t4.order_id = t1.order_id 
         WHERE       t1.order_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

Commercial.getCommercialIdByOrderId = async (sParam) => {
   let sQuery = knex.raw(`   
                     t1.state_id, 
                     t2.adver_event_id, 
                     t2.event_id,
                     t3.adver_coupon_id,
                     t4.adver_product_popular_id,
                     t5.adver_product_throo_only_id,
                     t6.adver_store_id,
                     t7.adver_throo_banner_id,
                     t7.address AS banner_address,
                     t7.user_name AS banner_user,
                     t7.phone_number AS banner_phone,
                     t8.adver_throo_kit_id,
                     t8.address AS kit_address,
                     t8.user_name AS kit_user,
                     t8.phone_number AS kit_phone
         FROM        wm_adver_order                AS t1
         LEFT JOIN   wm_adver_event                AS t2 ON t1.order_id = t2.order_id 
         LEFT JOIN   wm_adver_coupon               AS t3 ON t1.order_id = t3.order_id 
         LEFT JOIN   wm_adver_product_popular      AS t4 ON t1.order_id = t4.order_id 
         LEFT JOIN   wm_adver_product_throo_only   AS t5 ON t1.order_id = t5.order_id 
         LEFT JOIN   wm_adver_store                AS t6 ON t1.order_id = t6.order_id 
         LEFT JOIN   wm_adver_throo_banner         AS t7 ON t1.order_id = t7.order_id 
         LEFT JOIN   wm_adver_throo_kit            AS t8 ON t1.order_id = t8.order_id
         WHERE       t1.order_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err", err));
}

//transaction
Commercial.chargedPointFirstStep = async (oData) => {
   let result = {
      resultCd: "9999",
      resultId: 0,
   }

   const trx = await knex.transaction();
   try {
      let temp = {
         order_nr: oData.orderNr,
         type_id: 1,
         uuid: oData.uuid,
         merchant_id: oData.merchantId,
         store_id: oData.storeId,
         state_id: 14001,
         total_amount_org: oData.iPrice,
         total_amount_incl: oData.iPrice,
         total_amount_excl: oData.iPrice,
         phone_number: oData.merchantPhone,
         device_os_info: oData.osInfo,
         product_name: oData.productNm,
      }
      const insert = await trx("wm_adver_order") 
                           .insert(temp)
                           .then(async (res) => {
                              console.log("res",res);
                              return res;
                           })
                           .catch((err) => {
                              console.log("err",err);
                              throw e;
                           });
                           
      result.resultCd = '1111';      
                           
      temp = {
         merchant_id: oData.merchantId,
         uuid: oData.uuid,
         store_id: oData.storeId,
         order_id: insert[0],
         points: (oData.iPrice + (oData.iPrice * 10 / 100)),
         type: 2,
         description: "결제대기중",
         status: 0
      }
      await trx("wm_merchant_points") 
            .insert(temp)
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

      result.resultCd = '0000';
      result.resultId = insert[0];

      await trx.commit();
      return result;
   }
   catch (e) {
      await trx.rollback();
      return result;
   }
}

Commercial.payCommercialLastStep = async (storeId,orderId,iData) => {
   let resultCd = "9999";
   const trx = await knex.transaction();
   try {
      await trx("wm_merchant_points")
            .where({ store_id: storeId })
            .where({ order_id: orderId })
            .update({ status: 1, description: "결재완료", updated_at: knex.fn.now() })
            .then(async (res) => {
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });
            resultCd = '8888';

      
      if(iData.adver_event_id !== undefined && iData.adver_event_id !== null && iData.adver_event_id !== ""){
         await trx("wm_event")
               .where({ event_id: parseInt(iData.event_id) })
               .update({ status: 1, updated_at: knex.fn.now() })
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
               resultCd = '7776';

         await trx("wm_adver_event")
               .where({ store_id: storeId })
               .where({ adver_event_id: parseInt(iData.adver_event_id) })
               .where({ order_id: orderId })
               .update({ status: 1 })
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
               resultCd = '7777';
      }
      if(iData.adver_product_popular_id !== undefined && iData.adver_product_popular_id !== null && iData.adver_product_popular_id !== ""){
         await trx("wm_adver_product_popular")
               .where({ store_id: storeId })
               .where({ adver_product_popular_id: parseInt(iData.adver_product_popular_id) })
               .where({ order_id: orderId })
               .update({ status: 1 })
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
               resultCd = '6666';
      }
      if(iData.adver_coupon_id !== undefined && iData.adver_coupon_id !== null && iData.adver_coupon_id !== ""){
         await trx("wm_adver_coupon")
               .where({ store_id: storeId })
               .where({ adver_coupon_id: parseInt(iData.adver_coupon_id) })
               .where({ order_id: orderId })
               .update({ status: 1 })
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
               resultCd = '5555';
      }
      if(iData.adver_product_throo_only_id !== undefined && iData.adver_product_throo_only_id !== null && iData.adver_product_throo_only_id !== ""){
         await trx("wm_adver_product_throo_only")
               .where({ store_id: storeId })
               .where({ adver_product_throo_only_id: parseInt(iData.adver_product_throo_only_id) })
               .where({ order_id: orderId })
               .update({ status: 1 })
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
               resultCd = '4444';
      }
      if(iData.adver_store_id !== undefined && iData.adver_store_id !== null && iData.adver_store_id !== ""){
         await trx("wm_adver_store")
               .where({ store_id: storeId })
               .where({ adver_store_id: parseInt(iData.adver_store_id) })
               .where({ order_id: orderId })
               .update({ status: 1 })
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
               resultCd = '3333';
      }
      if(iData.adver_throo_banner_id !== undefined && iData.adver_throo_banner_id !== null && iData.adver_throo_banner_id !== ""){
         const inquiryId = await trx("wm_website_inquiry") 
                                 .insert({ store_name: iData.banner_user, address: iData.banner_address, phone_number: iData.banner_phone, categories : "event", title: "야외 광고 배너", content : iData.banner_user + "야외 광고 배너" })
                                 .then(async (res) => {
                                    return res;
                                 })
                                 .catch((err) => {
                                    console.log("err",err);
                                    throw e;
                                 });
                                 resultCd = '2221';
         await trx("wm_adver_throo_banner")
               .where({ store_id: storeId })
               .where({ adver_throo_banner_id: parseInt(iData.adver_throo_banner_id) })
               .where({ order_id: orderId })
               .update({ status: 1,  inquiry_id: inquiryId[0] })
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
               resultCd = '2222';
      }
      if(iData.adver_throo_kit_id !== undefined && iData.adver_throo_kit_id !== null && iData.adver_throo_kit_id !== ""){
         const inquiryId = await trx("wm_website_inquiry") 
                                 .insert({ store_name: iData.kit_user, address: iData.kit_address, phone_number: iData.kit_phone, categories : "event", title: "홍보물 신청", content : iData.kit_user + "홍보물 신청" })
                                 .then(async (res) => {
                                    return res;
                                 })
                                 .catch((err) => {
                                    console.log("err",err);
                                    throw e;
                                 });
                                 resultCd = '1112';
         await trx("wm_adver_throo_kit")
               .where({ store_id: storeId })
               .where({ adver_throo_kit_id: parseInt(iData.adver_throo_kit_id) })
               .where({ order_id: orderId })
               .update({ status: 1, inquiry_id: inquiryId[0] })
               .then(async (res) => {
                  return res;
               })
               .catch((err) => {
                  console.log("err",err);
                  throw e;
               });
               resultCd = '1111';
      }
      
      resultCd = '0000';
      await trx.commit();
      return resultCd;

   } catch (error) {
      await trx.rollback();
      return resultCd;
   }
}

Commercial.payCommercialFirstStep = async (iResult) => {
   let result = {
      resultCd: '9999',
      orderId: null,
   }
   let sList = {}
   const trx = await knex.transaction();
   try {
      sList = {
         order_nr: iResult.orderNr,
         type_id: 1,
         uuid: iResult.uuid,
         merchant_id: iResult.merchantId,
         store_id: iResult.storeId,
         state_id: 14001,
         discount_amount: iResult.pointAmount + iResult.pointChargedAmount,
         total_amount_org: iResult.cartAmount,
         total_amount_incl: iResult.payAmount,
         total_amount_excl: iResult.payAmount,
         phone_number: iResult.merchantPhone,
         device_os_info: iResult.osInfo,
         product_name: iResult.productNm
      }
      const insert = await trx("wm_adver_order") 
                           .insert(sList)
                           .then(async (res) => {
                              console.log("res",res);
                              return res;
                           })
                           .catch((err) => {
                              console.log("err",err);
                              throw e;
                           });
                         
                           result.resultCd = '1111';   

      sList = {
         merchant_id: iResult.merchantId,
         uuid: iResult.uuid,
         store_id: iResult.storeId,
         order_id: insert[0],
         points: - Math.abs(iResult.pointAmount),
         type: 3,
         description: "결제대기중",
         status: 0
      }
      await trx("wm_merchant_points") 
            .insert(sList)
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });
            result.resultCd = '2222';   

      sList = {
         merchant_id: iResult.merchantId,
         uuid: iResult.uuid,
         store_id: iResult.storeId,
         order_id: insert[0],
         points: - Math.abs(iResult.pointChargedAmount),
         type: 4,
         description: "결제대기중",
         status: 0
      }
      await trx("wm_merchant_points") 
            .insert(sList)
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

            result.resultCd = '2223'; 

      for await (const iterator of iResult.cartList) { 
         const toDate = moment(iterator.fromDate).add(30,"days").format('YYYY-MM-DD');
         if(iterator.param === "banner"){
            sList = {
               admin_id: 5,
               event_type: 'popup_adver',
               recurring: null,
               title: iResult.storeNm,
               subtitle: iterator.bannerSubTitle,
               content: iterator.bannerTitle,
               img_url_thumbnail: iterator.bannerImgUrl,
               img_url1: iterator.bannerImgUrl,
               has_action: 2,
               has_action_param: iResult.iLat + "," + iResult.iLng + "," + iResult.storeId,
               lat: iResult.iLat,
               lng: iResult.iLng,
               radius: 3,
               start_date: moment(iterator.fromDate).format('YYYY-MM-DD'),
               end_date: toDate,
               status: 0
            }
            const eventId = await   trx("wm_event") 
                                    .insert(sList)
                                    .then(async (res) => {
                                       console.log("res",res);
                                       return res;
                                    })
                                    .catch((err) => {
                                       console.log("err",err);
                                       throw e;
                                    });
                                    result.resultCd = '3333'; 
      
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               event_id: eventId[0],
               order_id: insert[0],
               end_date: toDate,
               status: 0
            }
            await trx("wm_adver_event") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
                  result.resultCd = '4444'; 
      
         } else if (iterator.param === "coupon") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               coupon_id: iterator.couponId,
               order_id: insert[0],
               end_date: toDate,
               status: 0
            }
            await trx("wm_adver_coupon") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
                  result.resultCd = '5555'; 
      
         } else if (iterator.param === "only") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               product_id: iterator.productId,
               order_id: insert[0],
               end_date: toDate,
               status: 0
            }
            await trx("wm_adver_product_throo_only") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
                  result.resultCd = '6666'; 

         } else if (iterator.param === "new") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               order_id: insert[0],
               end_date: toDate,
               status: 0
            }
            await trx("wm_adver_store") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
                  result.resultCd = '7777'; 
      
         } else if (iterator.param === "hot") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               product_id: iterator.productId,
               order_id: insert[0],
               end_date: toDate,
               status: 0
            }
            await trx("wm_adver_product_popular") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
                  result.resultCd = '8888';

         } else if (iterator.param === "picket") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               order_id: insert[0],
               inquiry_id: 0,
               user_name: iterator.sNm,
               phone_number: iterator.sPhoneNm,
               address: iterator.sAddress + `${(iterator.sExtraAddress !== undefined && iterator.sExtraAddress !== null && iterator.sExtraAddress !== "") ? iterator.sExtraAddress : "" }`,
               end_date: toDate,
               status: 0
            }
            await trx("wm_adver_throo_banner") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
                  result.resultCd = '9997';
      
         } else if (iterator.param === "kit") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               order_id: insert[0],
               inquiry_id: 0,
               user_name: iterator.sNm,
               phone_number: iterator.sPhoneNm,
               address: iterator.sAddress + `${(iterator.sExtraAddress !== undefined && iterator.sExtraAddress !== null && iterator.sExtraAddress !== "") ? iterator.sExtraAddress : "" }`,
               end_date: toDate,
               status: 0
            }
            await trx("wm_adver_throo_kit") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

                  result.resultCd = '9998';
         }
      }
      result.resultCd = '0000';
      result.orderId = insert[0];

      await trx.commit();
      return result;

   } catch (error) {
      await trx.rollback();
      return result;
   }
}

Commercial.zeroAmountCommercialProduct = async (iResult) => {
   let resultCd = '9999';
   let sList = {}
   const trx = await knex.transaction();
   try {
      sList = {
         order_nr: iResult.orderNr,
         type_id: 1,
         uuid: iResult.uuid,
         merchant_id: iResult.merchantId,
         store_id: iResult.storeId,
         state_id: 14002,
         discount_amount: iResult.pointAmount + iResult.pointChargedAmount,
         total_amount_org: iResult.cartAmount,
         total_amount_incl: iResult.payAmount,
         total_amount_excl: iResult.payAmount,
         phone_number: iResult.merchantPhone,
         device_os_info: iResult.osInfo,
         product_name: iResult.productNm
      }
      const insert = await trx("wm_adver_order") 
                           .insert(sList)
                           .then(async (res) => {
                              console.log("res",res);
                              return res;
                           })
                           .catch((err) => {
                              console.log("err",err);
                              throw e;
                           });
                         
                           resultCd = '1111';      
                           
      sList = {
         merchant_id: iResult.merchantId,
         uuid: iResult.uuid,
         store_id: iResult.storeId,
         order_id: insert[0],
         points: - Math.abs(iResult.pointAmount),
         type: 3,
         description: "결재완료",
         status: 1
      }
      await trx("wm_merchant_points") 
            .insert(sList)
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

            resultCd = '2222'; 

      sList = {
         merchant_id: iResult.merchantId,
         uuid: iResult.uuid,
         store_id: iResult.storeId,
         order_id: insert[0],
         points: - Math.abs(iResult.pointChargedAmount),
         type: 4,
         description: "결재완료",
         status: 1
      }
      await trx("wm_merchant_points") 
            .insert(sList)
            .then(async (res) => {
               console.log("res",res);
               return res;
            })
            .catch((err) => {
               console.log("err",err);
               throw e;
            });

            resultCd = '2223'; 

      for await (const iterator of iResult.cartList) { 
         const toDate = moment(iterator.fromDate).add(30,"days").format('YYYY-MM-DD');
         if(iterator.param === "banner"){
            sList = {
               admin_id: 5,
               event_type: 'popup_adver',
               recurring: null,
               title: iResult.storeNm,
               subtitle: iterator.bannerSubTitle,
               content: iterator.bannerTitle,
               img_url_thumbnail: iterator.bannerImgUrl,
               img_url1: iterator.bannerImgUrl,
               has_action: 2,
               has_action_param: iResult.iLat + "," + iResult.iLng + "," + iResult.storeId,
               lat: iResult.iLat,
               lng: iResult.iLng,
               radius: 3,
               start_date: moment(iterator.fromDate).format('YYYY-MM-DD'),
               end_date: toDate,
               status: 1
            }
            const eventId = await   trx("wm_event") 
                                    .insert(sList)
                                    .then(async (res) => {
                                       console.log("res",res);
                                       return res;
                                    })
                                    .catch((err) => {
                                       console.log("err",err);
                                       throw e;
                                    });

                                    resultCd = '3333'; 

            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               event_id: eventId[0],
               order_id: insert[0],
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_event") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
                  resultCd = '4444'; 

         } else if (iterator.param === "coupon") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               coupon_id: iterator.couponId,
               order_id: insert[0],
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_coupon") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });
                  resultCd = '5555'; 

         } else if (iterator.param === "only") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               product_id: iterator.productId,
               order_id: insert[0],
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_product_throo_only") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

                  resultCd = '6666';
         } else if (iterator.param === "new") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               order_id: insert[0],
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_store") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

                  resultCd = '7777';

         } else if (iterator.param === "hot") {
            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               product_id: iterator.productId,
               order_id: insert[0],
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_product_popular") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

                  resultCd = '8888';
         } else if (iterator.param === "picket") {
            const inquiryId = await trx("wm_website_inquiry") 
                                    .insert({ store_name: iResult.storeNm, address: iterator.sAddress + `${(iterator.sExtraAddress !== undefined && iterator.sExtraAddress !== null && iterator.sExtraAddress !== "") ? iterator.sExtraAddress : "" }` + iterator.sNm + "귀하", phone_number: iterator.sPhoneNm, categories : "event", title: "야외 광고 배너", content : iResult.storeNm + "야외 광고 배너" })
                                    .then(async (res) => {
                                       console.log("inquiryId picket",res);
                                       return res;
                                    })
                                    .catch((err) => {
                                       console.log("err",err);
                                       throw e;
                                    });

                                    resultCd = '9992';

            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               order_id: insert[0],
               inquiry_id: inquiryId[0],
               user_name: iterator.sNm,
               phone_number: iterator.sPhoneNm,
               address: iterator.sAddress + `${(iterator.sExtraAddress !== undefined && iterator.sExtraAddress !== null && iterator.sExtraAddress !== "") ? iterator.sExtraAddress : "" }`,
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_throo_banner") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

                  resultCd = '9991';
         } else if (iterator.param === "kit") {
            const inquiryId = await trx("wm_website_inquiry") 
                                    .insert({ store_name: iResult.storeNm, address: iterator.sAddress + `${(iterator.sExtraAddress !== undefined && iterator.sExtraAddress !== null && iterator.sExtraAddress !== "") ? iterator.sExtraAddress : "" }` + iterator.sNm + "귀하", phone_number: iterator.sPhoneNm, categories : "event", title: "홍보물 신청", content : iResult.storeNm + "홍보물 신청" })
                                    .then(async (res) => {
                                       console.log("inquiryId kit",res);
                                       return res;
                                    })
                                    .catch((err) => {
                                       console.log("err",err);
                                       throw e;
                                    });
                                    resultCd = '9993';

            sList = {
               merchant_id: iResult.merchantId,
               store_id: iResult.storeId,
               order_id: insert[0],
               inquiry_id: inquiryId[0],
               user_name: iterator.sNm,
               phone_number: iterator.sPhoneNm,
               address: iterator.sAddress + `${(iterator.sExtraAddress !== undefined && iterator.sExtraAddress !== null && iterator.sExtraAddress !== "") ? iterator.sExtraAddress : "" }`,
               end_date: toDate,
               status: 1
            }
            await trx("wm_adver_throo_kit") 
                  .insert(sList)
                  .then(async (res) => {
                     console.log("res",res);
                     return res;
                  })
                  .catch((err) => {
                     console.log("err",err);
                     throw e;
                  });

                  resultCd = '9994';
         }
      }
         
      resultCd = '0000';
      await trx.commit();
      return resultCd;

   } catch (error) {
      await trx.rollback();
      return resultCd;
   }
}


module.exports = Commercial;
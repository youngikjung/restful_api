// The Car model.abs
'use strict';

var config = require('../config'),
   knex = require('../services/database');

const STableNmOrder_history = 'wm_order_history';
const STableNmOrder = 'wm_order';
const STableNmsStore = 'wm_store';
const STableNmOrder_payment = 'wm_order_payment';
const STableNmUser = 'wm_user';
const STableNmOrder_detail = 'wm_order_detail';
const STableNmProduct = 'wm_product';
const STableNmProduct_option = 'wm_product_option';
const STableNmMerchant = 'wm_merchant';
const STableNmOrder_discount = 'wm_order_discount';
const STableNmOrder_receipt = 'wm_order_receipt';
const STableNmOrder_detail_option = 'wm_order_detail_option';

let OrderHistory = {};

OrderHistory.findList = (iUserId) => {
   
   let sQuery = knex.raw(`
                  t2.created_at,
                  t2.order_id,
                  t2.store_id,
                  t2.user_id,
                  t2.quantity,
                  t3.store_name,
                  t2.total_amount_excl AS amount,
                  t6.name,
                  t7.payment_state_id AS cancellation
      FROM        ${STableNmOrder_history} AS t1 
      INNER JOIN  ${STableNmOrder} AS t2 ON t2.order_id = t1.order_id
      INNER JOIN  ${STableNmsStore} AS t3 ON t3.store_id = t1.store_id
      INNER JOIN  ${STableNmUser} AS t4 ON t4.user_id = t1.user_id
      LEFT JOIN   ${STableNmOrder_detail} AS t5 ON t5.order_id = t2.order_id
      INNER JOIN  ${STableNmProduct} AS t6 ON t6.product_id = t5.product_id    
      INNER JOIN  ${STableNmOrder_payment} AS t7 ON t7.payment_id = t2.payment_id    
      WHERE       t1.user_id = ?
      GROUP BY    t2.order_id 
      ORDER BY    t2.order_id DESC 
      `, [iUserId]);

   let oQuery = knex.select(sQuery);

   return oQuery.then( (result) => {
      return result;
   }).catch((err) => console.log(err));
}

OrderHistory.findItemCount = (iOrder_id) => {
   let sQuery = knex.raw(`
            count(distinct product_id) AS countItem
      FROM  ${STableNmOrder_detail} 
      WHERE order_id = ?
   `, [iOrder_id]);
   let oQuery = knex.select(sQuery);

   return oQuery.then( (result) => {
      return result;
   }).catch((err) => console.log(err));

}

OrderHistory.findOptionCount = (iOrder_id) => {
   let sQuery = knex.raw(`
            count(order_detail_id) 
      FROM  ${STableNmOrder_detail} 
      WHERE order_id = ?
      AND   product_option_id > 0
   `, [iOrder_id]);
   let oQuery = knex.select(sQuery);

   return oQuery.then( (result) => {
      return result;
   }).catch((err) => console.log(err));

}

OrderHistory.itemDetailListWithDiscount = (iOrder_id) => {
   let sQuery = knex.raw(`
                  t1.created_at AS sDate,
                  t3.store_name AS storeNm,
                  t3.address1 AS storeAddress,
                  t5.full_name AS storeOwner,
                  t3.phone_number AS storePhone,
                  t1.created_at AS dateDetail,	                   
                  t6.subtotal_amount_incl AS amount,		   
                  t6.total_discount_excl AS grade,	                   
                  t2.total_amount_incl AS totalAmount,
                  t4.ccard_company AS card,
                  t4.ccard_number AS cardNm,
                  t4.payment_approved_nr AS approvedNm,
                  t4.amount AS midNm,
                  t4.ccard_number AS cardCompanyPhone
      FROM        ${STableNmOrder_history} AS t1 
      INNER JOIN  ${STableNmOrder} AS t2 ON t2.order_id = t1.order_id
      INNER JOIN  ${STableNmsStore} AS t3 ON t3.store_id = t1.store_id
      INNER JOIN  ${STableNmOrder_payment} AS t4 ON t4.payment_id = t1.payment_id                                                       
      INNER JOIN  ${STableNmMerchant} AS t5 on t5.store_id = t3.store_id   
      INNER JOIN  ${STableNmOrder_receipt} AS t6 on t6.order_id = t2.order_id   
      WHERE       t2.order_id = ?            
      ORDER BY    t2.order_id DESC;
      `, [iOrder_id]
   );
   let oQuery = knex.select(sQuery);

   return oQuery.then( (result) => {
      return result;
   }).catch((err) => console.log(err));

}

OrderHistory.itemDetailList = (iOrder_id) => {
   let sQuery = knex.raw(`
                  distinct (t4.name) as itemNm, 
                  t1.amount_tax_excl,
                  t1.quantity,
                  t4.product_id AS options,
                  t1.order_detail_id               
      FROM        ${STableNmOrder_detail} AS t1 
      LEFT JOIN   ${STableNmOrder_detail_option} AS t2 ON t2.order_detail_id = t1.order_detail_id
      INNER JOIN  ${STableNmProduct_option} AS t3 ON t3.option_id = t2.product_option_id
      INNER JOIN  ${STableNmProduct} AS t4 ON t4.product_id = t3.product_id                                                      
      WHERE       order_id = ?            
      `, [iOrder_id]
   );
   let oQuery = knex.select(sQuery);

   return oQuery.then( (result) => {
      return result;
   }).catch((err) => console.log(err));
}

OrderHistory.itemDetailListOptions = (iOrder_detail_id) => {
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

   return oQuery.then( (result) => {
      return result;
   }).catch((err) => console.log(err));
}

module.exports = OrderHistory;
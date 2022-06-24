// The Website model.
'use strict';

var config = require('../config'),
   knex = require('../services/database');

const sTableName = 'wm_merchant';

var Merchant = {};

Merchant.getMerchantByStoreId = (iStoreId) => {
   return knex.select('t1.store_id', 
      't1.phone_number', 
      't1.full_name', 
      't1.first_name', 
      't1.last_name',  
      't1.trademark_name', 
      't1.address1', 
      't1.address2',
      't1.city', 
      't1.province', 
      't1.postcode', 
      't1.business_number')
      .from(sTableName + ' AS t1')
      .where({ 't1.store_id': iStoreId })
      .where({ 't1.status': 1 })
      .timeout(config.queryTimeout).first().then(function (result) {
         return result;
      })
      .catch((err) => console.log(err));
}

Merchant.getTotalThrooStoreToken = () => {
   let sQuery = knex.raw(`
               t1.store_name, 
               t1.phone_number, 
               t2.token 
   FROM        wm_store AS t1 
   INNER JOIN  wm_push_token_pos AS t2 ON t1.store_id = t2.store_id 
   WHERE       t2.unique_id != "" 
   AND         t2.token != ""
   AND         t1.status = 1
   `, []);
   
   let oQuery = knex.select(sQuery);
   return oQuery.then((result) => {
      return result;
   }).catch((err) => console.log(err));
}

module.exports = Merchant;
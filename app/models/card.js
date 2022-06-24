// The Card model.
'use strict';

var config = require('../config'),
   knex = require('../services/database');

const sTableName = 'wm_user_reg_card';

var Card = {};

Card.create = (sCard_company, sCard_token, sExp, sNumber, iUserId) => {
   return knex(sTableName)
      .insert({ ccard_company: sCard_company, ccard_token: sCard_token, ccard_exp: sExp, number: sNumber, user_id: iUserId, is_default: '1' })
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

Card.findOneInCardTable = (sCard_company, sExp, sNumber, iUserId) => {
   return knex(sTableName)
      .where({ ccard_company: sCard_company })
      .where({ user_id: iUserId })
      .where({ ccard_exp: sExp })
      .where({ number: sNumber })
      .first().then((result) => {
         return result;
      })
      .catch((err) => console.log(err));
}

Card.findList = (iUserId) => {
   return knex(sTableName)
      .where({ user_id: iUserId })
      .select()
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

Card.deleteOne = (sCard_id, iUserId) => {
   return knex(sTableName)
      .where({ ccard_id: sCard_id })
      .andWhere({ user_id: iUserId })
      .del()
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

Card.updateOne = (sCard_id) => {
   return knex(sTableName)
      .update({ is_default: '1' })
      .where({ ccard_id: sCard_id })
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

Card.findOneDefault = (iUserId) => {
   return knex.raw(`
   update ${sTableName} 
   set    is_default = 0 
   where  
          ccard_id 
          in 
             (
               select ccard_id
               from   ${sTableName} 
               where  user_id    = ?
               and    is_default = 1
              )`, [iUserId])
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

Card.findMain = (iUserId) => {
   return knex.select('ccard_id', 'ccard_company', 'number', 'created_at', 'user_id', 'is_default')
      .from(sTableName)
      .where({ user_id: iUserId })
      .where({ is_default: true })
      .timeout(config.queryTimeout).first().then((result) => {
         return result;
      })
      .catch((err) => console.log(err));
}

Card.findCardById = (iCardId) => {
   return knex.select('ccard_id', 'ccard_company', 'ccard_exp', 'ccard_token', 'number', 'user_id')
      .from(sTableName)
      .where({ ccard_id: iCardId })
      .timeout(config.queryTimeout).first().then((result) => {
         return result;
      })
      .catch((err) => console.log(err));
}

Card.findCardByUserId = (iUserId) => {
   return knex.select('ccard_id', 'ccard_company', 'ccard_exp', 'ccard_token', 'number', 'user_id')
      .from(sTableName)
      .where({ user_id: iUserId })
      .where({ is_default: true })
      .timeout(config.queryTimeout).first().then((result) => {
         return result;
      })
      .catch((err) => console.log(err));
}

module.exports = Card;


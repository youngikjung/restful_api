// The Car model.abs
'use strict';

var config = require('../config'),
   knex = require('../services/database');

const sTableName = 'wm_user_reg_car';

let Car = {};

Car.findOne = (sLicense_number) => {
   return knex.select('car_id', 'license_number', 'status', 'created_at', 'user_id', 'is_default')
      .from(sTableName)
      .where(sLicense_number)
      .where({ is_default: true })
      .timeout(config.queryTimeout).first().then((result) => {
         return result;
      })
      .catch((err) => console.log(err));
}

Car.findMain = (iUserId) => {
   return knex.select('car_id', 'license_number', 'status', 'created_at', 'user_id', 'is_default')
      .from(sTableName)
      .where({ user_id: iUserId })
      .where({ is_default: true })
      .timeout(config.queryTimeout).first().then((result) => {
         return result;
      })
      .catch((err) => console.log(err));
}

Car.findList = (iUserId) => {
   return knex(sTableName)
      .where({ user_id: iUserId })
      .select('car_id', 'license_number', 'created_at', 'is_default')
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

Car.findOneDefault = (iUserId) => {
   return knex.raw(`
    update ${sTableName} 
    set    is_default = 0 
    where  
           car_id 
           in 
              (
                select car_id
                from   ${sTableName} 
                where  user_id    = ?
                and    is_default = 1
               )`, [iUserId])
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

Car.findOneInCarTable = (sLicense_number, iUserId) => {
   return knex(sTableName)
      .where({ license_number: sLicense_number })
      .where({ user_id: iUserId })
      .first().then((result) => {
         return result;
      })
      .catch((err) => console.log(err));
}

Car.create = (sLicense_number, iUserId) => {
   return knex(sTableName)
      .insert({ license_number: sLicense_number, user_id: iUserId, is_default: '1' })
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

Car.deleteOne = (sCar_id, iUserId) => {
   return knex(sTableName)
      .where({ car_id: sCar_id })
      .andWhere({ user_id: iUserId })
      .del()
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

Car.updateOne = (sCar_id) => {
   return knex(sTableName)
      .update({ is_default: '1' })
      .where({ car_id: sCar_id })
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

module.exports = Car;
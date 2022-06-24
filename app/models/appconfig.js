// The Website model.
'use strict';

var config = require('../config'),
   knex = require('../services/database');

var AppConfig = {};

AppConfig.getAppConfigData = (sEnv) => {
   let sQuery = knex.raw(`
         t1.env,
         t1.name,
         t1.value,
         t1.created_at,
         t1.updated_at,
         t1.status,
         MAX(DATE_FORMAT(t1.updated_at, '%Y%m%d%H%i%s')) OVER (PARTITION BY t1.env) AS last_update
      FROM 
         throo_app_config AS t1
      WHERE 
         t1.env = ?
   `, [sEnv]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log(err));
}

AppConfig.checkAppConfigData = (sEnv) => {
   let sQuery = knex.raw(`
         MAX(DATE_FORMAT(t1.updated_at, '%Y%m%d%H%i%s')) AS last_update
      FROM 
         throo_app_config AS t1
      WHERE 
         t1.env = ?
   `, [sEnv]);

   let oQuery = knex.select(sQuery);
   oQuery.limit(1);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log(err));
}

module.exports = AppConfig;
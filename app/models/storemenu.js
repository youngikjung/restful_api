// The Website model.
'use strict';

var config = require('../config'),
   knex = require('../services/database');

const sTableName = 'wm_menu';

var StoreMenu = {};

StoreMenu.getStoreMenu = (iStoreId) => {
   let sQuery = knex.raw(`
         t1.menu_id, 
         t1.name AS menu_name, 
         t1.store_id,
         t2.name AS category_name, 
         t2.category_id,
         t2.id_order
      FROM 
      ${sTableName} AS t1
      LEFT JOIN 
         wm_menu_category AS t2 ON t1.menu_id = t2.menu_id
      WHERE 
         t1.store_id = ?
      ORDER BY 
         t2.id_order ASC
   `, [iStoreId]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log(err));
}

module.exports = StoreMenu;
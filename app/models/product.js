// The Website model.
'use strict';

var config = require('../config'),
   knex = require('../services/database');

const sTableName = 'wm_product';

var Product = {};

Product.dashboardProduct = (sParam) => {
   let sQuery = knex.raw(`
            COUNT(*) AS productCount
      FROM  wm_product
      WHERE store_id = ?
   `, [sParam]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   })
   .catch((err) => console.log(err));
}

Product.getProductByCat = (iCategoryId) => {
   let sQuery = knex.raw(`
         t2.product_id,
         t2.name AS prd_name, 
         t2.name2 AS prd_name2, 
         t2.base_price, 
         (CASE 
            WHEN t3.is_default = 1 THEN (t2.base_price + t3.price)
            ELSE t2.base_price
         END) AS base_price_option,
         t2.description, 
         t3.option_id,
         t3.is_default, 
         t4.url_path
      FROM 
         wm_menu_cat_x_prd AS t1 
      LEFT JOIN 
         wm_product AS t2 ON t2.product_id = t1.product_id 
      LEFT JOIN 
         wm_product_option AS t3 ON t3.product_id = t1.product_id AND t3.is_default = 1
      LEFT JOIN 
         wm_product_media AS t4 ON t4.option_id = t3.option_id
      WHERE 
         t1.category_id = ?
      ORDER BY t2.id_order ASC, t3.id_order ASC
   `, [iCategoryId]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log(err));
}

Product.getCatProductByStoreId = (iStoreId) => {
   let sQuery = knex.raw(`
         t1.menu_id, 
         t1.name AS menu_name, 
         t1.store_id,
         t2.name AS category_name, 
         t2.name2 AS category_name2, 
         t2.category_id,
         t2.is_main AS category_is_main,
         t2.id_order AS category_id_order,
         t4.name AS prd_name,
         t4.name2 AS prd_name2,
         t4.description AS prd_description,
         t4.base_price AS prd_base_price, 
         (CASE 
            WHEN t5.is_default = 1 THEN (t4.base_price + t5.price)
            ELSE t4.base_price
         END) AS prd_base_price_option,
         t4.product_id AS prd_id,
         t5.option_id AS option_id,
         t5.name AS option_name,
         t5.name2 AS option_name2,
         t5.price AS option_price,
         t5.is_default AS option_is_default,
         t5.product_id AS option_prd_id,
         t6.name AS option_type_name,
         t6.name2 AS option_type_name2,
         t6.code AS option_type_code,
         t6.id_order AS option_type_order,
         t6.input_type AS option_input_type,
         t7.url_path
      FROM 
      wm_menu AS t1
      LEFT JOIN 
         wm_menu_category AS t2 ON t1.menu_id = t2.menu_id
      LEFT JOIN wm_menu_cat_x_prd AS t3 ON t3.category_id = t2.category_id
      LEFT JOIN wm_product AS t4 ON t4.product_id = t3.product_id AND t4.status = 1
      LEFT JOIN wm_product_option AS t5 ON t5.product_id = t4.product_id AND t5.status = 1
      INNER JOIN wm_product_option_type AS t6 ON t6.option_type_id = t5.option_type_id
      LEFT JOIN wm_product_media AS t7 ON t7.option_id = t5.option_id
      WHERE 
         t1.store_id = ?
      ORDER BY 
         t2.id_order ASC, t4.id_order ASC, t5.id_order
   `, [iStoreId]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log(err));
}

Product.getProductOptions = (iProduct) => {
   let sQuery = knex.raw(`
         t1.option_id,
         t1.name AS prd_name, 
         t1.name2 AS prd_name2, 
         t1.price, 
         t1.option_type_id,
         t1.id_order,
         t2.url_path,
         t3.name AS option_type_name,
         t3.code AS option_type_code,
         t3.id_order AS option_type_order
      FROM 
         wm_product_option AS t1
      LEFT JOIN 
         wm_product_media AS t2 ON t2.option_id = t1.option_id
      LEFT JOIN 
         wm_product_option_type AS t3 ON t3.option_type_id = t1.option_type_id
      WHERE 
         t1.product_id = ? AND t1.status = 1
      ORDER BY t1.id_order ASC
   `, [iProduct]);

   let oQuery = knex.select(sQuery);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log(err));
}

module.exports = Product;
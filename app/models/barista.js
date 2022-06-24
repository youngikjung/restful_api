// The Website model.
'use strict';

var config = require('../config'),
   knex = require('../services/database');

const sTableName = 'wm_store';

var Barista = {};

Barista.getBaristaByStoreId = (iStoreId) => {
   let sQuery = knex.raw(`
         t1.barista_id,
         t1.store_id,
         t1.phone_number,
         t1.full_name,
         t1.first_name,
         t1.last_name,
         t1.title,
         t1.sub_title,
         t1.description,
         t2.file_name, 
         t2.url_path
      FROM 
         wm_barista AS t1
      LEFT JOIN
         wm_barista_media AS t2
      ON t2.barista_id = t1.barista_id
      WHERE 
         t1.store_id = ?
   `, [iStoreId]);

   let oQuery = knex.select(sQuery);
   oQuery.limit(1);

   return oQuery.then(function (result) {
      return result;
   })
      .catch((err) => console.log(err));
}

module.exports = Barista;
'use strict';

var   config = require('../config'),
      knex = require('../services/database');

const sTableName = 'wmweb_user';

let Worker = {};

Worker.findOne = (sParam) => {
   return  knex.select('email','roll','team','full_name','birthday','token','user_id')
               .from(sTableName)
               .where({id : sParam})
               .where({status : 1})
               .where({activated : 1})
               .timeout(config.queryTimeout).first().then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Worker.getRoll = (sParam) => {
   return  knex.select('roll')
               .from(sTableName)
               .where({user_id : sParam})
               .where({status : 1})
               .where({activated : 1})
               .timeout(config.queryTimeout).first().then(function (result) {
                  return result;
               })
               .catch((err) => console.log(err));
}

Worker.updateToken = (sParam,sToken) => {
   return   knex(sTableName)
            .update({ token: sToken })
            .where({ id: sParam })
            .then((result) => {
               return result;
            }).catch((err) => console.log(err));
}


module.exports = Worker;
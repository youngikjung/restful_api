'use strict';

var config = require('./../config');
/*
var Sequelize = require('sequelize');

module.exports = new Sequelize(
    config.db.name,
    config.db.user,
    config.db.password,
    config.db.details
);
*/

const dbConfig = {
   client: config.db.dialect,
   connection: {
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      debug: false, 
      user: config.db.user,
      password: config.db.password,
      charset: 'utf8'
   },
   migrations: {
      directory: '../../migrations'
   },
   pool: { min: 3, max: 20 },
   acquireConnectionTimeout: 60000
}

var knexCon = require('knex')(dbConfig);

// For Debug use only
knexCon.on( 'query', function( queryData ) {
   //console.log( queryData );
});

module.exports = knexCon;
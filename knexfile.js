// Update with your config settings.

module.exports = {

   development: {
      client: 'mysql2',
      connection: {
         
      },
      pool: {
         min: 2,
         max: 10
      },
      migrations: {
         tableName: 'knex_migrations',
         directory: `${__dirname}/db/migrations`
      },
      seeds: {
         directory: `${__dirname}/db/seeds`
      }
   },

   staging: {
      client: 'mysql2',
      connection: {
         
      },
      pool: {
         min: 2,
         max: 10
      },
      migrations: {
         tableName: 'knex_migrations',
         directory: `${__dirname}/db/migrations`
      },
      seeds: {
         directory: `${__dirname}/db/seeds`
      }
   },

   production: {
      client: 'mysql2',
      connection: {
       
      },
      pool: {
         min: 2,
         max: 10
      },
      migrations: {
         tableName: 'knex_migrations'
      }
   }

};

'use strict';

var JWTStrategy = require('passport-jwt').Strategy,
   ExtractJwt = require('passport-jwt').ExtractJwt;

var User = require('./../models/user'),
   config = require('./../config');

// Hooks the JWT Strategy.
function hookJWTStrategy(passport) {
   var options = {};

   options.secretOrKey = config.keys.secret;
   //options.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
   //options.authScheme = 'WMJWT';
   options.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme(config.keys.tokenKey);
   options.ignoreExpiration = false;

   passport.use(new JWTStrategy(options, function (JWTPayload, callback) {
      if(JWTPayload.store_id != undefined && JWTPayload.user_id != undefined){
         let sDeviceUuid = (JWTPayload.device_uuid != undefined) ? JWTPayload.device_uuid : '';
         let user = {
            user_id : parseInt(JWTPayload.user_id),
            store_id : parseInt(JWTPayload.store_id),
            device_uuid : sDeviceUuid
         };
         callback(null, user);
      } else {
         callback(null, false);
         return;
      }
      /*
      User.findOneByIdAndStoreId({ user_id: JWTPayload.user_id, store_id: JWTPayload.store_id })
         .then(function (user) {
            if (!user) {
               callback(null, false);
               return;
            }

            callback(null, user);
         });
      */
   }));
}

module.exports = hookJWTStrategy;
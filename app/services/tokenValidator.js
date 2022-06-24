'use strict';

var jwt = require('jsonwebtoken');
var config = require('../config');
const User = require('../models/user');

const {
   getClientIP
} = require('../helpers/stringHelper');

exports.validateToken = function (oPassport, callback) {

   function checkUser(req, res, next) {
      oPassport.authenticate('jwt', { session: false }, 
         async function (err, user, info) {
            if (err) {
               console.error(info);
               return next(err);
            }
            if (!user) {
               if(req.headers['refresh-token'] != undefined){
                  let sRefreshToken = req.headers['refresh-token'];
                  let oRes = await User.checkRefreshToken(sRefreshToken);
                  if(oRes != undefined && Object.keys(oRes).length > 0){
                     var token = jwt.sign({ store_id: oRes.store_id, user_id: oRes.user_id, device_uuid: oRes.device_uuid },
                        config.keys.secret, { expiresIn: config.keys.tokenExpireTime }
                     );
                     let sToken = config.keys.tokenKey + ' ' + token;
                     //let sIpAddress = getClientIP(req);
                     await User.updateUserToken({token : sToken}, oRes.user_id, oRes.device_uuid);
                     res.set('refreshed-token', sToken);
                     res.set('Access-Control-Expose-Headers', 'refreshed-token');
                     
                     req.user = {};
                     req.user.user_id = oRes.user_id;
                     req.user.store_id = oRes.store_id;
                     callback(req, res, next);
                     return;
                  } else {
                     console.error('Invalid Refresh Token');
                     console.error(info);
                  }
               }
               return res.status(401).json({ status: 'error', code: 'LOGOUT', message: 'Unauthorized : Relogin required!' });
            } else {
               req.user = user;
               callback(req, res, next);
            }
         })(req, res, next);
   }

   return checkUser;
};
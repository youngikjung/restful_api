'use strict';

exports.allowOnly = function (accessLevel, callback) {
   function checkUserRole(req, res, next) {
      //if(!(accessLevel & req.user.role)) {
      //   res.sendStatus(403);
      //   return;
      //}

      callback(req, res, next);
   }

   return checkUserRole;
};
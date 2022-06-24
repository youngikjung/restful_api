'use strict';

var jwt = require('jsonwebtoken');
var randtoken = require('rand-token').generator({
    chars: "0-9"
});

var bcrypt = require('bcryptjs');

const pdf = require('html-pdf');
const fs = require('fs');
const axios = require("axios");
const xml2js = require('xml2js')
const moment = require('moment-timezone');
require('moment/locale/ko');

const hashPassword = password => bcrypt.hash(password, SALT_ROUNDS);
const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

var config = require('../../config');
const User = require('../../models/user');
const Store = require('../../models/store');
const Worker = require('../../models/worker');

const {
   createError,
   BAD_REQUEST,
   UNAUTHORIZED,
   UNPROCESSABLE,
   CONFLICT,
   NOT_FOUND,
   GENERIC_ERROR
} = require('../../helpers/errorHelper');

const {
   adminConfirmMail
} = require('../../helpers/emailSender');

const {
   breakString,
   mysqlDateToYMD,
   getCurrentDatetime,
   getClientIP
} = require('../../helpers/stringHelper');

var oValidate = require("validate.js");
const { async } = require('validate.js');

const multer = require('multer');
const storage = multer.diskStorage({
   destination:  process.cwd() + '/private/documents',
   filename: function (req, file, cb) {
      cb(null, `${file.fieldname}_${Date.now()}`);
   }
})

const upload = multer({
   storage: storage
}).single("documents");

// The authentication controller.
var AdminAuthController = {};

// Authenticate a user.
AdminAuthController.authenticateUser = async (req, res, next) => {
    const sId = req.body.id;
    const sParam = req.body.sParam;
    
    let oResult = {
        resultCd: "9999"
    };
    try {
        const checkUser = await Worker.findOne(sId);
        if(checkUser !== undefined && checkUser !== null){
            if(sParam === "confirm"){
                const sPassword = req.body.password;
                if(checkUser.token !== undefined && checkUser.token !== null){
                    if(checkUser.token.toString() === sPassword.toString()){
                        oResult.resultCd = "0000";
                    } else {
                        oResult.resultCd = "2222";
                    }
                }
            } else {
               const token = randtoken.generate(6);
               const result = await adminConfirmMail(checkUser.email,token);
               if(result){
                  await Worker.updateToken(sId,token);
   
                  oResult.resultCd = "0000";
                  oResult.email = checkUser.email
                  oResult.userId = checkUser.user_id
                  oResult.roll = checkUser.roll
                  oResult.team = checkUser.team
                  oResult.full_name = checkUser.full_name
                  oResult.birthday = checkUser.birthday
               }
            }
        } else {
            oResult.resultCd = "1111";
        }
        
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}

AdminAuthController.documents = async (req, res, next) => {
   let oResult = {};
   try {
      await upload( req, res, (err) => {
         if (err) {
            console.log("err", err);
            res.status(200).json(oResult);
         } else {
            if(req.file != undefined && req.file != null){
               if(req.file.filename != undefined && req.file.filename != null){
                  oResult.file_name = req.file.filename;
                  oResult.full_path = 'private/documents/' + req.file.filename;
               }
            }

            res.status(200).json(oResult);
         }
      });
   } catch (error) {
      console.log("error",error);
      res.status(200).json(oResult);
   }
}




module.exports = AdminAuthController;
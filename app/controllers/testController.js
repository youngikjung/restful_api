'use strict';

var jwt = require('jsonwebtoken');
var config = require('../config');

const nodemailer = require("nodemailer");
const CryptoJS = require('crypto-js');
const crypto = require("crypto");
const axios = require('axios').default;
const ExcelJS = require('exceljs');
const fs = require('fs');
const moment = require('moment-timezone');
require('moment/locale/ko');

const {
   createError,
   BAD_REQUEST,
   UNAUTHORIZED,
   UNPROCESSABLE,
   CONFLICT,
   NOT_FOUND,
   GENERIC_ERROR
} = require('../helpers/errorHelper');

const helpers = require('../helpers/imageHelper');

const {
   convertToKRW,
   mysqlDateToYMD,
   padString,
   getCurrentDatetime
} = require('../helpers/stringHelper');

const {
    oFirebaseAdminAppPos,
    oFirebaseAdminApp,
    oFirebaseAdminAppCeo
} = require('../services/firebaseAdmin');

const {
   testerEmail
} = require('../helpers/emailSender');

var oValidate = require("validate.js");

const { async } = require('validate.js');
const User = require('../models/user');
const Store = require('../models/store');

// The admin controller.
var TestController = {}

TestController.index = function (req, res) {
   res.status(200).json({ message: 'Welcome to the store area !' });
}

TestController.insertMerchantPoint = async (req, res) => {
    let iResult = {
        count: 0,
        total: 0,
        result : false
    }
    let tempCount = 0;
    try {
        const getData = await Store.getStoreWithoutCommercialPoint();
        if(getData.length > 0){
            for await (const iterator of getData) {
                const result = await Store.insertNoCommercialPoint(iterator.store_id,iterator.merchant_id);
                if(result !== undefined){
                    tempCount += 1;
                }
            }
            iResult.result = true;
            iResult.total = getData.length;
            iResult.count = tempCount;
        }
    } catch (error) {
        console.log("TestController.insertMerchantPoint error",error);
    }

    res.status(200).json(iResult);
}

TestController.sendAppPushMessage = async (req, res) => {
    const resquestModal = req.body.order;
    const reqTitle = req.body.title;
    const reqContent = req.body.content;
    try {
        let bSendDataResult;
        let result = [];
        if(resquestModal !== undefined){
            if(resquestModal == "personal"){
                result = await User.testGetAppPushToken();
            } else {
                result = await User.getAppPushToken();
            }
            if(result.length > 0){
                for await (const iterator of result) {
                    if(iterator.token !== undefined && iterator.token !== null && iterator.token !== ""){
                        const oDataMessage = {
                            token: iterator.token,
                            data: {
                                title: reqTitle,
                                body: reqContent
                            },
                            notification: {
                                title: reqTitle,
                                body: reqContent
                            },
                        };
                        await oFirebaseAdminApp.messaging()
                              .send(oDataMessage)
                              .then((response) => {
                                  console.log("response",response);
                                  return true
                              })
                              .catch((error) => {
                                  console.log("error",error);
                                  return false
                              });
                    }

                }
            }
        }
    } catch (error) {
        console.log("TestController.sendAppPushMessage error",error);
    }

    res.status(200).json(true);
}

TestController.senderEmail = async (req, res) => {
    const toUser = req.body.toAddress;
    let oResult = false;
    try {
        const mailSender = await testerEmail(toUser);
        if(mailSender){
            oResult = true;
        }
    } catch (error) {
        console.log("TestController.senderEmail error",error);
    }

    res.status(200).json(oResult);
}


module.exports = TestController;

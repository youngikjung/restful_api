'use strict';

var jwt = require('jsonwebtoken');
var randtoken = require('rand-token');

var bcrypt = require('bcryptjs');

const CryptoJS = require('crypto-js');
const { v1: uuidv1 } = require('uuid');
const pdf = require('html-pdf');
const aligoapi = require('aligoapi');
const fs = require('fs');
const axios = require("axios");
const xml2js = require('xml2js')
const moment = require('moment-timezone');
require('moment/locale/ko');

// Bcrypt functions used for hashing password and later verifying it.
const SALT_ROUNDS = 10;
const hashPassword = password => bcrypt.hash(password, SALT_ROUNDS);
const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

var config = require('../../config');
const Home = require('../../models/home');
const User = require('../../models/user');
const Store = require('../../models/store');
const Sales = require('../../models/sales');
const Order = require('../../models/order');
const Management = require('../../models/management');

const {
    oFirebaseAdminAppPos,
    oFirebaseAdminApp,
    oFirebaseAdminAppCeo
} = require('../../services/firebaseAdmin');

const {
    welcomeEmailStore,
    completeSignUpEmail
} = require('../../helpers/emailSender');

const {
    sendAlertMessage,
} = require('../../batch/job/checkUser');

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
    convertToKRW,
    breakString,
    mysqlDateToYMD,
    getCurrentDatetime,
    getClientIP
} = require('../../helpers/stringHelper');

var oValidate = require("validate.js");
const { async } = require('validate.js');

const average = arr => arr.reduce((p, c) => p + c, 0) / arr.length;

async function* asyncGenerator(sIndex) {
    let count = 0;
    while (count < sIndex) 
    yield count++;
};

const userTargetPushMessage = async (oNotiMessage) => {
    const res =  await  oFirebaseAdminApp.messaging()
                        .send(oNotiMessage)
                        .then((response) => {
                            return true
                        })
                        .catch((error) => {
                            console.log("error",error);
                            return false
                        });
    console.log("res",res);   
    return res; 
}

// const posTargetPushMessage = async (oNotiMessage) => {
//     const res =  await  oFirebaseAdminAppPos.messaging()
//                         .send(oNotiMessage)
//                         .then((response) => {
//                             return true
//                         })
//                         .catch((error) => {
//                             console.log("error",error);
//                             return false
//                         });
//     console.log("res",res);   
//     return res;                 
// }

// const ceoTargetPushMessage = async (oNotiMessage) => {
//     const res =  await  oFirebaseAdminAppCeo.messaging()
//                         .send(oNotiMessage)
//                         .then((response) => {
//                             return true
//                         })
//                         .catch((error) => {
//                             console.log("error",error);
//                             return false
//                         });
//     console.log("res",res);   
//     return res; 
// }

// The authentication controller.
var StampController = {};

StampController.sealOfApproval = async (req, res) => {
    let oNotiMessage = {
        data: {
            title: "고객님 스탬프가 발행되었습니다.",
            body: "주문하신 매장에 스탬프가 발행되었습니다.",
            type: "publish_stamp",
            order_id: 0,
            user_id: 0,
            store_id: 0,
        },
        notification: {
            title: "고객님 스탬프가 발행되었습니다.",
            body: "주문하신 매장에 스탬프가 발행되었습니다."
        },
        android: {
            priority: "high",
            ttl: 3600 * 1000,
            notification: {
                channelId: "throo_app_alarm"
            },
        },
    };
    let sResult = false;
    let process1 = false;
    let process2 = false;
    let process3 = false;
    let sCount = 0;
    let stampId = "";
    let stampMinAmount = 0;
    let stampCouponId = "";
    let stampState = "";
    let stampStartDate = "";
    let stampEndDate = "";
    let userId = "";
    let storeId = "";
    let storeName = "";
    let paymentPrice = "";
    
    try {
        const orderId = req.body.orderId;
        const startDate = moment().format('YYYY-MM-DD');
        const getList = await Order.getOrderDetailByOrderId(parseInt(orderId));
        if(getList.length > 0){
            if(getList[0].user_id !== undefined && getList[0].store_id !== undefined && getList[0].total_amount_excl !== undefined){
                if(parseInt(getList[0].total_amount_excl) > 0){
                    userId = getList[0].user_id;
                    storeId = getList[0].store_id;
                    paymentPrice = getList[0].total_amount_excl;
                    storeName = getList[0].store_name;
                    process1 = true;
                }
            }
        }
        
        if(process1){
            const storeStampEvent = await Store.isStampEvent(parseInt(storeId),startDate);
            if(storeStampEvent.length > 0){
                stampId = storeStampEvent[0].stamp_id;
                stampCouponId = storeStampEvent[0].stamp_coupon_id;
                stampState = storeStampEvent[0].status;
                stampMinAmount = storeStampEvent[0].minimum_amount;
                stampStartDate = moment(storeStampEvent[0].start_date).format("YYYY-MM-DD");
                stampEndDate = moment(storeStampEvent[0].end_date).format("YYYY-MM-DD");
                process2 = true;
            }
        }

        if(process2){
            if(parseInt(stampState) > 0){
                process3 = true;
            } else {
                const getUserStempList = await User.getUserStempListByStore(parseInt(userId),parseInt(storeId));
                if(getUserStempList.length > 0){
                    process3 = true;
                }
            }
        }
        
        if(process3){
            if(parseInt(stampMinAmount) <= parseInt(paymentPrice)){
                sCount = parseInt(parseInt(paymentPrice) / parseInt(stampMinAmount));
                for await (const letter of asyncGenerator(parseInt(sCount))) {
                    await User.publishStamp(parseInt(storeId),parseInt(userId),parseInt(orderId),parseInt(stampMinAmount),stampEndDate,stampId);
                }

                const getPushToken = await Order.getUserPushToken(parseInt(userId));
                if(getPushToken.length > 0){
                    for await (const e of getPushToken) {
                        if(e.token !== undefined && e.token !== null && e.token !== ""){
                            oNotiMessage.data.title = `${storeName.toString()}점 스탬프가 발급되었습니다.`;
                            oNotiMessage.data.body = `고객님, 오늘 스탬프 ${sCount.toString()}개를 적립하셨습니다. 감사합니다.`;
                            oNotiMessage.data.order_id = orderId.toString();
                            oNotiMessage.data.user_id = userId.toString();
                            oNotiMessage.data.store_id = storeId.toString();
                            oNotiMessage.notification.title = `${storeName.toString()}점 스탬프가 발급되었습니다.`;
                            oNotiMessage.notification.body = `고객님, 오늘 스탬프 ${sCount.toString()}개를 적립하셨습니다. 감사합니다.`;
                            oNotiMessage.token = e.token.toString();
                            await userTargetPushMessage(oNotiMessage);
                        }
                    }
                }
            }
        }

    } catch (error) {
        console.log("sealOfApproval errr",error);
    }

    res.status(200).json(sResult);
}


module.exports = StampController;
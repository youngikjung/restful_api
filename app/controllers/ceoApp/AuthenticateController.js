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

const storeOperationTime = async (iCount,storeId) => {
    let result = {}
    let temp = {}
    let tempList = {}
    let is_temp = false;
    let tempDay = "일요일";

    const todayHour = moment().format("YYYY-MM-DD HH:mm");
    const opening_time = moment(iCount.opening_time, "HH:mm").format("YYYY-MM-DD HH:mm");
    const closing_time = moment(iCount.closing_time, "HH:mm").format("YYYY-MM-DD HH:mm");
    const amIBetween = moment(todayHour).isBetween(opening_time , closing_time);
    if(amIBetween){
        const getCongestionTime = await Store.getCongestionTime(parseInt(storeId),iCount.congestion_type);
        console.log("getCongestionTime",getCongestionTime);
        if(getCongestionTime !== undefined){
            console.log("getCongestionTime[0]",getCongestionTime[0]);
            temp.min = getCongestionTime.minute;
            console.log("temp.min",temp.min);
        } else {
            temp.min = 0;
        }
        temp.operation = iCount.opening_time + "~" + iCount.closing_time;
        temp.opening_time = iCount.opening_time;
        temp.closing_time = iCount.closing_time;
        is_temp = true;
    } 

    if(is_temp){
        result.temp = temp;
    }
    
    if (iCount.day_of_week > 0 && iCount.day_of_week < 2){
        tempDay = "월요일";
    } else if (iCount.day_of_week > 1 && iCount.day_of_week < 3){
        tempDay = "화요일";
    } else if (iCount.day_of_week > 2 && iCount.day_of_week < 4){
        tempDay = "수요일";
    } else if (iCount.day_of_week > 3 && iCount.day_of_week < 5){
        tempDay = "목요일";
    } else if (iCount.day_of_week > 4 && iCount.day_of_week < 6){
        tempDay = "금요일";
    } else if (iCount.day_of_week > 5 && iCount.day_of_week < 7){
        tempDay = "토요일";
    } else if (iCount.day_of_week > 6 && iCount.day_of_week < 8){
        tempDay = "매일";
    } else if (iCount.day_of_week > 7 && iCount.day_of_week < 9){
        tempDay = "평일";
    } else if (iCount.day_of_week > 8 && iCount.day_of_week < 10){
        tempDay = "주말";
    }
    tempList.day = tempDay;
    tempList.operation = iCount.opening_time + "~" + iCount.closing_time;
    result.tempList = tempList;

    return result;
}

const beforeSave = user => {
    if (!user.password) return Promise.resolve(user)
 
    // `password` will always be hashed before being saved.
    return hashPassword(user.password)
       .then(hash => ({ ...user, password: hash }))
       .catch(err => `Error hashing password: ${err}`)
 }

 
const average = arr => arr.reduce((p, c) => p + c, 0) / arr.length;


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

const posTargetPushMessage = async (oNotiMessage) => {
    const res =  await  oFirebaseAdminAppPos.messaging()
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

const ceoTargetPushMessage = async (oNotiMessage) => {
    const res =  await  oFirebaseAdminAppCeo.messaging()
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

// The authentication controller.
var AuthController = {};

AuthController.authenticateUserChangePwd = async (req, res) => {
    let sResult = {
        resultCd: "9999",
        resultMsg: "네트워크 에러입니다 나중에 다시 시도바랍니다.",
    };
    try {
        const sId = req.body.sId;
        const sPhone = req.body.sPhone;
        const userPwd = req.body.userPwd;
        const userCheckPwd = req.body.userCheckPwd;

        if(userPwd.toString() === userCheckPwd.toString()){
            const resultCheck = await Store.authenticateUserCheckPwd(sId,sPhone);
            if(resultCheck.length > 0){
                const convertTo = await beforeSave({ password: userPwd });
                const result = await Sales.editStorePw(parseInt(resultCheck[0].store_id),convertTo.password);
                if(result !== undefined && result !== null){
                    sResult.resultCd = "0000";
                }
            } else {
                sResult.resultMsg = "잘못된 정보입니다."
            }
        } else {
            sResult.resultMsg = "비밀번호를 다시 확인해주세요"
        }
    } catch (error) {
        console.log("authenticateUserCheckPwd errr",error);
    }

    res.status(200).json(sResult);
}

AuthController.authenticateUserCheckPwd = async (req, res) => {
    let sResult = {
        resultCd: "9999",
        resultMsg: "네트워크 에러입니다 나중에 다시 시도바랍니다.",
    };
    try {
        const sId = req.body.sId;
        const sPhone = req.body.sPhone;

        const result = await Store.authenticateUserCheckPwd(sId,sPhone);
        if(result.length > 0){
            sResult.resultCd = "0000";
        } else {
            sResult.resultMsg = "해당 아이디의 매장이 없습니다."
        }
    } catch (error) {
        console.log("authenticateUserCheckPwd errr",error);
    }

    res.status(200).json(sResult);
}

AuthController.authenticateUserCheckId = async (req, res) => {
    let sResult = {
        resultCd: "9999",
        resultMsg: "네트워크 에러입니다 나중에 다시 시도바랍니다.",
    };
    try {
        const sId = req.body.sId;
        const sPhone = req.body.sPhone;
        const sOwner = req.body.sOwner;

        const result = await Store.authenticateUserCheckId(sId,sOwner,sPhone);
        if(result.length > 0){
            sResult.resultCd = "0000";
            sResult.id = result[0].email;
        } else {
            sResult.resultMsg = "등록된 아이디가 없습니다."
        }
    } catch (error) {
        console.log("authenticateUserCheckId errr",error);
    }

    res.status(200).json(sResult);
}

AuthController.checkupPushToken = async (req, res) => {
    let sResult = false;

    try {
        const storeId = req.body.store_id;
        const uniqueId = req.body.uniqueId;
        let checkupPushToken = await Sales.checkupPushToken(uniqueId,parseInt(storeId));
        if (checkupPushToken.length > 0) {
            sResult = true;
        }
    } catch (error) {
        console.log("checkupPushToken errr",error);
    }

    res.status(200).json(sResult);
}

AuthController.storePause = async (req, res) => {
    let sResult = false;

    try {
        const storeId = req.body.store_id;
        let sGetStoreDesc = await Store.storePause(parseInt(storeId));
        if (sGetStoreDesc != undefined && sGetStoreDesc != '') {
            if(sGetStoreDesc['pause'].toString() === "1"){
                sResult = true;
            }
        }
    } catch (error) {
        console.log("storeStampDelete errr",error);
    }

    res.status(200).json(sResult);
}

AuthController.storeStampChangeState = async (req, res) => {
    let sResult = false;
    let sValidate = 1;

    try {
        const storeId = req.body.store_id;
        const stampId = req.body.stampId;
        const status = req.body.status;

        if(status){
            sValidate = 0;
        }
        await Store.storeStampChangeState(parseInt(storeId),parseInt(stampId),sValidate);
    } catch (error) {
        console.log("storeStampDelete errr",error);
    }

    res.status(200).json(sResult);
}

AuthController.storeStampDelete = async (req, res) => {
    let sResult = false;

    try {
        const storeId = req.body.store_id;
        const stampId = req.body.stampId;
        await Store.storeStampDelete(parseInt(storeId),parseInt(stampId));
    } catch (error) {
        console.log("storeStampDelete errr",error);
    }

    res.status(200).json(sResult);
}

AuthController.storeStampEdit = async (req, res) => {
    let sResult = {
        resultCd: "9999",
        resultMsg: "네트워크 에러입니다, 잠시 후 다시 시도바랍니다.",
    };
    let process = true;
    let description = "";
    let fromDate = moment().format("YYYY-MM-DD");
    let toDate = "";

    try {
        const storeId = req.body.store_id;
        const name = req.body.nm;
        const period = req.body.period;
        const minAmount = req.body.minAmount;
        const targetValue = req.body.targetValue;
        const partner_discount = req.body.partnerDiscount;
        const stampId = req.body.stampId;
        const stampCouponId = req.body.stampCouponId;
        
        if(name === undefined || name === null || name === ""){
            sResult.resultMsg = "명칭을 입력해주세요."
            process = false;
        }
        if(period === undefined || period === null || period === ""){
            sResult.resultMsg = "유효기간을 입력해주세요."
            process = false;
        }
        if(minAmount === undefined || minAmount === null || minAmount === ""){
            sResult.resultMsg = "최소주문금액을 입력해주세요."
            process = false;
        }
        if(targetValue === undefined || targetValue === null || targetValue === ""){
            sResult.resultMsg = "스탬프목표갯수를 입력해주세요."
            process = false;
        }

        const stampUserCount = await Store.stampUserCount(parseInt(storeId),parseInt(stampId));
        if(stampUserCount.length > 0){
            sResult.resultMsg = "이미 스탬프를 받은 고객이 존재합니다."
            process = false;
        }

        if(process){
            if(period.toString() === "6"){
                toDate = moment().add(6, 'M').format("YYYY-MM-DD");
            } else if (period.toString() === "12"){
                toDate = moment().add(12, 'M').format("YYYY-MM-DD");
                
            } else if (period.toString() === "24"){
                toDate = moment().add(24, 'M').format("YYYY-MM-DD");
                
            } else if (period.toString() === "0"){
                toDate = moment().add(60, 'M').format("YYYY-MM-DD");
            }
            const sIpAddress = await getClientIP(req);
            description = req.body.description + ":" + storeId + ":" + ((sIpAddress !== undefined && sIpAddress !== null) ? sIpAddress.toString() : "getIPfail");
            const result = await Store.storeStampEditor(parseInt(storeId),parseInt(partner_discount),name,description,fromDate,toDate,parseInt(minAmount),parseInt(targetValue),parseInt(period),parseInt(stampId),parseInt(stampCouponId));
            if(result === "0000"){
                sResult.resultCd = "0000";
            } else {
                console.log("storeStampInsert error code: ====>",result);
            }
        }
    } catch (error) {
        console.log("storeStampInsert error",error);
    }

    res.status(200).json(sResult);
}

AuthController.storeStampInsert = async (req, res) => {
    let sResult = {
        resultCd: "9999",
        resultMsg: "네트워크 에러입니다, 잠시 후 다시 시도바랍니다.",
    };
    let process = true;
    let description = "";
    let fromDate = moment().format("YYYY-MM-DD");
    let toDate = "";

    try {
        const storeId = req.body.store_id;
        const name = req.body.nm;
        const period = req.body.period;
        const minAmount = req.body.minAmount;
        const targetValue = req.body.targetValue;
        const partner_discount = req.body.partnerDiscount;

        if(name === undefined || name === null || name === ""){
            sResult.resultMsg = "명칭을 입력해주세요."
            process = false;
        }
        if(period === undefined || period === null || period === ""){
            sResult.resultMsg = "유효기간을 입력해주세요."
            process = false;
        }
        if(minAmount === undefined || minAmount === null || minAmount === ""){
            sResult.resultMsg = "최소주문금액을 입력해주세요."
            process = false;
        }
        if(targetValue === undefined || targetValue === null || targetValue === ""){
            sResult.resultMsg = "스탬프목표갯수를 입력해주세요."
            process = false;
        }

        if(process){
            if(period.toString() === "6"){
                toDate = moment().add(6, 'M').format("YYYY-MM-DD");
            } else if (period.toString() === "12"){
                toDate = moment().add(12, 'M').format("YYYY-MM-DD");
                
            } else if (period.toString() === "24"){
                toDate = moment().add(24, 'M').format("YYYY-MM-DD");
                
            } else if (period.toString() === "0"){
                toDate = moment().add(60, 'M').format("YYYY-MM-DD");
            }
            const sIpAddress = await getClientIP(req);
            description = req.body.description + ":" + storeId + ":" + ((sIpAddress !== undefined && sIpAddress !== null) ? sIpAddress.toString() : "getIPfail");
            const result = await Store.storeStampMaker(parseInt(storeId),parseInt(partner_discount),name,description,fromDate,toDate,parseInt(minAmount),parseInt(targetValue),parseInt(period));
            if(result === "0000"){
                sResult.resultCd = "0000";
            } else {
                console.log("storeStampInsert error code: ====>",result);
            }
        }
    } catch (error) {
        console.log("storeStampInsert error",error);
    }

    res.status(200).json(sResult);
}

AuthController.storeCouponList = async (req, res) => {
    let sResult = [];

    try {
        const storeId = req.params.store_id;
        const result = await Store.storeCouponList(parseInt(storeId));
        if(result.length > 0){
            for await (const iterator of result) {
                let temp = {};
                temp.id = iterator.coupon_id;
                temp.name = iterator.name;
                temp.couponCount = iterator.count_limit;
                temp.fromDate = moment(iterator.start_date).format("YYYY-MM-DD");
                temp.toDate = moment(iterator.end_date).format("YYYY-MM-DD");

                const is_before = moment().isBefore(temp.toDate);
                console.log("is_before",is_before);
                console.log("temp.toDate",temp.toDate);
                console.log("today",moment());
                if(is_before){
                    temp.expired = false;
                } else {
                    temp.expired = true;
                }

                if(parseInt(iterator.requirement) > 0){
                    temp.limitAmount = parseInt(iterator.requirement);
                } else {
                    temp.limitAmount = 0;
                }

                if(parseInt(iterator.type_id) > 0){
                    temp.type = "percent";
                    if(parseInt(iterator.percent) > 0){
                        temp.percent = parseInt(iterator.percent);
                    } else {
                        temp.percent = 0;
                    }
                    if(iterator.max_discount !== undefined  && iterator.max_discount !== null && parseInt(iterator.max_discount) > 0){
                        temp.maxlimitAmount = parseInt(iterator.max_discount);
                    } else {
                        temp.maxlimitAmount = 0;
                    }
                } else {
                    temp.type = "amount";
                    if(parseInt(iterator.partner_discount) > 0){
                        temp.amount = parseInt(iterator.partner_discount);
                    } else {
                        temp.amount = 0;
                    }
                }
                

                const countNm = await Store.couponUserDownload(parseInt(iterator.coupon_id));
                if(countNm.length > 0){
                    temp.userCount = countNm[0].nm
                } else {
                    temp.userCount = 0;
                }

                sResult.push(temp);
            }
        }
    } catch (error) {
        console.log("storeCouponList error",error);
    }

    res.status(200).json(sResult);
}

AuthController.storeStampList = async (req, res) => {
    let sResult = {
        sList: [],
        isLock: false,
    };
    let sCount = 0;

    try {
        const storeId = req.params.store_id;
        const result = await Store.storeStampList(parseInt(storeId));
        if(result.length > 0){
            for await (const iterator of result) {
                let temp = {};
                temp.id = iterator.stamp_id;
                temp.couponId = iterator.stamp_coupon_id;
                temp.name = iterator.title;
                temp.couponCount = parseInt(iterator.minimum_amount);
                temp.target = parseInt(iterator.completion_value);
                temp.fromDate = moment(iterator.start_date).format("YYYY-MM-DD");
                temp.toDate = moment(iterator.end_date).format("YYYY-MM-DD");
                
                if(iterator.status.toString() === "1"){
                    temp.validate = true;
                } else {
                    temp.validate = false;
                }
                if(iterator.date_value.toString() === "6"){
                    temp.period = 6;
                    temp.periodNm = "발행일로부터 6개월";
                } else if (iterator.date_value.toString() === "12"){
                    temp.period = 12;
                    temp.periodNm = "발행일로부터 12개월";
                } else if (iterator.date_value.toString() === "24"){
                    temp.period = 24;
                    temp.periodNm = "발행일로부터 24개월";
                } else if (iterator.date_value.toString() === "0"){
                    temp.period = 0;
                    temp.periodNm = "제한없음";
                }


                if(parseInt(iterator.partner_discount) > 0){
                    temp.amount = parseInt(iterator.partner_discount);
                } else {
                    temp.amount = 0;
                }
                const is_before = moment().isBefore(temp.toDate);
                if(is_before){
                    temp.expired = false;
                    if(iterator.edited_At !== undefined && iterator.edited_At !== null){
                        temp.edited = true;
                    } else {
                        temp.edited = false;
                    }
                } else {
                    temp.expired = true;
                }

                const stampUserCount = await Store.stampUserCount(parseInt(storeId),parseInt(iterator.stamp_id));
                if(stampUserCount.length > 0){
                    let tempCount = 0;
                    for await (const sCount of stampUserCount) {
                        tempCount += 1;
                    }
                    temp.userEvent = tempCount;

                } else {
                    temp.userEvent = 0;
                }

                const countNm = await Store.stampUserDownload(parseInt(iterator.stamp_coupon_id));
                if(countNm.length > 0){
                    temp.userCount = countNm[0].nm
                } else {
                    temp.userCount = 0;
                }

                if(!temp.expired && !temp.edited){
                    sCount += 1;
                }

                sResult.sList.push(temp);
            }

            if(parseInt(sCount) > 0){
                sResult.isLock = true;
            } else {
                sResult.isLock = false;
            }
        }
    } catch (error) {
        console.log("storeCouponList error",error);
    }

    res.status(200).json(sResult);
}

AuthController.storeCouponDelete = async (req, res) => {
    let sResult = false;

    try {
        const storeId = req.body.store_id;
        const couponId = req.body.couponId;
        await Store.storeCouponDelete(parseInt(storeId),parseInt(couponId));
    } catch (error) {
        console.log("storeCouponDelete errr",error);
    }

    res.status(200).json(sResult);
}

AuthController.storeCouponDeleteV2 = async (req, res) => {
    let sResult = {
        resultCd: "9999",
        resultMsg: "네트워크 에러입니다, 잠시 후 다시 시도바랍니다."
    };

    try {
        const storeId = req.body.store_id;
        const couponId = req.body.couponId;
        const checkout = await Store.checkOutStampCoupon(parseInt(storeId),parseInt(couponId));
        if(checkout.length > 0){
            sResult.resultMsg = "스탬프 쿠폰은 삭제가 불가능합니다."
        } else {
            await Store.storeCouponDelete(parseInt(storeId),parseInt(couponId));
            sResult.resultCd = "0000";
        }
    } catch (error) {
        console.log("storeCouponDelete errr",error);
    }

    res.status(200).json(sResult);
}

AuthController.storeCouponInsert = async (req, res) => {
    let sResult = {
        resultCd: "9999",
        resultMsg: "네트워크 에러입니다, 잠시 후 다시 시도바랍니다.",
    };
    let process = true;
    let name = "";
    let count_limit = 999999999;
    let partner_discount = 0;
    let requirement = 0;
    let description = "";

    try {
        const couponName = req.body.cNm;
        const couponCount = req.body.couponCount;
        const countType = req.body.countType;
        const couponPercent = req.body.sPercent;
        const couponAmount = req.body.cAmount;
        const couponType = req.body.couponType;
        const limitAmount = req.body.limitAmount;
        const couponIsLimitAmount = req.body.sLimitAmount;
        const sMaxAmount = req.body.sMaxAmount;
        const startDate = req.body.startDate;
        const endDate = req.body.endDate;
        const storeId = req.body.store_id;
        
        if(couponName !== undefined && couponName !== null && couponName !== ""){
            name = couponName;
        } else {
            process = false;
            sResult.resultMsg = "쿠폰명을 입력해주세요";
        }
        
        if(countType !== undefined && countType !== null && countType !== "unlimit"){
            if(couponCount !== undefined && couponCount !== null){
                count_limit = parseInt(couponCount) > 0 ? parseInt(couponCount) : 0;
            } else {
                sResult.resultMsg = "쿠폰수량을 입력해주세요";
                process = false;
            }
        }
        
        if(couponType === "amount"){
            if(couponAmount !== undefined && couponAmount !== null){
                partner_discount = parseInt(couponAmount) > 0 ? parseInt(couponAmount) : 0;
            } else {
                process = false;
                sResult.resultMsg = "할인금액을 입력해주세요";
            }
        } else {
            process = false;
        }
        
        if(limitAmount){
            if(couponIsLimitAmount !== undefined && couponIsLimitAmount !== null){
                requirement = parseInt(couponIsLimitAmount) > 0 ? parseInt(couponIsLimitAmount) : 0;
            } else {
                process = false;
                sResult.resultMsg = "최소금액을 입력해주세요";
            }
        }
        
        if(process){
            const sIpAddress = await getClientIP(req);
            description = req.body.description + ":" + storeId + ":" + ((sIpAddress !== undefined && sIpAddress !== null) ? sIpAddress.toString() : "getIPfail");
            const result = await Store.storeCouponInsert(parseInt(storeId),partner_discount,partner_discount,requirement,count_limit,name,description,startDate,endDate);
            if(result !== undefined){
                await Store.storeCouponConnect(parseInt(storeId),result[0]);
                sResult.resultCd = "0000";
            }
        }
        console.log("sResult",sResult);
    } catch (error) {
        console.log("storeCouponInsert error",error);
    }

    res.status(200).json(sResult);
}


AuthController.storeCouponInsertV2 = async (req, res) => {
    let sResult = {
        resultCd: "9999",
        resultMsg: "네트워크 에러입니다, 잠시 후 다시 시도바랍니다.",
    };
    let process = true;
    let name = "";
    let count_limit = 999999999;
    let partner_discount = 0;
    let requirement = 0;
    let description = "";
    let result = null;
    let maxLimit = null;
    
    try {
        const couponName = req.body.cNm;
        const couponCount = req.body.couponCount;
        const countType = req.body.countType;
        const couponPercent = req.body.sPercent;
        const couponAmount = req.body.cAmount;
        const couponType = req.body.couponType;
        const limitAmount = req.body.limitAmount;
        const couponIsLimitAmount = req.body.sLimitAmount;
        const sMaxAmount = req.body.sMaxAmount;
        const startDate = req.body.startDate;
        const endDate = req.body.endDate;
        const storeId = req.body.store_id;
        
        if(couponName !== undefined && couponName !== null && couponName !== ""){
            name = couponName;
        } else {
            process = false;
            sResult.resultMsg = "쿠폰명을 입력해주세요";
        }
        
        if(countType !== undefined && countType !== null && countType !== "unlimit"){
            if(couponCount !== undefined && couponCount !== null){
                count_limit = parseInt(couponCount) > 0 ? parseInt(couponCount) : 0;
            } else {
                sResult.resultMsg = "쿠폰수량을 입력해주세요";
                process = false;
            }
        }
        
        if(couponType === "amount"){
            if(couponAmount !== undefined && couponAmount !== null){
                partner_discount = parseInt(couponAmount) > 0 ? parseInt(couponAmount) : 0;
            } else {
                process = false;
                sResult.resultMsg = "할인금액을 입력해주세요";
            }
        } else {
            if(couponPercent !== undefined && couponPercent !== null){
                partner_discount = parseInt(couponPercent) > 0 ? parseInt(couponPercent) : 0;
            } else {
                process = false;
                sResult.resultMsg = "할인 %을 입력해주세요";
            }
        }
        
        if(limitAmount){
            if(couponIsLimitAmount !== undefined && couponIsLimitAmount !== null){
                requirement = parseInt(couponIsLimitAmount) > 0 ? parseInt(couponIsLimitAmount) : 0;
            } else {
                process = false;
                sResult.resultMsg = "최소금액을 입력해주세요";
            }
        }

        if(sMaxAmount !== undefined && sMaxAmount !== null && sMaxAmount !== ""){
            maxLimit = parseInt(sMaxAmount);
        }

        if(process){
            const sIpAddress = await getClientIP(req);
            description = req.body.description + ":" + storeId + ":" + ((sIpAddress !== undefined && sIpAddress !== null) ? sIpAddress.toString() : "getIPfail");
            if(couponType === "amount"){
                result = await Store.storeCouponAmountInsert(parseInt(storeId),partner_discount,partner_discount,requirement,count_limit,name,description,startDate,endDate);
            } else {
                result = await Store.storeCouponPercentInsert(parseInt(storeId),partner_discount,partner_discount,requirement,count_limit,name,description,startDate,endDate,maxLimit);
            }
            if(result !== undefined && result !== null){
                await Store.storeCouponConnect(parseInt(storeId),result[0]);
                sResult.resultCd = "0000";
            }
        }
        console.log("sResult",sResult);
    } catch (error) {
        console.log("storeCouponInsert error",error);
    }

    res.status(200).json(sResult);
}

AuthController.changeStoreNoticeText = async (req, res) => {
    let sResult = true;
    try {
        const storeId = req.body.storeId;
        const notiText = req.body.notiText;
        
        if(notiText !== undefined && notiText !== null && storeId !== undefined && storeId !== null && parseInt(storeId) > 0){
            await Store.changeStoreNoticeText(notiText,parseInt(storeId));
        }
    } catch (error) {
        console.log("changeStoreNoticeText error",error);
    }

    res.status(200).json(sResult);
}

AuthController.insertPushToken = async (req, res) => {
    let sResult = true;
    try {
        const storeId = req.body.storeId;
        const token = req.body.token;
        const uniqueId = req.body.uniqueId;
        
        const checkUpdateToken = await User.checkUpdateToken(uniqueId,parseInt(storeId));
        if(checkUpdateToken !== undefined && checkUpdateToken.length > 0){
            await User.updatePushToken(uniqueId,token);
        } else {
            await User.insertPushToken(uniqueId,token,parseInt(storeId));
        }
    } catch (error) {
        console.log("editUserInputMessage error",error);
    }

    res.status(200).json(sResult);
}

AuthController.editUserInputMessage = async (req, res) => {
    let sResult = true;
    try {
        const userId = req.body.userId;
        const key = req.body.key;
        const content = req.body.content;
        
        const check = await Store.chatUserInputMessage(parseInt(userId),parseInt(key));
        if(check.length > 0){
            await Store.chatUserInputMessageUpdate(parseInt(userId),parseInt(key),content);
        } else {
            await Store.chatUserInputMessageInsert(parseInt(userId),parseInt(key),content);
        }
    } catch (error) {
        console.log("editUserInputMessage error",error);
    }

    res.status(200).json(sResult);
}

AuthController.editStoreInputMessage = async (req, res) => {
    let sResult = true;
    try {
        const storeId = req.body.storeId;
        const key = req.body.key;
        const content = req.body.content;
        
        const check = await Store.chatStoreInputMessage(parseInt(storeId),parseInt(key));
        if(check.length > 0){
            await Store.chatStoreInputMessageUpdate(parseInt(storeId),parseInt(key),content);
        } else {
            await Store.chatStoreInputMessageInsert(parseInt(storeId),parseInt(key),content);
        }
    } catch (error) {
        console.log("editUserInputMessage error",error);
    }

    res.status(200).json(sResult);
}

AuthController.changeAuto = async (req, res) => {
    let sResult = false;
    let xCount = 0;
    let mode = req.body.mode;
    
    try {
        // const storeId = req.body.storeId;
        // if(mode){
        //     xCount = 1;
        // }
        // const result = await Store.changeOrderAutoConfirm(storeId,xCount);
        // if(result !== undefined){
        //     sResult = true;
        // }
    } catch (error) {
        console.log("error",error);
    }
    res.status(200).json(sResult);
}

AuthController.sendChatMessage = async (req, res) => {
    let sResult = true;
    let getPushToken = [];
    let result = true;

    try {
        const userId = req.body.userId; 
        const storeId = req.body.storeId; 
        const message = req.body.message; 
        const orderId = req.body.orderId; 
        const date = req.body.date; 
        const room = req.body.room; 
        const owner = req.body.owner; 
        const osVersion = req.body.os_version; 

        if(userId === undefined || userId === null || userId === ""){
            sResult = false;
        } else if (userId === undefined || userId === null || userId === ""){
            sResult = false;
        } else if (storeId === undefined || storeId === null || storeId === ""){
            sResult = false;
        } else if (message === undefined || message === null || message === ""){
            sResult = false;
        } else if (date === undefined || date === null || date === ""){
            sResult = false;
        } else if (room === undefined || room === null || room === ""){
            sResult = false;
        } else if (owner === undefined || owner === null || owner === ""){
            sResult = false;
        } else if (orderId === undefined || orderId === null || orderId === ""){
            sResult = false;
        } else {
            let oNotiMessage = {
                data: {
                    title: "",
                    body: message.toString(),
                    type: "chat_message",
                    order_id: orderId,
                    user_id: userId,
                    store_id: storeId,
                },
                notification: {
                    title: "",
                    body: message.toString()
                },
                android: {
                    priority: "high",
                    ttl: 3600 * 1000,
                    notification: {
                        channelId: "throo_app_alarm"
                    },
                },
            };
    
            await Order.chatMessageInsert(owner,userId,storeId,room,osVersion,date,message);
            if(owner === "customer"){
                oNotiMessage.data.title = "고객님으로부터 새로운 메시지가 도착하였습니다";
                oNotiMessage.notification.title = "고객님으로부터 새로운 메시지가 도착하였습니다";
                getPushToken = await Order.getPosPushToken(parseInt(storeId));
            } else {
                oNotiMessage.data.title = "매장에서 새로운 메시지가 도착하였습니다";
                oNotiMessage.notification.title = "매장에서 새로운 메시지가 도착하였습니다";
                getPushToken = await Order.getUserPushToken(parseInt(userId));
            }
            if(getPushToken.length > 0){
                for await (const e of getPushToken) {
                    if(e.token !== undefined && e.token !== null && e.token !== ""){
                        oNotiMessage.token = e.token.toString();
                        if(owner === "customer"){
                            if(e.unique_id !== undefined && e.unique_id !== null && e.unique_id !== ""){
                                oNotiMessage.android.notification.channelId = "throo_store_alarm";
                                await ceoTargetPushMessage(oNotiMessage);
                                await posTargetPushMessage(oNotiMessage);
                            }
                            if(!result){
                                await Order.deletePosTargetPushToken(parseInt(e.push_token_id));
                            }
                        } else {
                            await userTargetPushMessage(oNotiMessage);
                        }
                    }
                }
            } else {
                sResult = false;
            }
        }

    } catch (error) {
        sResult = false;
        console.log("sendChatMessage fail! ====>> error:", error);
    }

    res.status(200).json(sResult);
}

AuthController.chatMessage = async (req, res) => {
    let sResult = {
        activate : false,
        messageList : [],
        carNm : "",
        sEmail : "",
        storeNm : ""
    };

    try {
        const owner = req.body.owner; 
        const storeId = req.body.storeId; 
        const orderId = req.body.orderId; 
        const userId = req.body.userId;
        const roomId = "throo" + orderId.toString() + userId.toString() + storeId.toString();
        const chatMessageInfo = await Order.chatMessageInfo(storeId,orderId,userId);
        if(chatMessageInfo.length > 0){
            sResult.activate = true;
            sResult.carNm = chatMessageInfo[0].license_number;
            sResult.sEmail = chatMessageInfo[0].email;
            sResult.storeNm = chatMessageInfo[0].store_name;
        }

        const getMessage = await Order.getChatMessage(roomId);
        if(getMessage.length > 0){
            for await (const i of getMessage) {
                let temp = {};
                temp.key = i.sender;
                temp.message = i.message;
                temp.date = moment(i.created_at).format('LT');
                temp.isStoreRead = i.store_read;
                temp.isUserRead = i.user_read;
                sResult.messageList.push(temp);
            }
            if(owner === "customer"){
                await Order.updateUserChatMessage(roomId);
            } else {
                await Order.updateStoreChatMessage(roomId);
            }
        }
    } catch (error) {
        console.log("operationStore fail! ====>> error:", error);
    }

    res.status(200).json(sResult);
}

AuthController.operationStore = async (req, res) => {
    let sResult = {
        resultCd: "9999",
        resultMsg: "네트워크 에러입니다, 잠시 후 다시 시도바랍니다.",
    };
    let checkedMerchant = false;
    let checkedProduct = false;
    let checkedStore = false;
    let storeName = "";

    try {
        const storeId = req.body.sParam;
        const sUnique = req.body.uniqueId;
        const sToken = req.body.pushToken;
        const token = req.body.token;
        const sRefreshToken = req.body.refreshToken;
        
        let checkMerchant = await Store.checkMerchantStatus(storeId);
        sResult.resultMsg = "사업자 인증을 해주세요";
        checkMerchant = checkMerchant[0];
        if(parseInt(checkMerchant.status) > 0){
            checkedMerchant = true;
        }

        if(checkedMerchant){
            let checkProduct = await Store.verifyProduct(storeId);
            sResult.resultMsg = "상품을 등록해주세요";
            if(checkProduct !== undefined){
                checkProduct = checkProduct[0];
                if(parseInt(checkProduct.sCount) > 0){
                checkedProduct = true;
                }
            }
        } 

        if(checkedProduct){
            sResult.resultMsg = "매장 정보를 입력해주세요";
            const checkStore = await Store.lastCheckUpAuthenticate(storeId);
            if(checkStore !== undefined && checkStore !== null){
                if(checkStore.length > 0){
                storeName = checkStore[0];
                storeName = storeName.store_name;
                checkedStore = true;
                }
            }
        }

        if(checkedStore){
            const startOperation = await Store.startOperation(storeId);
            if(startOperation !== undefined){
                const oUser = await User.findOneUser(parseInt(storeId));
                const checkUpdateDeviceUUID = await User.checkUpdateDeviceUUID(sUnique,storeId);
                if(checkUpdateDeviceUUID !== undefined && checkUpdateDeviceUUID.length > 0){
                    await User.updateDeviceUUID(sUnique,token,sRefreshToken,"throo_ceo_v1");
                } else {
                    await User.insertDeviceUUID(oUser.user_id,storeId,token,sRefreshToken,sUnique,"throo_ceo_v1");
                }
                completeSignUpEmail(storeName);

                sResult.resultCd = "0000";
            }
        }

        const checkUpdateToken = await User.checkUpdateToken(sUnique,storeId);
        if(checkUpdateToken !== undefined && checkUpdateToken.length > 0){
            await User.updatePushToken(sUnique,sToken);
        } else {
            await User.insertPushToken(sUnique,sToken,storeId);
        }

    } catch (error) {
        console.log("operationStore fail! ====>> error:", error);
    }

    res.status(200).json(sResult);
}

AuthController.deletePushToken = async (req, res) => {
    let oResult = false;

    try {
        const uniqueId = req.body.uniqueId;
        const storeId = req.body.storeId;
        const result = await Store.deletePushToken(uniqueId,parseInt(storeId));
        if(result !== undefined && result !== null){
            oResult = true;
        }
    } catch (error) {
        console.log("deletePushToken fail! error ======> ",error);
    }
    res.status(200).json(oResult);
}
AuthController.updatePushToken = async (req, res) => {
    let oResult = false;

    try {
        const uniqueId = req.body.uniqueId;
        const sParam = req.body.token;
        
        const result = await Store.updatePushToken(uniqueId,sParam);
        if(result !== undefined && result !== null){
            oResult = true;
        }
    } catch (error) {
        console.log("getPushMessageList fail! error ======> ",error);
    }
    res.status(200).json(oResult);
}

AuthController.exChangeStoreStatus = async (req, res) => {
    let oResult = false;
    try {
        const storeId = req.body.storeId; 
        const updateStatus = await Order.exChangeStoreStatus(parseInt(storeId));
        if(updateStatus !== undefined){
            oResult = true;
        }
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}
AuthController.manualOrder = async (req, res) => {
    let oResult = false;
    let pause = req.body.pause; 
    try {
        const sIndex = req.body.sIndex; 
        const storeId = req.body.storeId; 
        if(pause){
            pause = 1;
        } else {
            pause = 0;
        }
        const updateStatus = await Order.editStoreOrderTime(parseInt(storeId),pause,parseInt(sIndex));
        if(updateStatus !== undefined){
            oResult = true;
        }
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}

AuthController.dashboard = async (req, res) => {
    let oResult = {
        sResult : [],
        acceptOrder : 0,
        acceptOrderTime: 0,
        prepareOrderHour: 0,
        prepareOrder: 0,
        operationTime: [],
        forNowList: {},
        isPause: false,
        customOrderTime: 0,
        acceptOrderTimeType: "min",
        prepareOrderHourType: "min",
        bannerImg: [],
        storeNotice: "",
        origin_storeNotice: "",
    };

    try {
        const storeId = req.params.store_id;
        const getNoticeList = await Store.noticeList(5);
        if(getNoticeList.length > 0){
            for (const n of getNoticeList) {
                let temp = {};
                temp.date = moment(n.created_at).format("YYYY-MM-DD");
                temp.title = n.title;
                oResult.sResult.push(temp);
            }
        }
        const storeNoti = await Store.storeNotiForUser(parseInt(storeId));
        if(storeNoti.length > 0){
            let noti = storeNoti[0].description_noti;
            if(noti !== undefined && noti !== null && noti !== ""){
                noti = noti.toString();
                oResult.origin_storeNotice = noti;
                
                if(noti.length > 20){
                    oResult.storeNotice = noti.slice(0, 20) + "...";
                } else {
                    oResult.storeNotice = noti;
                }
            }
        }
        const acceptOrder = await Order.acceptOrder(parseInt(storeId));
        if(acceptOrder.length > 0){
            if(parseInt(acceptOrder[0].total) > 0){
                if(parseInt(acceptOrder[0].xdata) > 0){
                    oResult.acceptOrder = Math.round(parseInt(acceptOrder[0].xdata) / parseInt(acceptOrder[0].total) * 100);
                } 
            }
        }
        const acceptOrderTime = await Order.acceptOrderTime(parseInt(storeId));
        if(acceptOrderTime.length > 0){
            let xyValueList = [];
            for await (const x of acceptOrderTime) {
                const xValue = moment(x.confirmed_at).format("YYYY-MM-DD HH:mm:ss");
                const yValue = moment(x.created_at).format("YYYY-MM-DD HH:mm:ss");
                const minDiff = moment(xValue).diff(yValue, 'minutes');

                let xyValue = 0;
                if(parseInt(minDiff) > 0){
                    xyValue = parseInt(minDiff);
                }
                xyValueList.push(xyValue);
            }
            oResult.acceptOrderTime = await Math.round(average(xyValueList));
        }
        const prepareOrderHour = await Order.prepareOrderHour(parseInt(storeId));
        if(prepareOrderHour.length > 0){
            let xyValueList = [];
            for await (const x of prepareOrderHour) {
                const xValue = moment(x.confirmed_at).format("YYYY-MM-DD HH:mm:ss");
                const yValue = moment(x.prepared_at).format("YYYY-MM-DD HH:mm:ss");
                const minDiff = moment(yValue).diff(xValue, 'minutes');

                let xyValue = 0;
                if(parseInt(minDiff) > 0){
                    xyValue = parseInt(minDiff);
                }
                xyValueList.push(xyValue);
            }
            oResult.prepareOrderHour = await Math.round(average(xyValueList));
        }
        const prepareOrder = await Order.prepareOrder(parseInt(storeId));
        if(prepareOrder.length > 0){
            let xyValueList = [];
            for await (const x of prepareOrder) {
                const xValue = moment(x.confirmed_at).format("YYYY-MM-DD HH:mm:ss");
                const yValue = moment(x.prepared_at).format("YYYY-MM-DD HH:mm:ss");
                const minDiff = moment(yValue).diff(xValue, 'minutes');
                
                let xData = 0;
                let xyValue = 0;
                let orderTime = 0;
                if(parseInt(minDiff) > 0){
                    xyValue = parseInt(minDiff);
                }
                orderTime = parseInt(x.store_prepare_time);
                xData = Math.abs(orderTime - xyValue);
                xData = 100 - (xData / 10);
                xyValueList.push(xData);
            }
            oResult.prepareOrder = await Math.round(average(xyValueList));
        }
        const getList = await Store.getOperationTime(parseInt(storeId));
        const todayNm = moment().day();
        if(getList.length > 0){
            let tempOperationList = [];
            for await (let iCount of getList) {
                if (iCount.day_of_week > 6 && iCount.day_of_week < 8){
                    const result = await storeOperationTime(iCount,storeId);
                    if(result.temp !== undefined && result.temp !== null){
                        oResult.forNowList = result.temp;
                    }
                    if(result.tempList !== undefined && result.tempList !== null){
                        tempOperationList.push(result.tempList);
                    }
                } else if (iCount.day_of_week > 7 && iCount.day_of_week < 9){
                    if(0 < parseInt(todayNm) < 6){
                        const result = await storeOperationTime(iCount,storeId);
                        if(result.temp !== undefined && result.temp !== null){
                            oResult.forNowList = result.temp;
                        }
                        if(result.tempList !== undefined && result.tempList !== null){
                            tempOperationList.push(result.tempList);
                        }
                    }
                } else if (iCount.day_of_week > 8 && iCount.day_of_week < 10){
                    if(todayNm.toString() === "1"){
                        const result = await storeOperationTime(iCount,storeId);
                        if(result.temp !== undefined && result.temp !== null){
                            oResult.forNowList = result.temp;
                        }
                        if(result.tempList !== undefined && result.tempList !== null){
                            tempOperationList.push(result.tempList);
                        }
                    } else if (todayNm.toString() === "2"){
                        const result = await storeOperationTime(iCount,storeId);
                        if(result.temp !== undefined && result.temp !== null){
                            oResult.forNowList = result.temp;
                        }
                        if(result.tempList !== undefined && result.tempList !== null){
                            tempOperationList.push(result.tempList);
                        }
                    }
                } else {
                    if(todayNm.toString() === iCount.day_of_week.toString()){
                        const result = await storeOperationTime(iCount,storeId);
                        if(result.temp !== undefined && result.temp !== null){
                            oResult.forNowList = result.temp;
                        }
                        if(result.tempList !== undefined && result.tempList !== null){
                            tempOperationList.push(result.tempList);
                        }
                    }
                }
            }
            oResult.operationTime = tempOperationList;
        }
        const isPause = await Store.isPause(parseInt(storeId));
        if(isPause !== undefined && isPause !== null){
            if(parseInt(isPause.pause) > 0){
                oResult.isPause = true;
            }
            if(parseInt(isPause.order_time) > 0){
                oResult.customOrderTime = isPause.order_time;
            }
        }

        const bannerImgList = await Home.bannerImg();
        if(bannerImgList.length > 0){
            for await (let sData of bannerImgList) {
                let temp = {};
                temp.id = sData.banner_id;
                temp.url_path = sData.url_path;

                if(sData.site === "ceo"){
                    if(sData.type === "mobile"){
                        oResult.bannerImg.push(temp);
                    }
                }
            }
        } else {
            oResult.bannerImg.push({ id: 0, url_path: "https://prd-throo-store-product.s3.ap-northeast-2.amazonaws.com/store-id-0000000/photo_1635403178012" });
        }
        const sIpAddress = await getClientIP(req);
        await Store.connectThrooStoreApp(parseInt(storeId),sIpAddress,"throo_store");
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}

AuthController.orderList = async (req, res) => {
    let tempPhone = "";
    let fromDate = "";
    let toDate = "";
    let oResult = {
        sResult : [],
        count : 0,
        amount : 0,
    };

    try {
        const store_id = req.body.store_id;
        const sParam = req.body.sParam;
        if(sParam.toString() === "1"){
            fromDate = moment().format("YYYY-MM-DD");
            toDate = moment().format("YYYY-MM-DD");
        } else if (sParam.toString() === "2") {
            fromDate = moment().add(-1,"days").format('YYYY-MM-DD');
            toDate = moment().add(-1,"days").format('YYYY-MM-DD');
        } else if (sParam.toString() === "3") {
            fromDate = moment().add(-7,"days").format('YYYY-MM-DD');
            toDate = moment().format('YYYY-MM-DD');
        } else if (sParam.toString() === "4") {
            fromDate = moment().startOf("month").format('YYYY-MM-DD');
            toDate = moment().endOf("month").format('YYYY-MM-DD');
        }
        
        const result = await Order.getStoreOrderListByDate(parseInt(store_id),fromDate,toDate);
        if(result.length > 0){
            for await (const d of result) {
                const getOrderDetail = await Order.getOrderDetail(parseInt(d.order_id));
                if(getOrderDetail.length > 0){
                    if(getOrderDetail[0].state_id.toString() === "14004" || getOrderDetail[0].state_id.toString() === "14005" || getOrderDetail[0].state_id.toString() === "16001" || getOrderDetail[0].state_id.toString() === "17001" || getOrderDetail[0].state_id.toString() === "18001" || getOrderDetail[0].state_id.toString() === "15002"){
                        let tempProductList = [];
                        let temp = {};
                        for (const i of getOrderDetail) {
                            let tempOptionList = [];
                            let tempProduct = {};
                            if(i.has_option.toString() === "1"){
                                const getOption = await Order.getOrderProductOption(parseInt(i.order_detail_id));
                                if(getOption.length > 0){
                                    for await (const x of getOption) {
                                        let tempOption = {};
                                        tempOption.name = x.name;
                                        tempOption.price = convertToKRW(x.price);
                                        tempOptionList.push(tempOption);
                                    }
                                }
                            }
                            
                            tempProduct.productNm = i.name;
                            tempProduct.quantity = i.quantity;
                            tempProduct.origin_price = convertToKRW(i.base_price * i.quantity);
                            tempProduct.discount_price = convertToKRW(i.org_price * i.quantity);
                            tempProduct.option = tempOptionList;
                            tempProductList.push(tempProduct);
                        }
                        
                        if(getOrderDetail[0].phone_number !== undefined && getOrderDetail[0].phone_number !== null && getOrderDetail[0].phone_number !== ""){
                            if(sParam.toString() === "1"){
                                temp.phone_number = getOrderDetail[0].phone_number;
                            } else if (sParam.toString() === "2") {
                                temp.phone_number = getOrderDetail[0].phone_number;
                            } else {
                                tempPhone = getOrderDetail[0].phone_number;
                                tempPhone = tempPhone.split('-');
                                if(tempPhone.length > 1){
                                    tempPhone = tempPhone[tempPhone.length - 1].toString();
                                } else {
                                    tempPhone = tempPhone[0].toString();
                                    tempPhone = tempPhone.substring(tempPhone.length - 4,tempPhone.length);
                                }
                                temp.phone_number = "***-****-" + tempPhone;
                            }
                        }
                        
                        if(getOrderDetail[0].license_number !== undefined && getOrderDetail[0].license_number !== null && getOrderDetail[0].license_number !== ""){
                            temp.license_number = getOrderDetail[0].license_number;
                        }
    
                        if(getOrderDetail[0].state_id.toString() === "14004" || getOrderDetail[0].state_id.toString() === "14005" || getOrderDetail[0].state_id.toString() === "16001" || getOrderDetail[0].state_id.toString() === "17001" || getOrderDetail[0].state_id.toString() === "18001"){
                            temp.isCancel = true;
                        } else {
                            oResult.amount += parseInt(getOrderDetail[0].total_amount_excl);
                            temp.isCancel = false;
                        }
                        temp.discount = convertToKRW(getOrderDetail[0].discount_amount);
                        temp.totalAmount = convertToKRW(getOrderDetail[0].total_amount_org);
                        temp.paymentAmount = convertToKRW(getOrderDetail[0].total_amount_excl);
                        temp.content = tempProductList;
                        temp.createdAt = moment(getOrderDetail[0].created_at).format('LLLL');
                        oResult.count += 1;
    
                        oResult.sResult.push(temp);
                    }
                }
            }
        }

        if(parseInt(oResult.amount) > 0){
            oResult.amount = convertToKRW(oResult.amount);
        }
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}

AuthController.quickInsert = async (req, res) => {
    const sTitle = req.body.sNm;
    const iPrice = req.body.sOriginPrice;
    const sCategory = req.body.categoryId;
    const sFileList = req.body.pictureData;
    const store_id = req.body.store_id;
    
    let oResult = {
        resultCd : "9999",
        resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
    };
    let dPrice = req.body.sPrice;
    let iStock = req.body.iStock;

    try {
        if(sTitle === ""){
            oResult.resultCd = "1111";
            oResult.resultMsg = "메뉴명을 입력하세요"
        } else if (parseInt(iPrice) == null || iPrice === ""){
            oResult.resultCd = "2222";
            oResult.resultMsg = "가격을 입력하세요";
        } else if (sCategory == null || sCategory == undefined || sCategory === ""){
            oResult.resultCd = "3333";
            oResult.resultMsg = "카테고리를 선택하세요";
        } else {
            let process = true;
            let sCount = await Store.productListLength(parseInt(sCategory));
            if(sCount !== undefined && sCount !== null){
                if(sCount[0].count !== null){
                    sCount = parseInt(sCount[0].count) + 1;
                } else {
                    sCount = 0;
                }
            } else {
                process = false;
            }
            
            if(process){
                if(dPrice === undefined || dPrice === null || parseInt(dPrice) < 1 || dPrice === ""){
                    dPrice = iPrice;
                }
                if(iStock !== undefined && iStock !== null){
                    if(iStock === ""){
                        iStock = 0;
                    }
                } else {
                    iStock = 0;
                }
                const insertMenu = await Sales.insertMenuV3(store_id,sTitle,"",iPrice,dPrice,sCount,sFileList,sCategory,[],0,iStock);
                if(insertMenu === "0000"){
                    oResult.resultCd = "0000";
                    oResult.resultMsg = "정상적으로 처리되었습니다";
                }
            }
        }
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}

AuthController.inventoryEdit = async (req, res) => {
    let sResult = false;
    let isSoldOut = 0;
    let count = 0;
    
    try {
        const product_id = req.body.product_id;
        const iParam = req.body.sParam;
        
        if(iParam.toString() === "unlimit"){
            count = 0;
        } else if (iParam.toString() === "0"){
            isSoldOut = 1;
        } else {
            count = parseInt(iParam);
        }

        const result = await Store.inventoryEdit(product_id,count,isSoldOut);
        if(result !== undefined){
            sResult = true;
        }
    } catch (error) {
        console.log("error",error);
    }
    res.status(200).json(sResult);
}

AuthController.onChangeSoldout = async (req, res) => {
    let sResult = false;
    let xCount = 0;
    let soldOut = req.body.sold_out;
    
    try {
        const productId = req.body.product_id;
        if(!soldOut){
            xCount = 1;
        }
        const result = await Store.onChangeSoldoutProduct(productId,xCount);
        if(result !== undefined){
            sResult = true;
        }
    } catch (error) {
        console.log("error",error);
    }
    res.status(200).json(sResult);
}

AuthController.menuList = async (req, res) => {
    const category_id = req.params.category_id;

    let sResult = [];
    try {
        const getMenuList = await Sales.getMenuList(category_id);
        if(getMenuList.length > 0){
            let count = 1;
            for await (let i of getMenuList) {
                let temp = {};
                temp.key = count;
                temp.name = i.name;
                temp.id = i.product_id;
                temp.categoryId = category_id;
                temp.count = 0;
                temp.soldOut = true;
                temp.urlImg = "https://api-stg.ivid.kr/img/no-image-new.png";
                
                if(i.in_stock > 0){
                    temp.count = i.in_stock.toString();
                } else {
                    temp.count = "무제한";
                }
                if(i.is_soldout > 0){
                    temp.soldOut = false;
                    temp.count = 0;
                }
                if(i.url_path !== null && i.url_path !== undefined && i.url_path !== ""){
                    temp.urlImg = i.url_path;
                }

                sResult.push(temp);
                count ++;
            }
        }
    } catch (error) {
        console.log("error",error);
    }
    res.status(200).json(sResult);
}

AuthController.detailMenuList = async (req, res) => {
    const store_id = req.params.store_id;

    let sResult = [];
    let aResult = [];
    let noList = "none";

    try {
        const checkCategory = await Store.checkCategory(store_id);
        if(checkCategory[0].menu_id != undefined && checkCategory[0].menu_id != null){
            noList = parseInt(checkCategory[0].menu_id);
            const getCategoryList = await Store.getCategoryList(noList);
            if(getCategoryList.length > 0){
                let count = 1;
                for await (let i of getCategoryList) {
                    let temp = {};
                    temp.key = count;
                    temp.name = i.name;
                    temp.id = i.category_id;
                    if(i.is_deleted < 1){
                        sResult.push(temp);
                        aResult.push(i.name);
                    }
                    count ++;
                }
            }
        }

    } catch (error) {
        console.log("error",error);
    }
    res.status(200).json({sResult,aResult});
}

AuthController.customerLocation = async (req, res) => {
    let storeNm = "";
    let oResult = {
        originLat: parseFloat(37.56637919891677),
        originLng: parseFloat(126.97914589375286),
        pickUpRoute: [],
    };
    try {
        const store_id = req.body.store_id;
        const order_id = req.body.order_id;

        const getUserOriginLocation = await Order.getStoreOriginLocation(store_id);
        if(getUserOriginLocation !== undefined){
            oResult.originLat = getUserOriginLocation.lat;
            oResult.originLng = getUserOriginLocation.lng;
            storeNm = getUserOriginLocation.store_name;
        }
        
        const getLocation = await Management.getLocationDistance(order_id);
        if(getLocation.length > 0){
            for await (const sCount of getLocation) {
                let temp = {};
                temp.lat = parseFloat(sCount.lat);
                temp.lng = parseFloat(sCount.lng);
                oResult.pickUpRoute.push(temp);
            }
        }
        console.log("storeNm ",storeNm);
    } catch (error) {
        console.log(`storeNm ${storeNm} AuthController.signUpStoreUser fail !!! ===>`, error);
    }

    res.status(200).json(oResult);
}

AuthController.signUpStoreUser = async (req, res) => {
    let processStatus = false; 
    let businessType = null; 
    let authenticateId = null; 
    let oResult = {
       resultId: "9999",
       userId: false,
       userPwd: false,
       userPwdT: false,
       userName: false,
       userEmail: false,
       userPhone: false,
       sCount: false,
       noticeList: []
    };

    try {
        const smsToken = req.body.smsToken;
        const userId = req.body.userId;
        const userPwd = req.body.userPwd;
        const userPwdT = req.body.userPwdT;
        const userName = req.body.userName;
        const userEmail = req.body.userEmail;
        const userPhone = req.body.userPhone;
        const sCount = req.body.sCount;
        if(userId !== undefined && userId !== null && userId !== ""){
            const result = await User.findById(userId);
            if(result !== undefined && result !== null){
                if(result[0].count < 1){
                    oResult.userId = true;
                }
            }
        }
        if(userPwd !== undefined && userPwd !== null && userPwd !== ""){
            if(userPwdT !== undefined && userPwdT !== null && userPwdT !== ""){
                if(userPwdT === userPwd){
                    oResult.userPwd = true;
                    oResult.userPwdT = true;
                }
            }
        }

        if(userName !== undefined && userName !== null && userName !== ""){
            oResult.userName = true;
        }
        if(userEmail !== undefined && userEmail !== null && userEmail !== ""){
            oResult.userEmail = true;
        }
        if(userEmail !== undefined && userEmail !== null && userEmail !== ""){
            const regExp = /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/i;
            if(regExp.test(userEmail)) oResult.userEmail = true;
        }
        if(userPhone !== undefined && userPhone !== null && userPhone !== ""){
            if(sCount !== undefined && sCount !== null && sCount !== ""){
                if(smsToken !== undefined && smsToken !== null && smsToken !== ""){
                    let verifyCode = await User.verifySmsCodeV2(userPhone, sCount, smsToken, userId);
                    verifyCode = verifyCode[0];
                    if (!verifyCode.expired && parseInt(verifyCode.verified) == 1) {
                        oResult.userPhone = true;
                        oResult.sCount = true;
                        authenticateId = parseInt(verifyCode.user_sms_id);
                    }
                }
            }
        }
        if(oResult.userId && oResult.userPwd && oResult.userPwdT && oResult.userName && oResult.userEmail && oResult.userPhone && oResult.sCount && authenticateId !== null){
            processStatus = true;
        }

        if(processStatus){
            if(req.body.businessType !== undefined && req.body.businessType !== null && req.body.businessType !== ""){
                businessType = req.body.businessType;
            }
            const newStore = await User.addNewUser(userPhone,userName,userEmail,userId,userPwd,authenticateId,businessType);
            if(newStore.result_cd === "0000"){
                const mailSender = await welcomeEmailStore(userEmail,userName);
                if(mailSender){
                    await sendAlertMessage(userPhone,"TF_4391");

                    const randomDeviceId = (Math.random() * (10 - 1)) + 1;
                    const sRefreshToken = randtoken.uid(128);
                    const token = jwt.sign({ user_id: newStore.userId, store_id: newStore.storeId, device_uuid: randomDeviceId.toString() },
                    config.keys.secret, { expiresIn: '360m' }
                    );

                    const noticeList = await Store.noticeListTotal();
                    if(noticeList.length > 0){
                        for await (const e of noticeList) {
                            let temp = {};
                            temp.title = e.title;
                            temp.date = moment(e.created_at).format('MM-DD');

                            oResult.noticeList.push(temp);
                        }
                    }
                    oResult.resultId = "0000";
                    oResult.token = config.keys.tokenKey + ' ' + token;
                    oResult.refresh_token = sRefreshToken;
                    oResult.uuid = uuidv1();
                    oResult.store_id = newStore.storeId;
                    oResult.loginPw = newStore.password;
                    oResult.is_Chat = true;
                }
            }
        }

    } catch (error) {
        console.log("AuthController.signUpStoreUser fail !!! ===>", error);
    }

    res.status(200).json(oResult);
}

AuthController.autoLoginV2 = async (req, res) => {
    let oResult = {
        resultId: "5555",
        resultMsg: "네트워크 에러입니다, 잠시 후 다시 시도바랍니다.",
        noticeList: []
    };
    
    try {
        const sPassword = req.body.password;
        const sPotentialUser = req.body.id;
        const sDeviceUuid = req.body.deviceuuid || '';
        const sToken = req.body.token;
        const sUnique = req.body.uniqueId;
        const platform = req.body.platform;
        const appType = req.body.appType;
        
        const oUser = await User.findOne(sPotentialUser);
        if (!oUser) {
            oResult.resultId = "3333";
            oResult.resultMsg = "아이디를 다시 확인하세요";
        } else {
            if (oUser.password === sPassword) {
                const sRefreshToken = randtoken.uid(128);
                const token = jwt.sign({ user_id: oUser.user_id, store_id: oUser.store_id, device_uuid: sDeviceUuid },
                    config.keys.secret, { expiresIn: '360m' }
                );
                const oStore = await Store.getStoreById(oUser.store_id);
                if(oStore != undefined){
                    const checkUpdateToken = await User.checkUpdateToken(sUnique,oUser.store_id);
                    if(checkUpdateToken !== undefined && checkUpdateToken.length > 0){
                        await User.updatePushToken(sUnique,sToken);
                    } else {
                        await User.insertPushToken(sUnique,sToken,oUser.store_id);
                    }
                    const checkUpdateDeviceUUID = await User.checkUpdateDeviceUUID(sUnique,oUser.store_id);
                    if(checkUpdateDeviceUUID !== undefined && checkUpdateDeviceUUID.length > 0){
                        await User.updateDeviceUUID(sUnique,config.keys.tokenKey + ' ' + token,sRefreshToken,"throo_ceo_v1");
                    } else {
                        await User.insertDeviceUUID(oUser.user_id,oUser.store_id,config.keys.tokenKey + ' ' + token,sRefreshToken,sUnique,"throo_ceo_v1");
                    }
                    const noticeList = await Store.noticeListTotal();
                    if(noticeList.length > 0){
                        for await (const e of noticeList) {
                            let temp = {};
                            temp.title = e.title;
                            temp.date = moment(e.created_at).format('MM-DD');

                            oResult.noticeList.push(temp);
                        }
                    } else {
                        oResult.noticeList = [];
                    }
                    
                    const checkMegaStore = await Store.checkMegaStore(parseInt(oUser.store_id));
                    if(checkMegaStore !== undefined && checkMegaStore.length > 0){
                        oResult.autoStatus = true;
                    } else {
                        oResult.autoStatus = false;
                    }

                    if(oStore.auto_confirm !== undefined && oStore.auto_confirm !== null && parseInt(oStore.auto_confirm) > 0){
                        oResult.autoMode = true;
                    } else {
                        oResult.autoMode = false;
                    }
                    
                    if(appType !== undefined && appType !== null && appType !== undefined && appType !== null){
                        const getCurrentVersionNm = await Store.getCurrentVersionNm(appType,platform);
                        oResult.currentNm = parseInt(getCurrentVersionNm[0].value);
                    }

                    const isCommercial = await Store.checkCommercialOpen();
                    oResult.commercial = false;
                    if(isCommercial.length > 0){
                       if(parseInt(isCommercial[0].value) > 0){
                          oResult.commercial = true;
                       }
                    }
                    
                    oResult.resultId = "0000";
                    oResult.fullName = oStore.full_name;
                    oResult.storeName = oStore.store_name;
                    oResult.businessType = oStore.business_type;
                    oResult.storeId = oUser.store_id;
                    oResult.token = config.keys.tokenKey + ' ' + token;
                    oResult.refresh_token = sRefreshToken;
                    oResult.loginPw = oUser.password;
                    oResult.pickup = oStore.pickup_type;
                    console.log("oUser.pickup_type",oStore.pickup_type);
                    oResult.isChat = true;
                    oResult.is_stamp = true;
                    if(oStore.status < 1){
                        oResult.isActivate = false;
                    } else {
                        oResult.isActivate = true;
                    }

                    const sIpAddress = await getClientIP(req);
                    await Store.connectThrooStoreAppLogin(parseInt(oUser.store_id),sIpAddress,"throo_store");
                }
            } else {
                oResult.resultId = "4444";
                oResult.resultMsg = "비밀번호를 다시 확인하세요";
            }
        }
        console.log("oResult.pickup",oResult.pickup);
    } catch (error) {
        console.log("authenticateUserV2 fail! error ======> ",error);
    }

    res.status(200).json(oResult);
}

AuthController.authenticateUserV2 = async (req, res) => {
    let oResult = {
        resultId: "5555",
        resultMsg: "네트워크 에러입니다, 잠시 후 다시 시도바랍니다.",
        noticeList: []
    };
    
    try {
        const sPassword = req.body.password;
        const sPotentialUser = req.body.id;
        const sDeviceUuid = req.body.deviceuuid || '';
        const sToken = req.body.token;
        const sUnique = req.body.uniqueId;
        const platform = req.body.platform;
        const appType = req.body.appType;

        const oUser = await User.findOne(sPotentialUser);
        if (!oUser) {
            oResult.resultId = "3333";
            oResult.resultMsg = "아이디를 다시 확인하세요";
        } else {
            const isMatch = await bcrypt.compare(sPassword, oUser.password);
            if (isMatch) {
                const sRefreshToken = randtoken.uid(128);
                const token = jwt.sign({ user_id: oUser.user_id, store_id: oUser.store_id, device_uuid: sDeviceUuid },
                    config.keys.secret, { expiresIn: '360m' }
                );
                const oStore = await Store.getStoreById(oUser.store_id);
                if(oStore != undefined){
                    const checkUpdateToken = await User.checkUpdateToken(sUnique,oUser.store_id);
                    if(checkUpdateToken !== undefined && checkUpdateToken.length > 0){
                        await User.updatePushToken(sUnique,sToken);
                    } else {
                        await User.insertPushToken(sUnique,sToken,oUser.store_id);
                    }
                    const checkUpdateDeviceUUID = await User.checkUpdateDeviceUUID(sUnique,oUser.store_id);
                    if(checkUpdateDeviceUUID !== undefined && checkUpdateDeviceUUID.length > 0){
                        await User.updateDeviceUUID(sUnique,config.keys.tokenKey + ' ' + token,sRefreshToken,"throo_ceo_v1");
                    } else {
                        await User.insertDeviceUUID(oUser.user_id,oUser.store_id,config.keys.tokenKey + ' ' + token,sRefreshToken,sUnique,"throo_ceo_v1");
                    }

                    const noticeList = await Store.noticeListTotal();
                    if(noticeList.length > 0){
                        for await (const e of noticeList) {
                            let temp = {};
                            temp.title = e.title;
                            temp.date = moment(e.created_at).format('MM-DD');

                            oResult.noticeList.push(temp);
                        }
                    } else {
                        oResult.noticeList = [];
                    }
                    const checkMegaStore = await Store.checkMegaStore(parseInt(oUser.store_id));
                    if(checkMegaStore !== undefined && checkMegaStore.length > 0){
                        oResult.autoStatus = true;
                    } else {
                        oResult.autoStatus = false;
                    }

                    if(oStore.auto_confirm !== undefined && oStore.auto_confirm !== null && parseInt(oStore.auto_confirm) > 0){
                        oResult.autoMode = true;
                    } else {
                        oResult.autoMode = false;
                    }
                    if(appType !== undefined && appType !== null && appType !== undefined && appType !== null){
                        const getCurrentVersionNm = await Store.getCurrentVersionNm(appType,platform);
                        oResult.currentNm = parseInt(getCurrentVersionNm[0].value);
                    }
                    const isPause = await Store.isPause(parseInt(oUser.store_id));
                    if(isPause !== undefined && isPause !== null){
                        if(parseInt(isPause.pause) > 0){
                            oResult.isPause = true;
                        } else {
                            oResult.isPause = false;
                        }
                    } else {
                        oResult.isPause = false;
                    }
                    
                    const isCommercial = await Store.checkCommercialOpen();
                    oResult.commercial = false;
                    if(isCommercial.length > 0){
                       if(parseInt(isCommercial[0].value) > 0){
                          oResult.commercial = true;
                       }
                    }

                    oResult.resultId = "0000";
                    oResult.storeName = oStore.store_name;
                    oResult.fullName = oStore.full_name;
                    oResult.businessType = oStore.business_type;
                    oResult.storeId = oUser.store_id;
                    oResult.token = config.keys.tokenKey + ' ' + token;
                    oResult.refresh_token = sRefreshToken;
                    oResult.loginPw = oUser.password;
                    oResult.pickup = oStore.pickup_type;
                    console.log("oStore.pickup_type",oStore.pickup_type);

                    oResult.isChat = true;
                    oResult.is_stamp = true;
                    if(oStore.status < 1){
                        oResult.isActivate = false;
                    } else {
                        oResult.isActivate = true;
                    }
                }
            } else {
                oResult.resultId = "4444";
                oResult.resultMsg = "비밀번호를 다시 확인하세요";
            }
        }
    } catch (error) {
        console.log("authenticateUserV2 fail! error ======> ",error);
    }
    console.log("oResult.pickup",oResult.pickup);
    res.status(200).json(oResult);
}

module.exports = AuthController;
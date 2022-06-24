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
const User = require('../../models/user');
const Store = require('../../models/store');
const Sales = require('../../models/sales');
const Order = require('../../models/order');

const {
    oFirebaseAdminAppSales
} = require('../../services/firebaseAdmin');

const {
    convertToKRW,
} = require('../../helpers/stringHelper');


const beforeSave = user => {
    if (!user.password) return Promise.resolve(user)

    // `password` will always be hashed before being saved.
    return  hashPassword(user.password)
            .then(hash => ({ ...user, password: hash }))
            .catch(err => `Error hashing password: ${err}`)
}

const checkAuthenticateSalesUser = async (sIndex) => {
    let temp = {
        result: false
    };
    let getUser = await Sales.userData(parseInt(sIndex));
    if(getUser.length > 0){
        getUser = getUser[0];
        temp.result = true;
        temp.sales_type = getUser.sales_type;
        temp.group_id = getUser.group_id;
        temp.admin_user_id = getUser.admin_user_id;
        temp.user_type = getUser.user_type;
        temp.group_name = getUser.group_name;
        temp.activated = getUser.activated;
    }

    return temp;
}


var SalesController = {};

SalesController.deleteMember = async (req, res) => {
    let sResult = false;
    let process1 = false;

    try {
        const salesId = req.body.salesId;
        const userId = req.body.userId;

        const authenticateSalesUser = await checkAuthenticateSalesUser(salesId);
        if(authenticateSalesUser.result){
            if(parseInt(authenticateSalesUser.activated) > 0){
                if(parseInt(authenticateSalesUser.user_type) > 0){
                    process1 = true;
                }
            }
        }

        if(process1){
            const deleteResult = await Sales.deleteMember(parseInt(userId));
            if(deleteResult.length > 0){
                sResult = true;
            }
        }

    } catch (error) {
        console.log("SalesController.deleteMember fail !!! ===>", error);
    }
    res.status(200).json(sResult);
}

SalesController.managerChangeMember = async (req, res) => {
    let sResult = false;
    let process1 = false;

    try {
        const salesId = req.body.salesId;
        const userId = req.body.userId;

        const authenticateSalesUser = await checkAuthenticateSalesUser(salesId);
        if(authenticateSalesUser.result){
            if(parseInt(authenticateSalesUser.activated) > 0){
                if(parseInt(authenticateSalesUser.user_type) > 0){
                    process1 = true;
                }
            }
        }

        if(process1){
            const deleteResult = await Sales.managerChangeMember(parseInt(userId),parseInt(authenticateSalesUser.group_id),authenticateSalesUser.group_name);
            if(deleteResult.length > 0){
                sResult = true;
            }
        }

    } catch (error) {
        console.log("SalesController.deleteMember fail !!! ===>", error);
    }
    res.status(200).json(sResult);
}

SalesController.managerList = async (req, res) => {
    let sResult = {
        userList: [],
        memberList: []
    };
    let process1 = false;

    try {
        const salesId = req.params.sales_id;
        const authenticateSalesUser = await checkAuthenticateSalesUser(salesId);
        if(authenticateSalesUser.result){
            if(parseInt(authenticateSalesUser.activated) > 0){
                if(parseInt(authenticateSalesUser.user_type) > 0){
                    process1 = true;
                }
            }
        }

        if(process1){
            const userList = await Sales.salesNewUser();
            if(userList.length > 0){
                for await (const iterator of userList) {
                    let temp = {};
                    temp.email = iterator.email;
                    temp.name = iterator.full_name;
                    temp.id = iterator.admin_user_id;
                    temp.activated = iterator.activated;

                    sResult.userList.push(temp);
                }
            }
            
            const memberList = await Sales.salesTeamMember(parseInt(authenticateSalesUser.group_id),parseInt(salesId));
            if(memberList.length > 0){
                for await (const iterator of memberList) {
                    let temp = {};
                    temp.email = iterator.email;
                    temp.name = iterator.full_name;
                    temp.id = iterator.admin_user_id;
                    temp.activated = iterator.activated;

                    sResult.memberList.push(temp);
                }
            }
        }
    } catch (error) {
        console.log("SalesController.managerList fail !!! ===>", error);
    }
    res.status(200).json(sResult);
}

SalesController.enrollingStoreByName = async (req, res) => {
    let sResult = [];
    let result = [];
    let process1 = false;
    let groudId = 0;

    try {
        const salesId = req.body.salesId;
        const sNm = req.body.sNm;
        const authenticateSalesUser = await checkAuthenticateSalesUser(salesId);
        if(authenticateSalesUser.result){
            if(parseInt(authenticateSalesUser.activated) > 0){
                groudId = authenticateSalesUser.group_id;
                process1 = true;
            }
        }

        if(process1){
            if(groudId.toString() === "100"){
                result = await Sales.enrollingStoreByStoreName(sNm);
            } else {
                result = await Sales.enrollingStoreGroupIdByStoreNm(sNm,parseInt(salesId));
            }
            
            if(result.length > 0){
                for await (const iterator of result) {
                    let temp = {};
                    temp.storeId = iterator.store_id;
                    temp.storeNm = iterator.store_name;
                    temp.email = iterator.email;
                    temp.status = iterator.status;
                    temp.date = moment(iterator.created_at).format("LLLL");
                    
                    if(iterator.url_path !== undefined && iterator.url_path !== null && iterator.url_path !== ""){
                        temp.urlPath = iterator.url_path;
                    } else {
                        temp.urlPath = "https://api-stg.ivid.kr/img/no-image-new.png";
                    }
                    sResult.push(temp);
                }
            }
        }

    } catch (error) {
       console.log("SalesController.enrollingStoreByName fail !!! ===>", error);
    }
    res.status(200).json(sResult);
}

SalesController.enrolledStoreByName = async (req, res) => {
    let sResult = [];
    let result = [];
    let process1 = false;
    let groudId = 0;
    
    try {
        const salesId = req.body.salesId;
        const sNm = req.body.sNm;
        const authenticateSalesUser = await checkAuthenticateSalesUser(salesId);
        if(authenticateSalesUser.result){
            if(parseInt(authenticateSalesUser.activated) > 0){
                groudId = authenticateSalesUser.group_id;
                process1 = true;
            }
        }
    
        if(process1){
            if(groudId.toString() === "100"){
                result = await Sales.enrolledStoreByStoreName(sNm);
            } else {
                result = await Sales.enrolledStoreGroupIdByStoreNm(sNm,parseInt(salesId));
            }
            
            if(result.length > 0){
                for await (const iterator of result) {
                    let temp = {};
                    temp.storeId = iterator.store_id;
                    temp.storeNm = iterator.store_name;
                    temp.email = iterator.email;
                    temp.status = iterator.status;
                    temp.date = moment(iterator.created_at).format("LLLL");

                    if(iterator.url_path !== undefined && iterator.url_path !== null && iterator.url_path !== ""){
                        temp.urlPath = iterator.url_path;
                    } else {
                        temp.urlPath = "https://api-stg.ivid.kr/img/no-image-new.png";
                    }
                    sResult.push(temp);
                }
            }
        }
    
    } catch (error) {
       console.log("SalesController.enrolledStoreByName fail !!! ===>", error);
    }
    res.status(200).json(sResult);
    
}

SalesController.enrollingStore = async (req, res) => {
    let sResult = [];
    let process1 = false;
    let groudId = 0;
    
    try {
        const salesId = req.params.sales_id;
        const authenticateSalesUser = await checkAuthenticateSalesUser(salesId);
        if(authenticateSalesUser.result){
            if(parseInt(authenticateSalesUser.activated) > 0){
                groudId = authenticateSalesUser.group_id;
                process1 = true;
            }
        }

        if(process1){
            if(groudId.toString() === "100"){

            } else {
                const result = await Sales.enrollingStoreByGroupId(parseInt(salesId));
                if(result.length > 0){
                    for await (const iterator of result) {
                        let temp = {};
                        temp.storeId = iterator.store_id;
                        temp.storeNm = iterator.store_name;
                        temp.email = iterator.email;
                        temp.status = iterator.status;
                        temp.date = moment(iterator.created_at).format("LLLL");

                        if(iterator.url_path !== undefined && iterator.url_path !== null && iterator.url_path !== ""){
                            temp.urlPath = iterator.url_path;
                        } else {
                            temp.urlPath = "https://api-stg.ivid.kr/img/no-image-new.png";
                        }
                        sResult.push(temp);
                    }
                }
            }

        }
    } catch (error) {
        console.log("SalesController.enrollingStore fail! error ======> ",error);
    }
    res.status(200).json(sResult);
}

SalesController.enrolledStore = async (req, res) => {
    let sResult = [];
    let process1 = false;
    let groudId = 0;
    
    try {
        const salesId = req.params.sales_id;
        const authenticateSalesUser = await checkAuthenticateSalesUser(salesId);
        if(authenticateSalesUser.result){
            if(parseInt(authenticateSalesUser.activated) > 0){
                groudId = authenticateSalesUser.group_id;
                process1 = true;
            }
        }
    
        if(process1){
            if(groudId.toString() === "100"){
    
            } else {
                const result = await Sales.enrolledStoreByGroupId(parseInt(salesId));
                if(result.length > 0){
                    for await (const iterator of result) {
                        let temp = {};
                        temp.storeId = iterator.store_id;
                        temp.storeNm = iterator.store_name;
                        temp.email = iterator.email;
                        temp.status = iterator.status;
                        temp.date = moment(iterator.created_at).format("LLLL");
    
                        if(iterator.url_path !== undefined && iterator.url_path !== null && iterator.url_path !== ""){
                            temp.urlPath = iterator.url_path;
                        } else {
                            temp.urlPath = "https://api-stg.ivid.kr/img/no-image-new.png";
                        }
                        sResult.push(temp);
                    }
                }
            }
    
        }
    } catch (error) {
        console.log("SalesController.enrolledStore fail! error ======> ",error);
    }
    res.status(200).json(sResult);
    
}

SalesController.dashboardData = async (req, res) => {
    let result = [];
    let process1 = false;
    let groudId = null;
    let tempNm = 20;
    let oResult = {
        resultCd : "9999",
        pageNm : 20,
        storeList : [],
        bannerList : []
    };

    try {
        const salesId = req.body.salesId;
        const pageNm = req.body.pageNm;
        if(pageNm === undefined || pageNm === null || pageNm === ""){
            const bannerImg = await Sales.bannerImg();
            if(bannerImg.length > 0){
                for await (let sData of bannerImg) {
                    let temp = {};
                    temp.id = sData.banner_id;
                    temp.url_path = sData.url_path;
                    temp.move_path = "";
                    temp.param = "";
    
                    if(sData.mime_type !== null && sData.mime_type !== undefined && sData.mime_type !== ""){
                        temp.move_path = sData.mime_type
                    }
                    if(sData.param !== null && sData.param !== undefined && sData.param !== ""){
                        temp.param = sData.param
                    }
    
                    if(sData.site === "ceo"){
                        if(sData.type === "mobile"){
                            oResult.bannerList.push(temp);
                        }
                    }
    
                }
            }
        } else {
            tempNm = pageNm;
            oResult.pageNm = pageNm;
        }

        const authenticateSalesUser = await checkAuthenticateSalesUser(salesId);
        if(authenticateSalesUser.result){
            if(parseInt(authenticateSalesUser.activated) > 0){
                groudId = authenticateSalesUser.group_id;
                process1 = true;
            }
        }
        
        if(process1){
            if(groudId.toString() === "100"){
                result = await Sales.getStoreInfoLimit(tempNm);
            } else {
                result = await Sales.getGroupStoreInfoLimit(parseInt(salesId),tempNm);
            }

            if(result.length > 0){
                for await (const iterator of result) {
                    let temp = {};
                    temp.storeId = iterator.store_id;
                    temp.storeNm = iterator.store_name;
                    temp.email = iterator.email;
                    temp.status = iterator.status;

                    if(iterator.url_path !== undefined && iterator.url_path !== null && iterator.url_path !== ""){
                        temp.urlPath = iterator.url_path;
                    } else {
                        temp.urlPath = "https://api-stg.ivid.kr/img/no-image-new.png";
                    }
                    oResult.storeList.push(temp);
                }
            }
        }
        oResult.resultCd = "0000";

    } catch (error) {
        console.log("getPushMessageList fail! error ======> ",error);
    }
    res.status(200).json(oResult);
}

SalesController.updatePushToken = async (req, res) => {
    let oResult = false;

    try {
        const salesId = req.body.salesId;
        const sParam = req.body.token;
        
        const result = await Sales.updatePushToken(parseInt(salesId),sParam);
        if(result !== undefined && result !== null){
            oResult = true;
        }
    } catch (error) {
        console.log("getPushMessageList fail! error ======> ",error);
    }
    res.status(200).json(oResult);
}

SalesController.autoLogin = async (req, res) => {
    const sPassword = req.body.password;
    const sUser = req.body.id;
    const sToken = req.body.token;

    let groupList = [];
    let oResult = {
        resultId : "9999",
        resultMsg : "잘못된 접근입니다",
        messageList: []
    };

    try {
        const isSales = await Sales.findSalesUser(sUser);
        if(isSales){
            if (sPassword === isSales.password) {
                const checkUpdateToken = await Sales.checkUpdateToken(isSales.admin_user_id);
                if(checkUpdateToken !== undefined && checkUpdateToken.length > 0){
                    await Sales.updatePushToken(isSales.admin_user_id,sToken);
                } else {
                    await Sales.insertPushToken(isSales.admin_user_id,sToken);
                }
                const getGroupUserList = await Sales.getGroupUserList(isSales.group_id); 
                const getAllGroupStore = await Sales.getAllGroupStore(isSales.group_id);
                if(getGroupUserList.length > 0){
                    for await (const e of getGroupUserList) {
                        let temp = {};
                        temp.name = e.full_name;
                        temp.email = e.email;
                        temp.phone = e.phone_number;
                        temp.company = e.group_name;
                        groupList.push(temp);
                    }
                }
                const getSalesMessage = await Sales.getAllSalesMessage();
                if(getSalesMessage.length > 0){
                    for await (const e of getSalesMessage) {
                        let temp = {};
                        temp.title = e.title;
                        temp.content = e.content;
                        temp.date = moment(e.created_at).format('MM-DD');

                        if(parseInt(e.group_id) === parseInt(isSales.group_id)){
                            oResult.messageList.push(temp);
                        } else if(e.type_id === "all"){
                            oResult.messageList.push(temp);
                        }
                    }
                }
                
                if(isSales.activated.toString() === "1"){
                    oResult.activated = true;
                } else {
                    oResult.activated = false;
                }

                oResult.resultId = "0000";
                oResult.loginId = sUser;
                oResult.loginPw = isSales.password;
                oResult.salesId = isSales.admin_user_id;
                oResult.groupId = isSales.group_id;
                oResult.isMaster = isSales.user_type;
                oResult.salesName = isSales.full_name;
                oResult.salesCompany = isSales.group_name;
                oResult.salesPhone = isSales.phone_number;
                oResult.amountStore = (getAllGroupStore !== undefined && getAllGroupStore.length > 0) ? parseInt(getAllGroupStore[0].sCount) : 0;
                oResult.coworkerList = groupList;
            }
        }
    } catch (error) {
        console.log("SalesController autoLogin fail! error ======> ",error);
    }

   res.json(oResult);
}

SalesController.authenticateUserV2 = async (req, res) => {
    const sPassword = req.body.password;
    const sUser = req.body.id;
    const sToken = req.body.token;

    let groupList = [];
    let oResult = {
        resultId: "3333",
        resultMsg : "잘못된 접근입니다",
        messageList: []
    };
    try {
        const isSales = await Sales.findSalesUser(sUser);
        if(!isSales){
            oResult.resultId = "1111";
            oResult.resultMsg = "이메일을 다시 확인하세요";
        } else {
            const isSalesMatch = await bcrypt.compare(sPassword, isSales.password);
            if (isSalesMatch) {
                const checkUpdateToken = await Sales.checkUpdateToken(isSales.admin_user_id);
                if(checkUpdateToken !== undefined && checkUpdateToken.length > 0){
                    await Sales.updatePushToken(isSales.admin_user_id,sToken);
                } else {
                    await Sales.insertPushToken(isSales.admin_user_id,sToken);
                }
                const getGroupUserList = await Sales.getGroupUserList(isSales.group_id); 
                const getAllGroupStore = await Sales.getAllGroupStore(isSales.group_id);
                if(getGroupUserList.length > 0){
                    for await (const e of getGroupUserList) {
                        let temp = {};
                        temp.name = e.full_name;
                        temp.email = e.email;
                        temp.phone = e.phone_number;
                        temp.company = e.group_name;
                        groupList.push(temp);
                    }
                }
                const getSalesMessage = await Sales.getAllSalesMessage();
                if(getSalesMessage.length > 0){
                    for await (const e of getSalesMessage) {
                        let temp = {};
                        temp.title = e.title;
                        temp.content = e.content;
                        temp.date = moment(e.created_at).format('MM-DD');

                        if(parseInt(e.group_id) === parseInt(isSales.group_id)){
                            oResult.messageList.push(temp);
                        } else if(e.type_id === "all"){
                            oResult.messageList.push(temp);
                        }
                    }
                }

                if(isSales.activated.toString() === "1"){
                    oResult.activated = true;
                } else {
                    oResult.activated = false;
                }

                oResult.resultId = "0000";
                oResult.loginId = sUser;
                oResult.loginPw = isSales.password;
                oResult.salesId = isSales.admin_user_id;
                oResult.groupId = isSales.group_id;
                oResult.isMaster = isSales.user_type;
                oResult.salesName = isSales.full_name;
                oResult.salesCompany = isSales.group_name;
                oResult.salesPhone = isSales.phone_number;
                oResult.amountStore = (getAllGroupStore !== undefined && getAllGroupStore.length > 0) ? parseInt(getAllGroupStore[0].sCount) : 0;
                oResult.coworkerList = groupList;
            } else {
                oResult.resultId = "2222";
                oResult.resultMsg = "비밀번호를 다시 확인하세요";
            }
        }
    } catch (error) {
        console.log("SalesController authenticateUserV2 fail! error ======> ",error);
    }

   res.json(oResult);
}

SalesController.partnersSignUp = async (req, res) => {
    let salesId = null;
    let oResult = {
        resultId: "3333",
        resultMsg : "네트워크 에러입니다",
        messageList: []
    };
    let groupList = [];
    try {
        const sName = req.body.sName;
        const sPhone = req.body.sPhone;
        const sEmail = req.body.sEmail;
        const sPassword = req.body.sPassword;
        const sToken = req.body.token;

        if(sName === undefined || sName === null || sName === ""){
            oResult.resultId = "1111";
            oResult.resultMsg = "이름을 다시 입력하세요";
        } else if (sPhone === undefined || sPhone === null ||sPhone === "") {
            oResult.resultId = "1111";
            oResult.resultMsg = "전화번호를 다시 입력하세요";
        } else if (sEmail === undefined || sEmail === null || sEmail === "") {
            oResult.resultId = "1111";
            oResult.resultMsg = "이메일을 다시 입력하세요";
        } else if (sPassword === undefined || sPassword === null || sPassword === "") {
            oResult.resultId = "1111";
            oResult.resultMsg = "비밀번호를 다시 입력하세요";
        } else {
            const convertTo = await beforeSave({ password: sPassword });
            const insertSalesUser = await Sales.salesUserSignUpV2(sName,"미정",sEmail,sPhone,convertTo.password,99999,"미정");
            if(insertSalesUser !== undefined){
                salesId = insertSalesUser[0];
            }
            if(salesId !== null){
                const isSales = await Sales.findSalesUser(sEmail);
                if(!isSales){
                    oResult.resultId = "1111";
                    oResult.resultMsg = "알수없는 에러가 발생했습니다";
                } else {
                    const checkUpdateToken = await Sales.checkUpdateToken(salesId);
                    if(checkUpdateToken !== undefined && checkUpdateToken.length > 0){
                        await Sales.updatePushToken(salesId,sToken);
                    } else {
                        await Sales.insertPushToken(salesId,sToken);
                    }
                    const getGroupUserList = await Sales.getGroupUserList(salesId); 
                    const getAllGroupStore = await Sales.getAllGroupStore(salesId);
                    if(getGroupUserList.length > 0){
                        for await (const e of getGroupUserList) {
                            let temp = {};
                            temp.name = e.full_name;
                            temp.email = e.email;
                            temp.phone = e.phone_number;
                            temp.company = e.group_name;
                            groupList.push(temp);
                        }
                    }
                    const getSalesMessage = await Sales.getAllSalesMessage();
                    if(getSalesMessage.length > 0){
                        for await (const e of getSalesMessage) {
                            let temp = {};
                            temp.title = e.title;
                            temp.content = e.content;
                            temp.date = moment(e.created_at).format('MM-DD');
    
                            if(parseInt(e.group_id) === parseInt(isSales.group_id)){
                                oResult.messageList.push(temp);
                            } else if(e.type_id === "all"){
                                oResult.messageList.push(temp);
                            }
                        }
                    }

                    if(isSales.activated.toString() === "1"){
                        oResult.activated = true;
                    } else {
                        oResult.activated = false;
                    }

                    oResult.resultId = "0000";
                    oResult.loginId = sEmail;
                    oResult.loginPw = isSales.password;
                    oResult.salesId = isSales.admin_user_id;
                    oResult.groupId = isSales.group_id;
                    oResult.isMaster = isSales.user_type;
                    oResult.salesName = isSales.full_name;
                    oResult.salesCompany = isSales.group_name;
                    oResult.salesPhone = isSales.phone_number;
                    oResult.amountStore = (getAllGroupStore !== undefined && getAllGroupStore.length > 0) ? parseInt(getAllGroupStore[0].sCount) : 0;
                    oResult.coworkerList = groupList;
                }
            }
        }
        
    } catch (error) {
        console.log("SalesController partnersSignUp fail! error ======> ",error);
    }

   res.json(oResult);
}

module.exports = SalesController;
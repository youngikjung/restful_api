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

async function* asyncGenerator(sIndex) {
    let count = 0;
    while (count < sIndex) 
    yield count++;
};

const congestionDecision = async (iCount) => {
    let temp = "";

    if(iCount < 1){
        temp = "easy";
    } else if (0 < iCount && iCount < 2) {
        temp = "normal";
    } else if (1 < iCount && iCount < 3) {
        temp = "busy";
    }

    return temp;
}

const getOperationTimeEveryDay = async (sData,sIndex,aIndex) => {
    let temp = "none";
    for await (let iCount of sData) {
        const iStartTime = iCount.opening_time.substring(0, 2);
        const iEndTime = iCount.closing_time.substring(0, 2);
        if(parseInt(aIndex) <= parseInt(iEndTime)){
            if(parseInt(sIndex) >= parseInt(iStartTime)){
                temp = await congestionDecision(iCount.congestion_type);
            }
        } else {
            if(parseInt(sIndex) <= parseInt(iEndTime)){
                temp = await congestionDecision(iCount.congestion_type);
            }
        }
    }

    return temp;
}

const changeArrayOrder = async (sList, targetIdx, moveValue) => {
    const newPosition = targetIdx + moveValue;

    if (newPosition < 0 || newPosition >= sList.length) return;

    const tempList = JSON.parse(JSON.stringify(sList));

    const target = tempList.splice(targetIdx, 1)[0];

    tempList.splice(newPosition, 0, target);
    return tempList;
};

const getOperationTime = async (sData,sIndex,aIndex,gIndex) => {
    let temp = "none";
    for await (let iCount of sData) {
        const iStartTime = iCount.opening_time.substring(0, 2);
        const iEndTime = iCount.closing_time.substring(0, 2);
        if(gIndex.toString() === iCount.day_of_week.toString()){
            if(parseInt(aIndex) <= parseInt(iEndTime)){
                if(parseInt(sIndex) >= parseInt(iStartTime)){
                temp = await congestionDecision(iCount.congestion_type);
                }
            } else {
                if(parseInt(sIndex) <= parseInt(iEndTime)){
                temp = await congestionDecision(iCount.congestion_type);
                }
            }
        }
    }

    return temp;
}

const searchKakaoAddress = async (sQuery) => {
    let oResult = {};

    const oResKakaoAddress = await axios({
        url: 'https://dapi.kakao.com/v2/local/search/address.json',
        method: "get",
        params: {
            analyze_type: 'similar',
            page: 1,
            size: 10,
            query: sQuery
        },
        timeout: (15 * 1000),
        headers: {
            Authorization: 'KakaoAK d9d0e02b55d250f7014e2485bf97890e'
        },
        transformResponse: [(data) => {
            return data;
        }],
    });

    if (oResKakaoAddress.status != undefined && oResKakaoAddress.status === 200) {
        let oRes = oResKakaoAddress.data;
        let oParsedRes = JSON.parse(oRes);

        let aAddress = [];
        if (oParsedRes.documents != undefined) {
            let oAdd = {};
            for (let oAddress of oParsedRes.documents) {
                oAdd = {
                x: oAddress['x'],
                y: oAddress['y']
                }
                aAddress.push(oAdd);
            }
        }

        oResult.success = true;
        oResult.address = aAddress;
    } else {
        oResult.success = false;
    }
    return oResult;
}

const beforeSave = user => {
   if (!user.password) return Promise.resolve(user)

   // `password` will always be hashed before being saved.
   return hashPassword(user.password)
      .then(hash => ({ ...user, password: hash }))
      .catch(err => `Error hashing password: ${err}`)
}

const fnCopyCategory = async (iterator,originalId,copyMenuId) => {
    let categoryId = null;

    const getCategoryCopy = await User.getCategoryCopy(parseInt(iterator));
    if(getCategoryCopy !== undefined && getCategoryCopy !== null){
        const checkCategory = await User.checkCategory(getCategoryCopy[0].name.toString(),parseInt(originalId));
        if(checkCategory !== undefined && checkCategory !== null && checkCategory.length > 0){
            categoryId = checkCategory[0].category_id;
        } else {
            const insertCategory = await Store.insertCategory(copyMenuId, getCategoryCopy[0].name, getCategoryCopy[0].is_main, getCategoryCopy[0].status, getCategoryCopy[0].id_order);
            categoryId = insertCategory[0];
        }
    }

    return categoryId;
}

const fnCopyOption = async (iterator,originalId,copyId) => {
    let productOption = [];

    const optionList = await Store.getOptionListByMenuId(parseInt(iterator));
    if(optionList !== undefined && optionList !== null && optionList.length > 0){
        for await (let i of optionList) {
            let tempOptionList = [];
            let tempProductOption = {};
            let tempOptionType = "";
            let tempOptionMax = "";
            let tempOptionMin = "";
            let optionId = null;
            
            const checkOption = await Store.checkOption(parseInt(originalId),i.name.toString());
            if(checkOption !== undefined && checkOption !== null && checkOption.length > 0){
                optionId = checkOption[0].option_type_id;
            } else {
                const getOptionInfo = await Store.getCopyOptionData(parseInt(i.option_type_id),parseInt(copyId));
                if(getOptionInfo.length > 0){
                    for await (const x of getOptionInfo) {
                        let tempOption = {};
                        tempOption.name = x.name;
                        tempOption.price = x.price;
                        tempOptionList.push(tempOption);
                        
                        tempOptionType = x.input_type;
                        tempOptionMin = x.input_min;
                        tempOptionMax = x.input_max;
                    }
                }
                const makeOption = await Store.copyOption(parseInt(originalId),i.name.toString(),tempOptionType,tempOptionMax,tempOptionMin,tempOptionList);
                if(makeOption.result_cd === "0000"){
                    optionId = makeOption.result_id;
                }
            }
            
            if(optionId !== null){
                tempProductOption.key = optionId;
                productOption.push(tempProductOption);
            }
        }
    }

    return productOption;
}

const salesStoreCalculate = async (store_id,from_date,to_date) => {
    let iResult = {
       total: 0,
       order: 0,
       cancel: 0,
       totalPayWon: 0,
       totalPay: 0,
    };
 
    const result = await Order.getAllOrderList(parseInt(store_id), from_date, to_date);
    if(result.length > 0){
       for await (let i of result) {
          if(i.cancelled_at !== null){
             iResult.cancel += 1;
          } else {
             if(i.amount !== undefined && i.amount !== null){
                iResult.totalPay = iResult.totalPay + Math.floor(parseFloat(i.amount));
             }
             iResult.total += 1;
             iResult.order += 1;
          }
       }
    }
    iResult.totalPayWon = convertToKRW(iResult.totalPay, true);
    iResult.totalPay = iResult.totalPay
 
    return iResult;
 }

// The authentication controller.
var AuthController = {};

AuthController.brandStoreRegister = async (req, res) => {
    let sResult = {
        resultCd: false,
        resultMsg: "네트워크 에러입니다"
    };

    try {
        const sName = req.body.sName;
        const sEmail = req.body.sEmail;
        const sPassword = req.body.sPassword;
        const sPhone = req.body.sPhone;
        const storeList = req.body.storeList;

        if(sName === undefined || sName === null || sName === ""){
            sResult.resultMsg = "브랜드명을 입력바랍니다.";
        } else if (sEmail === undefined || sEmail === null || sEmail === "") {
            sResult.resultMsg = "이메일을 입력바랍니다.";
        } else if (sPassword === undefined || sPassword === null || sPassword === "") {
            sResult.resultMsg = "비밀번호를 입력바랍니다.";
        } else if (sPhone === undefined || sPhone === null || sPhone === "") {
            sResult.resultMsg = "전화번호를 입력바랍니다.";
        } else if (storeList === undefined || storeList === null || storeList.length < 1) {
            sResult.resultMsg = "브랜드 매장을 선택 바랍니다.";
        } else {
            const brandStore = await Sales.brandStore(sName,sEmail,sPassword,sPhone,storeList);
            if(brandStore.result_cd === "0000"){
                sResult.resultCd = true;
                sResult.resultMsg = "등록되었습니다.";
            }
        }

    } catch (error) {
        console.log("brandStoreRegister fail !!! ===>", error);
    }
    res.status(200).json(sResult);
}

AuthController.findEmail = async (req, res) => {
    let sResult = true;
    const store_id = req.params.sIndex;
 
    try {
       if (store_id != undefined && store_id != null && store_id != "") {
          const result = await Sales.findByEmail(store_id);
          if (result != undefined && result != null) {
             if (result[0].count < 1) {
                sResult = false;
             }
          }
       }
    } catch (error) {
       console.log("RegisterController.findEmail fail !!! ===>", error);
    }
    res.status(200).json(sResult);
 }

AuthController.salesStoreCalculate = async (req, res) => {
    const fromDate = req.body.fromDate;
    const toDate = req.body.toDate;
    const salesId = req.body.sales_id;

    let iResult = [];
    try {
        const getSalesTeamData = await User.getSalesTeamData(parseInt(salesId));
        if(getSalesTeamData !== undefined && getSalesTeamData !== null){
            if(getSalesTeamData.length > 0){
                for await (let iterator of getSalesTeamData) {
                    let temp = {};
                    if(iterator.store_name !== undefined && iterator.store_name !== null && iterator.store_name !== ""){
                        temp.storeNm = iterator.store_name + " 매장";
                    } else {
                        temp.storeNm = iterator.email.toString();
                    }

                    const result = await salesStoreCalculate(parseInt(iterator.store_id),fromDate,toDate);
                    temp.total = result.total;
                    temp.order = result.order;
                    temp.cancel = result.cancel;
                    temp.totalPayWon = result.totalPayWon;
                    temp.totalPay = result.totalPay;

                    iResult.push(temp);
                }
            }
        }
    } catch (error) {
        console.log("salesStoreCalculate fail !=== > ", error);
    }

    res.status(200).json(iResult);
}

AuthController.productCopyToStore = async (req, res) => {
    let oResult =  "9999";

    try {
        const salesId = req.body.sales_id;
        const copyId = req.body.from;
        const originalId = req.body.to;
        const targetKeys = req.body.targetKeys;
        
        let checkSalesId = true;
        let process1 = false;
        let process2 = false;
        let copyMenuId = null;
        
        if(salesId === undefined || salesId === null){
            checkSalesId = false;
        }
        if (copyId === undefined || copyId === null) {
            checkSalesId = false;
        }
        if (originalId === undefined || originalId === null) {
            checkSalesId = false;
        }
        if (targetKeys === undefined || targetKeys === null || targetKeys.length < 1) {
            checkSalesId = false;
        }
        
        if(checkSalesId){
            let checkSales = await User.checkSalesId(parseInt(copyId),parseInt(salesId));
            if(checkSales !== undefined && checkSales !== null && checkSales.length > 0){
                process1 = true;
            }
        }
        
        if(process1){
            const checkMenuId = await Store.checkMenuId(parseInt(originalId));
            if(checkMenuId !== undefined && checkMenuId.length > 0){
                copyMenuId = parseInt(checkMenuId[0].menu_id);
                process2 = true;
            } else {
                const insertMenuId = await Store.insertMenuId("메뉴",parseInt(originalId));
                if(insertMenuId[0] != undefined){
                    copyMenuId = insertMenuId[0];
                    process2 = true;
                }
            }
        }
        
        if(process2){
            for await (const iterator of targetKeys) {
                let categoryId = null;
                let productOption = [];
                if(copyMenuId !== null){
                    const sCategory = await fnCopyCategory(iterator.key,originalId,copyMenuId);
                    const sOption = await fnCopyOption(iterator.key,originalId,copyId);
                    categoryId = sCategory;
                    productOption = sOption;
                }
                
                if(categoryId !== null){
                    const getProductCopy = await Store.getProductCopy(parseInt(copyId),parseInt(iterator.key));
                    if(getProductCopy !== undefined && getProductCopy !== null && getProductCopy.length > 0){
                        const checkProductId = await Store.checkProductId(parseInt(originalId),getProductCopy[0].name.toString());
                        if(checkProductId === undefined || checkProductId === null || checkProductId.length < 1){
                            await Store.copyProduct(parseInt(originalId),getProductCopy[0].name.toString(),getProductCopy[0].description.toString(),getProductCopy[0].org_price,getProductCopy[0].base_price,getProductCopy[0].id_order,getProductCopy[0].file_name,getProductCopy[0].full_path,getProductCopy[0].url_path,categoryId,productOption);
                        }
                    }
                }
            }
            oResult = "0000";
        }

    } catch (error) {
        console.log("AuthController.productCopyToStore fail ===>",error);
    }
    res.json(oResult);
}

AuthController.editStoreId = async (req, res) => {
    const storeId = req.body.store_id;
    const targetId = req.body.targetId;

    let oResult = false;
    try {
        if(storeId !== undefined && targetId !== undefined){
            const result = await Sales.editStoreId(storeId,targetId);
            if(result !== undefined && result !== null){
                oResult = true;
            }
        }
    } catch (error) {
        console.log("editStoreId fail! error ======> ",error);
    }

    res.json(oResult);
}

AuthController.editStorePw = async (req, res) => {
    const storeId = req.body.store_id;
    const targetPw = req.body.targetPw;

    let oResult = false;
    try {
        if(storeId !== undefined && targetPw !== undefined){
            const convertTo = await beforeSave({ password: targetPw });
            const result = await Sales.editStorePw(storeId,convertTo.password,);
            if(result !== undefined && result !== null){
                oResult = true;
            }
        }
    } catch (error) {
        console.log("editStorePw fail! error ======> ",error);
    }

    res.json(oResult);
}

AuthController.authenticateUserV2 = async (req, res) => {
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

                oResult.resultId = "0000";
                oResult.loginId = sUser;
                oResult.loginPw = isSales.password;
                oResult.salesId = isSales.admin_user_id;
                oResult.groupId = isSales.group_id;
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
        console.log("authenticateUserV2 fail! error ======> ",error);
    }

   res.json(oResult);
}

AuthController.partnersSignUp = async (req, res) => {
    const sName = req.body.sName;
    const sPhone = req.body.sPhone;
    const sEmail = req.body.sEmail;
    const sPassword = req.body.sPassword;
    const sToken = req.body.token;

    let groupList = [];
    let salesId = null;
    let oResult = {
        resultId: "3333",
        resultMsg : "네트워크 에러입니다",
        messageList: []
    };
    try {
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
            const insertSalesUser = await User.salesUserSignUp(sName,"미정",sEmail,sPhone,convertTo.password,99999,"미정");
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
                    oResult.resultId = "0000";
                    oResult.loginId = sEmail;
                    oResult.loginPw = isSales.password;
                    oResult.salesId = isSales.admin_user_id;
                    oResult.groupId = isSales.group_id;
                    oResult.salesName = isSales.full_name;
                    oResult.salesCompany = isSales.group_name;
                    oResult.salesPhone = isSales.phone_number;
                    oResult.amountStore = (getAllGroupStore !== undefined && getAllGroupStore.length > 0) ? parseInt(getAllGroupStore[0].sCount) : 0;
                    oResult.coworkerList = groupList;
                }
            }
        }
    } catch (error) {
        console.log("partnersSignUp fail! error ======> ",error);
    }

   res.json(oResult);
}

AuthController.autoLogin = async (req, res) => {
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
                
                oResult.resultId = "0000";
                oResult.loginId = sUser;
                oResult.loginPw = isSales.password;
                oResult.salesId = isSales.admin_user_id;
                oResult.groupId = isSales.group_id;
                oResult.salesName = isSales.full_name;
                oResult.salesCompany = isSales.group_name;
                oResult.salesPhone = isSales.phone_number;
                oResult.amountStore = (getAllGroupStore !== undefined && getAllGroupStore.length > 0) ? parseInt(getAllGroupStore[0].sCount) : 0;
                oResult.coworkerList = groupList;
            }
        }
    } catch (error) {
        console.log("autoLogin fail! error ======> ",error);
    }

   res.json(oResult);
}

AuthController.mainDashboad = async (req, res) => {
    const groupId = req.body.groupId;
    
    let oResult = {
        unActive : 0,
        active : 0,
        messageList : [],
        store_id: null,
        store_name: null,
        store_verified: 0,
        store_phone: ""
    };
    try {
        const getUnActiveGroupStore = await Sales.getUnActiveGroupStore(groupId);
        if(getUnActiveGroupStore !== undefined && getUnActiveGroupStore.length > 0){
            oResult.unActive = parseInt(getUnActiveGroupStore[0].sCount)
        }
        const getAllGroupStore = await Sales.getAllGroupStore(groupId);
        if(getAllGroupStore !== undefined && getAllGroupStore.length > 0){
            oResult.active = parseInt(getAllGroupStore[0].sCount)
        }
        const getSalesMessage = await Sales.getAllSalesMessage();
        if(getSalesMessage.length > 0){
            for await (const e of getSalesMessage) {
                let temp = {};
                temp.title = e.title;
                temp.content = e.content;
                temp.date = moment(e.created_at).format('MM-DD');

                if(parseInt(e.group_id) === parseInt(groupId)){
                    oResult.messageList.push(temp);
                } else if(e.type_id === "all"){
                    oResult.messageList.push(temp);
                }
            }
        }
        const getUnActiveStoreLimit = await Sales.getUnActiveStoreLimit(groupId);
        if(getUnActiveStoreLimit !== undefined && getUnActiveStoreLimit.length > 0){
            oResult.store_id = parseInt(getUnActiveStoreLimit[0].store_id)
            oResult.store_name = (getUnActiveStoreLimit[0].store_name !== undefined && getUnActiveStoreLimit[0].store_name !== null && getUnActiveStoreLimit[0].store_name !== "") ? getUnActiveStoreLimit[0].store_name : getUnActiveStoreLimit[0].email
            oResult.store_verified = parseInt(getUnActiveStoreLimit[0].verified)
            oResult.store_phone = getUnActiveStoreLimit[0].phone_number
        }
    } catch (error) {
        console.log("autoLogin fail! error ======> ",error);
    }

   res.json(oResult);
}

AuthController.proprietorshipV2 = async (req, res) => {
    let oResult = {
        resultCd: "9999",
        resultMsg: "네트워크 에러입니다 잠시 후 다시 시도 바랍니다.",
    };

    try {
        const storeId = req.body.store_id;
        const storeName = req.body.storeName;
        const storeOwner = req.body.storeOwner;
        const sBusinessNm = req.body.sBusinessNm;
        const sPhoneNm = req.body.sPhoneNm;
        const sEmail = req.body.sEmail;
        const sAccountNm = req.body.sAccountNm;
        const sBank = req.body.sBank;
        const sExtraAddress = req.body.sExtraAddress;
        const sAddress = req.body.sAddress;

        if (storeId === undefined || storeId === null || storeId === "") {
            oResult.resultCd = "1111";
            oResult.resultMsg = "필수정보가 누락되었습니다.";
        } else if (storeName === undefined || storeName === null || storeName === "") {
            oResult.resultCd = "1111";
            oResult.resultMsg = "상호명이 누락되었습니다.";
        } else if (storeOwner === undefined || storeOwner === null || storeOwner === "") {
            oResult.resultCd = "1111";
            oResult.resultMsg = "대표자명이 누락되었습니다.";
        } else if (sBusinessNm === undefined || sBusinessNm === null || sBusinessNm === "") {
            oResult.resultCd = "1111";
            oResult.resultMsg = "사업자번호가 누락되었습니다.";
        } else if (sBusinessNm.length < 10) {
            oResult.resultCd = "1111";
            oResult.resultMsg = "올바르지 못한 사업자번호입니다.";
        } else if (sAddress === undefined || sAddress === null || sAddress === "") {
            oResult.resultCd = "1111";
            oResult.resultMsg = "주소가 누락되었습니다.";
        } else if (sPhoneNm === undefined || sPhoneNm === null || sPhoneNm === "") {
            oResult.resultCd = "1111";
            oResult.resultMsg = "전화번호가 누락되었습니다.";
        } else if (sEmail === undefined || sEmail === null || sEmail === "") {
            oResult.resultCd = "1111";
            oResult.resultMsg = "이메일정보가 누락되었습니다.";
        } else if (sAccountNm === undefined || sAccountNm === null || sAccountNm === "") {
            oResult.resultCd = "1111";
            oResult.resultMsg = "계좌번호가 누락되었습니다.";
        } else if (sBank === undefined || sBank === null || sBank === "") {
            oResult.resultCd = "1111";
            oResult.resultMsg = "은행명이 누락되었습니다.";
        } else {
            let userId = false;
            let isSales = false;
            let isRenew = false;
            let merchantName = storeOwner;
            let merchantNm = sBusinessNm;
            let sParam = "";
            let sLat = parseFloat(37.5657);
            let sLng = parseFloat(126.9769);

            const sLatLng = await searchKakaoAddress(sAddress);
            if (sLatLng.success && sLatLng != undefined && sLatLng.address != undefined && sLatLng.address.length > 0) {
                sLat = parseFloat(sLatLng.address[0].y);
                sLng = parseFloat(sLatLng.address[0].x);
            }

            let merchantCheck = await User.merchantInfoCheck(storeId);
            if (merchantCheck.length > 0) {
                merchantCheck = merchantCheck[0];
                if (parseInt(merchantCheck.status) > 0) {
                merchantName = merchantCheck.full_name.toString();
                merchantNm = merchantCheck.business_number.toString();
                }
            }

            let storeCheck = await User.pickUpInfoCheck(storeId);
            if (storeCheck.length > 0) {
                storeCheck = storeCheck[0];
                if (storeCheck.address1 !== undefined && storeCheck.address1 !== null && storeCheck.address1 !== "") {
                sParam = "skip";
                }
            }

            const isLost = await User.haveSalesCode(storeId);
            if (isLost !== undefined && isLost !== null && isLost.length > 0) {
                isSales = true;
            } else {
                const renewId = await User.isRenewStore(storeId);
                if (renewId !== undefined && renewId !== null && renewId.length > 0) {
                isRenew = true;
                } else {
                userId = await User.userId(storeId);
                }
            }

            let bytes = CryptoJS.AES.encrypt(sAccountNm, config.keys.secret).toString();
            const result = await User.proprietorshipInsert(sLat, sLng, sAddress, sExtraAddress, storeName, merchantName, merchantNm, sPhoneNm, sEmail, bytes, sBank, storeId, sParam, isSales, isRenew, userId);
            if (result === "0000") {
                oResult.resultCd = "0000";
                oResult.resultMsg = "사업자등록이 완료되었습니다."
            }
        }
    } catch (error) {
        console.log("proprietorship fail !!! ===>", error);
    }

    res.status(200).json(oResult);
}


AuthController.userBusinessInfo = async (req, res) => {
    let sResult = {
        resultCd: "9999" 
    };

    try {
        const storeId = req.params.sParam;
        let result = await User.userBusinessInfo(storeId);
        if(result !== undefined && result !== null){
            if(result.length > 0){
                result = result[0];
                
                sResult.resultCd = "0000";
                sResult.address1 = "";
                sResult.address2 = "";
                sResult.store_name = "";
                sResult.bank_name = "";
                sResult.business_number = "";
                sResult.full_name = result.full_name;
                sResult.email = result.email;
                sResult.account_nm = "";
                sResult.userPhone = "";
                sResult.lock = false;
                
                if(result.status !== undefined && result.status !== null && parseInt(result.status) > 0){
                    sResult.lock = true;
                }
                if(result.account_nm !== undefined && result.account_nm !== null && result.account_nm !== ""){
                    let bytes = CryptoJS.AES.decrypt(result.account_nm, config.keys.secret);
                    sResult.account_nm = bytes.toString(CryptoJS.enc.Utf8);
                }
                if(result.business_number !== undefined && result.business_number !== null && result.business_number !== ""){
                    sResult.business_number = result.business_number;
                }
                if(result.bank_name !== undefined && result.bank_name !== null && result.bank_name !== ""){
                    sResult.bank_name = result.bank_name;
                }
                if(result.store_name !== undefined && result.store_name !== null && result.store_name !== ""){
                    sResult.store_name = result.store_name;
                }
                if(result.mAddress1 !== undefined && result.mAddress1 !== null && result.mAddress1 !== ""){
                    sResult.address1 = result.mAddress1;
                } else if (result.sAddress1 !== undefined && result.sAddress1 !== null && result.sAddress1 !== ""){
                    sResult.address1 = result.sAddress1;
                }
                if(result.mAddress2 !== undefined && result.mAddress2 !== null && result.mAddress2 !== ""){
                    sResult.address2 = result.mAddress2;
                } else if (result.sAddress2 !== undefined && result.sAddress2 !== null && result.sAddress2 !== ""){
                    sResult.address2 = result.sAddress2;
                }
                if(result.mPhone !== undefined && result.mPhone !== null && result.mPhone !== ""){
                    sResult.userPhone = result.mPhone;
                } else if (result.sPhone !== undefined && result.sPhone !== null && result.sPhone !== ""){
                    sResult.userPhone = result.sPhone;
                }
            }
        }
    } catch (error) {
        console.log("currentStatus fail! ====>> error:", error);
    }

    res.status(200).json(sResult);
}

AuthController.settingStoreDetail = async (req, res) => {
    let oResult = {
        resultCd : "unlocked",
        plainOptions : [],
        cafeOptions : [],
        shopOptions : [],
        mainType : [],
        subType : [],
        sInfo : "",
        sNoti : "",
        sDetail : "",
        mainTypeNm: "",
        isSub: {}
    };
    let zNm = 1;
    let aNm = 1;
    let sNm = 1;
    let iNm = 1;
    let xNm = 1;

    try {
        const store_id = req.params.store_id;
        const storeDetail = await Store.getStoreText(store_id);
        if(storeDetail != undefined){
            if(storeDetail[0].description != undefined && storeDetail[0].description != null && storeDetail[0].description != ""){
                oResult.sInfo = await storeDetail[0].description;
            }

            if(storeDetail[0].description_extra != undefined && storeDetail[0].description_extra != null && storeDetail[0].description_extra != ""){
                oResult.sDetail = await storeDetail[0].description_extra;
            }

            if(storeDetail[0].description_noti != undefined && storeDetail[0].description_noti != null && storeDetail[0].description_noti != ""){
                oResult.sNoti = await storeDetail[0].description_noti;
            }
        }

        const sType = await Sales.getMainType(store_id); 
        if(sType.length > 0){
            for await (const gCount of sType) {
                let temp = {};
                if(gCount.is_main.toString() === "1"){
                    if(gCount.typeId.toString() === "1"){
                        oResult.mainTypeNm = "카페";
                    } else if (gCount.typeId.toString() === "2"){
                        oResult.mainTypeNm = "음식점";
                    } else if (gCount.typeId.toString() === "8"){
                        oResult.mainTypeNm = "숍";
                    }
                    temp.key = zNm;
                    temp.name = gCount.name.toString();
                    oResult.mainType.push(temp);
                    zNm += 1;
                } else {
                    let tempSub = {};
                    if(gCount.typeId.toString() === "1"){
                        tempSub.key = "2";
                        tempSub.name = "카페";
                    } else if (gCount.typeId.toString() === "2"){
                        tempSub.key = "1";
                        tempSub.name = "음식점";
                    } else if (gCount.typeId.toString() === "8"){
                        tempSub.key = "3";
                        tempSub.name = "숍";
                    }
                    temp.name = gCount.name.toString();
                    oResult.subType.push(temp);
                    oResult.isSub = tempSub;
                    aNm += 1;
                }
            }
            oResult.resultCd = "locked";
        }

        const getList = await Store.getStoreType();
        for await (const iterator of getList) {
            if(iterator.parent_store_type_id.toString() === "2"){
                let temp = {
                    key: sNm,
                    name: iterator.name.toString()
                }
                oResult.plainOptions.push(temp);
                sNm += 1;
            }else if(iterator.parent_store_type_id.toString() === "1"){
                let temp = {
                    key: iNm,
                    name: iterator.name.toString()
                }
                oResult.cafeOptions.push(temp);
                iNm += 1;
            }else if(iterator.parent_store_type_id.toString() === "8"){
                let temp = {
                    key: xNm,
                    name: iterator.name.toString()
                }
                oResult.shopOptions.push(temp);
                xNm += 1;
            }
        }
        oResult.plainOptions.push({});
        oResult.cafeOptions.push({});
        oResult.shopOptions.push({});
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}

AuthController.editStoreInfo = async (req, res) => {
    const storeId = req.body.store_id;
    const sInfo = req.body.sInfo;
    const sNoti = req.body.sNoti;
    const sDetail = req.body.sDetail;
    const mainType = req.body.mainType;
    const subType = req.body.subType;
    const haveSubList = req.body.isSub;
    
    let oResult = false;
    let isSub = false;
    let sResult = [];
    let iResult = [];

    try {
        if(mainType.length > 0){

            for await (const iterator of mainType) {
                let temp = null;
                const getParam = await Store.getParamType(iterator.name.toString());
                if(getParam !== undefined && getParam !== null){
                    temp = getParam.store_type_id;
                }
                sResult.push(temp);
            }
            if(haveSubList !== undefined){
                if(haveSubList.key !== undefined && haveSubList.key.toString() !== "4"){
                    if(subType.length > 0){
                        for await (const iterator of subType) {
                            let temp = null;
                            const subTypeName = await Store.getParamType(iterator.name.toString());
                            if(subTypeName != undefined && subTypeName != null){
                                temp = subTypeName.store_type_id;
                            }
                            iResult.push(temp);
                        }
                        isSub = true;
                    }
                }
            }
            
            const result = await Store.editStoreType(storeId,sResult,iResult,isSub,sInfo,sNoti,sDetail);
            if(result === "0000"){
                oResult = true;
            }
        }
    } catch (error) {
        console.log("editStoreInfo failll   ===>>>",error);
    }

    res.status(200).json(oResult);
}

AuthController.orderTime = async (req, res) => {
    let sResult = false;
    let oWalkTime = "";
    
    try {
        const storeId = req.body.store_id;
        const otFirst = req.body.sEasy;
        const otMiddle = req.body.sNormal;
        const otLast = req.body.sBusy;
        
        if(req.body.sWalkThroo !== undefined && req.body.sWalkThroo !== null && req.body.sWalkThroo !== ""){
            oWalkTime = req.body.sWalkThroo;
            const checkUp = await Store.checkWalkThrooCongestionTime(storeId);
            if(checkUp.length > 0) {} else {
                await Store.insertWalkThrooCongestionTime(oWalkTime,storeId);
            }
        }
        const result = await Store.orderTimeUpdate(otFirst,otMiddle,otLast,oWalkTime,storeId);
        if(result === "0000"){
            sResult = true;
        }
        
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(sResult);
}

AuthController.orderTimeDesc = async (req, res) => {
    let oResult = {};

    const store_id = req.params.store_id;
    const storeDesc = await Store.storeDesc(store_id);
    if(storeDesc != undefined && storeDesc != null){
        oResult.result_cd = "0000";
        oResult.sEasy = "1";
        oResult.sNormal = "25";
        oResult.sBusy = "40";
        oResult.sWalkThroo = "";

        const storeOrderTime = await Store.storeOrderTime(store_id);
        for await (let i of storeOrderTime) {
            if(parseInt(i.congestion_type) < 1){
                oResult.sEasy = i.minute;
            } else if (0 < parseInt(i.congestion_type) && parseInt(i.congestion_type) < 2){
                oResult.sNormal = i.minute;
            } else if (1 < parseInt(i.congestion_type) && parseInt(i.congestion_type) < 3){
                oResult.sBusy = i.minute;
            }
        }

        const walkThrooTime = await Store.storeWalkThrooOrderTime(store_id);
        if(walkThrooTime.length > 0){
            oResult.sWalkThroo = walkThrooTime[0].minute;
        }

    } else {
        oResult.result_cd = "9999";
    }

    res.status(200).json(oResult);
}


AuthController.editPickUpInfo = async (req, res) => {
    const store_id = req.body.store_id;
    const sAddress = req.body.sAddress;
    const sExtraAddress = req.body.sExtraAddress;
    const sPhoneNm = req.body.sPhoneNm;
    const sNoti = req.body.sNotsNearByDistanceValue;
    const sParkingTime = req.body.sParkingTime;

    let sLat = parseFloat(37.5657);
    let sLng = parseFloat(126.9769);
    let sParam = "";
    let oResult = false;

    try {
        let merchantCheck = await User.merchantInfoCheck(store_id);
        if(merchantCheck.length > 0){
            merchantCheck = merchantCheck[0];
            if(parseInt(merchantCheck.status) > 0){
                sParam = "skip";
            }
        }
        const sLatLng = await searchKakaoAddress(sAddress);
        if(sLatLng.success && sLatLng != undefined && sLatLng.address != undefined && sLatLng.address.length > 0){
            sLat = parseFloat(sLatLng.address[0].y);
            sLng = parseFloat(sLatLng.address[0].x);
        }
        const result = await Store.editPickUp(sLat,sLng,sAddress,sExtraAddress,sPhoneNm,sNoti,sParkingTime,store_id,sParam);
        if(result != undefined){
            oResult = true;
        }
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}


AuthController.getPickUpInfo = async (req, res) => {
    const store_id = req.params.store_id;
    let oResult = {
        address : "",
        extraAddress : "",
        Nm : "",
        parkingTime : 5,
        sNoti : 100,
    };

    try {
        let result = await Store.getPickUpInfo(store_id);
        if(result !== undefined && result !== null){
            result = result[0];

            if(result.sAddress1 !== undefined && result.sAddress1 !== null && result.sAddress1 !== ""){
                oResult.address = result.sAddress1;
            } else if (result.mAddress1 !== undefined && result.mAddress1 !== null && result.mAddress1 !== "") {
                oResult.address = result.mAddress1;
            }
            if(result.sAddress2 !== undefined && result.sAddress2 !== null && result.sAddress2 !== ""){
                oResult.extraAddress = result.sAddress2;
            } else if (result.mAddress2 !== undefined && result.mAddress2 !== null && result.mAddress2 !== "") {
                oResult.extraAddress = result.mAddress2;
            }
            if(result.sPhone !== undefined && result.sPhone !== null && result.sPhone !== ""){
                oResult.Nm = result.sPhone;
            } else if (result.mPhone !== undefined && result.mPhone !== null && result.mPhone !== "") {
                oResult.Nm = result.mPhone;
            }
            if(result.parking_time !== undefined && result.parking_time !== null && result.parking_time !== ""){
                oResult.parkingTime = result.parking_time;
            }
            if(result.noti_nearby_distance !== undefined && result.noti_nearby_distance !== null && result.noti_nearby_distance !== ""){
                oResult.sNoti = result.noti_nearby_distance;
            }
        }
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}


AuthController.editParkingImage = async (req, res) => {
    const storeId = req.body.store_id;
    const imageType = req.body.imageType;
    
    let sResult = false;
    let imgData = "";

    try {
        if(imageType !== "delete"){
            imgData = req.body.imgData;
        }

        const result = await Store.updateParkingImg(imgData,storeId);
        if(result !== undefined){
            sResult = true;
        }
    } catch (error) {
        console.log("editParkingImage fail! ====>> error:", error);
    }

    res.status(200).json(sResult);
}

AuthController.getPickUpZoneInfo = async (req, res) => {
    const store_id = req.params.store_id;

    let tempViewPoint = {
        pan: 0,
        tilt: 0,
        zoom: 0,
    };
    let oResult = {
        lat : 37.566611,
        lng : 126.978441,
        pointView : tempViewPoint,
        sParkingImg : "",
    };

    try {
        let storeDesc = await Store.getPickUpZoneInfo(store_id);
        if(storeDesc !== undefined && storeDesc !== null){
            if(storeDesc.length > 0){
                storeDesc = storeDesc[0];
                if(storeDesc.lat !== undefined && storeDesc.lat !== null){
                    oResult.lat = storeDesc.lat;
                }
                if(storeDesc.lng !== undefined && storeDesc.lng !== null){
                    oResult.lng = storeDesc.lng;
                }
                if(storeDesc.parking_pan !== undefined && storeDesc.parking_pan !== null){
                    tempViewPoint.pan = storeDesc.parking_pan;
                    oResult.pointView = tempViewPoint;
                }
                if(storeDesc.parking_tilt !== undefined && storeDesc.parking_tilt !== null){
                    tempViewPoint.tilt = storeDesc.parking_tilt;
                    oResult.pointView = tempViewPoint;
                }
                if(storeDesc.parking_zoom !== undefined && storeDesc.parking_zoom !== null){
                    tempViewPoint.zoom = storeDesc.parking_zoom;
                    oResult.pointView = tempViewPoint;
                }
                if(storeDesc.parking_image !== undefined && storeDesc.parking_image !== null && storeDesc.parking_image !== ""){
                    oResult.sParkingImg = storeDesc.parking_image;
                }
            }
        }

    } catch (error) {
        console.log(error);
    }

    res.status(200).json(oResult);
}

AuthController.setPickUpZone = async (req, res) => {
    const storeId = req.body.store_id;
    const sLat = req.body.lat;
    const sLng = req.body.lng;
    const sViewPoint = req.body.viewPoint;
    
    let sResult = false;
    try {
        const toDate = moment().format("YYYY-MM-DD");
        const getAdverEvent = await Store.getAdverEvent(parseInt(storeId),toDate);
        if(getAdverEvent.length > 0){
            let param = sLat + "," + sLng + "," + storeId;
            let eventId = getAdverEvent[0].event_id;
            await Store.updateCommercialPickUpZoneData(eventId,sLat,sLng,param);
        }

        const result = await Store.setPickUpZone(sLat,sLng,sViewPoint,storeId);
        if(result !== undefined){
            sResult = true;
        }
    } catch (error) {
        console.log("editParkingImage fail! ====>> error:", error);
    }

    res.status(200).json(sResult);
}

AuthController.editStoreOperationV2 = async (req, res) => {
    let stringList = [];
    let iDriveThru = 0;
    let iWalkThru = 0;
    let iDayType = "day";
    let iStoreType = 1;
    let oResult = {
        resultCd: false,
        pickup: 1
    };

    try {
        const store_id = req.body.store_id;
        const sData = req.body.sData;

        if(sData.length > 0){
            for await (let dataLink of sData) {
                let tempDay = "";
                if (dataLink.day_of_week > 0 && dataLink.day_of_week < 2){
                    if(dataLink.congestion_type.toString() === "3"){
                        tempDay = "일요일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iWalkThru += 1;
                    } else {
                        tempDay = "월요일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iDriveThru += 1;
                    }
                } else if (dataLink.day_of_week > 1 && dataLink.day_of_week < 3){
                    if(dataLink.congestion_type.toString() === "3"){
                        tempDay = "화요일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iWalkThru += 1;
                    } else {
                        tempDay = "화요일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iDriveThru += 1;
                    }
                } else if (dataLink.day_of_week > 2 && dataLink.day_of_week < 4){
                    if(dataLink.congestion_type.toString() === "3"){
                        tempDay = "수요일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iWalkThru += 1;
                    } else {
                        tempDay = "수요일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iDriveThru += 1;
                    }
                } else if (dataLink.day_of_week > 3 && dataLink.day_of_week < 5){
                    if(dataLink.congestion_type.toString() === "3"){
                        tempDay = "목요일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iWalkThru += 1;
                    } else {
                        tempDay = "목요일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iDriveThru += 1;
                    }
                } else if (dataLink.day_of_week > 4 && dataLink.day_of_week < 6){
                    if(dataLink.congestion_type.toString() === "3"){
                        tempDay = "금요일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iWalkThru += 1;
                    } else {
                        tempDay = "금요일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iDriveThru += 1;
                    }
                } else if (dataLink.day_of_week > 5 && dataLink.day_of_week < 7){
                    if(dataLink.congestion_type.toString() === "3"){
                        tempDay = "토요일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iWalkThru += 1;
                    } else {
                        tempDay = "토요일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iDriveThru += 1;
                    }
                } else if (dataLink.day_of_week > 6 && dataLink.day_of_week < 8){
                    if(dataLink.congestion_type.toString() === "3"){
                        tempDay = "매일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iWalkThru += 1;
                    } else {
                        tempDay = "매일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iDriveThru += 1;
                    }
                } else if (dataLink.day_of_week > 7 && dataLink.day_of_week < 9){
                    if(dataLink.congestion_type.toString() === "3"){
                        tempDay = "평일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iWalkThru += 1;
                    } else {
                        tempDay = "평일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iDriveThru += 1;
                    }
                } else if (dataLink.day_of_week > 8 && dataLink.day_of_week < 10){
                    if(dataLink.congestion_type.toString() === "3"){
                        tempDay = "주말 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iWalkThru += 1;
                    } else {
                        tempDay = "주말 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iDriveThru += 1;
                    }
                } else {
                    if(dataLink.congestion_type.toString() === "3"){
                        tempDay = "일요일 워크스루시간 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iWalkThru += 1;
                    } else {
                        tempDay = "일요일 : " + dataLink.opening_time + "~" + dataLink.closing_time;
                        iDriveThru += 1;
                    }
                }
    
                stringList.push(tempDay);
            }
            stringList = await stringList.join("\n");
    
            if(parseInt(iDriveThru) < 1){
                iStoreType = 2;
            }

            const insertOperation = await Store.insertOperationV2(sData,store_id,stringList,iStoreType);
            if(insertOperation === "0000"){
                for await (let eCount of sData) {
                    if(eCount.day_of_week > 6 && eCount.day_of_week < 8){
                        iDayType = await "everyday";
                    } else if (eCount.day_of_week > 7 && eCount.day_of_week < 10) {
                        iDayType = await "weekly";
                    }
                }
                oResult.resultCd = true;
                oResult.pickup = iStoreType;
            }
        }
    } catch (error) {
        console.log("error",error);
    }
    
    res.status(200).json(oResult);
}

AuthController.editStoreOperation = async (req, res) => {
    let stringList = [];
    let iDayType = "day";
    let oResult = false;

    try {
        const store_id = req.body.store_id;
        const sData = req.body.sData;

        if(sData.length > 0){
            for await (let dataLink of sData) {
                let tempDay = "일요일" + dataLink.opening_time + "~" + dataLink.closing_time;
    
                if (dataLink.day_of_week > 0 && dataLink.day_of_week < 2){
                    tempDay = "월요일" + dataLink.opening_time + "~" + dataLink.closing_time;
                } else if (dataLink.day_of_week > 1 && dataLink.day_of_week < 3){
                    tempDay = "화요일" + dataLink.opening_time + "~" + dataLink.closing_time;
                } else if (dataLink.day_of_week > 2 && dataLink.day_of_week < 4){
                    tempDay = "수요일" + dataLink.opening_time + "~" + dataLink.closing_time;
                } else if (dataLink.day_of_week > 3 && dataLink.day_of_week < 5){
                    tempDay = "목요일" + dataLink.opening_time + "~" + dataLink.closing_time;
                } else if (dataLink.day_of_week > 4 && dataLink.day_of_week < 6){
                    tempDay = "금요일" + dataLink.opening_time + "~" + dataLink.closing_time;
                } else if (dataLink.day_of_week > 5 && dataLink.day_of_week < 7){
                    tempDay = "토요일" + dataLink.opening_time + "~" + dataLink.closing_time;
                } else if (dataLink.day_of_week > 6 && dataLink.day_of_week < 8){
                    tempDay = "매일" + dataLink.opening_time + "~" + dataLink.closing_time;
                } else if (dataLink.day_of_week > 7 && dataLink.day_of_week < 9){
                    tempDay = "평일" + dataLink.opening_time + "~" + dataLink.closing_time;
                } else if (dataLink.day_of_week > 8 && dataLink.day_of_week < 10){
                    tempDay = "주말" + dataLink.opening_time + "~" + dataLink.closing_time;
                }
    
                stringList.push(tempDay);
            }
            stringList = await stringList.join("\n");
    
            const insertOperation = await Store.insertOperation(sData,store_id,stringList);
            if(insertOperation === "0000"){
                for await (let eCount of sData) {
                    if(eCount.day_of_week > 6 && eCount.day_of_week < 8){
                        iDayType = await "everyday";
                    } else if (eCount.day_of_week > 7 && eCount.day_of_week < 10) {
                        iDayType = await "weekly";
                    }
                }
                oResult = true;
            }
        }
    } catch (error) {
        console.log("error",error);
    }
    
    res.status(200).json(oResult);
}

AuthController.getStoreOperationV2 = async (req, res) => {
    let iDayType = "day";
    let sCount = 0;
    let oResult = {
        resultCd : "unlocked",
        sData : [],
        setWalkthru: false,
    };

    try {
        const store_id = req.params.store_id;
        const getList = await Store.getOperationTimeV2(store_id);
        if(getList.length > 0){
            oResult.resultCd = "locked";

            for await (let eCount of getList) {
                if(eCount.day_of_week > 6 && eCount.day_of_week < 8){
                    iDayType = await "everyday";
                } else if (eCount.day_of_week > 7 && eCount.day_of_week < 10) {
                    iDayType = await "weekly";
                }
            }

            for await (let iCount of getList) {
                let temp = {};
                let tempDay = "일요일";
                let tempTime = "";
                let tempCongestionTime = 0;

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

                if (iCount.congestion_type > 0 && iCount.congestion_type < 2){
                    tempTime = "보통";
                    tempCongestionTime = 1;
                } else if (iCount.congestion_type > 1 && iCount.congestion_type < 3){
                    tempTime = "바쁨";
                    tempCongestionTime = 2;
                } else {
                    if(iCount.pickup_type > 1 && iCount.pickup_type < 3){
                        tempTime = "워크스루";
                        tempCongestionTime = 3;
                    } else {
                        tempTime = "여유";
                        tempCongestionTime = 0;
                    }
                }

                temp.key = sCount + 1;
                temp.day = tempDay;
                temp.operation = iCount.opening_time + "~" + iCount.closing_time;
                temp.time = tempTime;
                temp.day_of_week = iCount.day_of_week;
                temp.congestion_type = tempCongestionTime;
                temp.opening_time = iCount.opening_time;
                temp.closing_time = iCount.closing_time;

                oResult.sData.push(temp);
                sCount += 1;
            }
        }

        const walkThrooTime = await Store.storeWalkThrooOrderTime(store_id);
        if(walkThrooTime.length > 0){
            oResult.setWalkthru = true;
        }

    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}

AuthController.getStoreOperation = async (req, res) => {
    let iDayType = "day";
    let sCount = 0;
    let oResult = {
        resultCd : "unlocked",
        sData : [],
    };

    try {
        const store_id = req.params.store_id;
        const getList = await Store.getOperationTime(store_id);
        if(getList.length > 0){
            oResult.resultCd = "locked";

            for await (let eCount of getList) {
                if(eCount.day_of_week > 6 && eCount.day_of_week < 8){
                    iDayType = await "everyday";
                } else if (eCount.day_of_week > 7 && eCount.day_of_week < 10) {
                    iDayType = await "weekly";
                }
            }

            for await (let iCount of getList) {
                let temp = {};
                let tempDay = "일요일";
                let tempTime = "여유";

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

                if (iCount.congestion_type > 0 && iCount.congestion_type < 2){
                    tempTime = "보통";
                } else if (iCount.congestion_type > 1 && iCount.congestion_type < 3){
                    tempTime = "바쁨";
                }

                temp.key = sCount + 1;
                temp.day = tempDay;
                temp.operation = iCount.opening_time + "~" + iCount.closing_time;
                temp.time = tempTime;
                temp.day_of_week = iCount.day_of_week;
                temp.congestion_type = iCount.congestion_type;
                temp.opening_time = iCount.opening_time;
                temp.closing_time = iCount.closing_time;

                oResult.sData.push(temp);
                sCount += 1;
            }
        }
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}


AuthController.editStoreHoliday = async (req, res) => {
    let oResult = false;
    let officialResult = true;
    let temperaryResult = true;

    try {
        const store_id = req.body.storeId;
        const iList = req.body.iList;
        const temperaryHoliday = req.body.temperaryHoliday;
        const fromDate = req.body.fromDate;
        const toDate = req.body.toDate;

        if(iList.length > 0){
            const insertOfficial = await Store.officialHoliday(iList,0,store_id);
            if(insertOfficial !== "0000"){
                officialResult = false;
            }
        } else {
            const officialHolidayDelete = await Sales.officialHolidayDelete(0,store_id);
            if(officialHolidayDelete === undefined){
                officialResult = false;
            }
        }
        
        if(temperaryHoliday){
            const insertTemperary = await Sales.temperaryHoliday(fromDate,toDate,1,store_id);
            if(insertTemperary !== "0000"){
                temperaryResult = false;
            }
        } else {
            const temperaryHolidayDelete = await Sales.temperaryHolidayDelete(1,store_id);
            if(temperaryHolidayDelete === undefined){
                officialResult = false;
            }
        }
        
        if(officialResult && temperaryResult){
            oResult = true;
        }

    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}


AuthController.getStoreHoliday = async (req, res) => {
    let oResult = {
        official : [],
        holiday_from : moment().format("YYYY-MM-DD"),
        holiday_to : moment().add("days", 1).format("YYYY-MM-DD"),
        oKey : 0,
        tCheck : false,
    };

    let oCount = 0;
    try {
        const store_id = req.params.store_id;
        const result = await Store.getStoreHoliday(store_id);
        if(result.length > 0){
            for await (const iterator of result) {
                if(iterator.type > 0 && iterator.type < 2){
                    oResult.tCheck = true;
                    oResult.holiday_from = moment(iterator.holiday_from).format("YYYY-MM-DD");
                    oResult.holiday_to = moment(iterator.holiday_to).format("YYYY-MM-DD");
                } else {
                    let temp = {};
                    temp.key = oCount + 1;
                    temp.sMethodValue = iterator.date_type;
                    temp.sDayValue = iterator.day_of_week;

                    oResult.official.push(temp);

                    oCount += 1;
                }
            }
            oResult.oKey = oCount;
        }
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}


AuthController.getStoreMediaImage = async (req, res) => {
    const store_id = req.params.store_id;

    let sNm = 0;
    let oResult = {
        url_path_logo : "",
        url_path_first : "",
        url_path_second : "",
        url_path_third : "",
    };

    try {
        const storeDesc = await Store.storeMediaImageV2(store_id);
        if(storeDesc.length > 0){
            for await (let gData of storeDesc) {
                if(gData.url_path !== undefined && gData.url_path !== null && gData.url_path !== ""){
                    if(parseInt(sNm) < 1){
                        oResult.url_path_logo = gData.url_path;
                    } else if(parseInt(sNm) > 0 && parseInt(sNm) < 2){
                        oResult.url_path_first = gData.url_path;
                    } else if(parseInt(sNm) > 1 && parseInt(sNm) < 3){
                        oResult.url_path_second = gData.url_path;
                    } else {
                        oResult.url_path_third = gData.url_path;
                    }
                }
                sNm += 1;
            }
        }
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}

AuthController.registerImageV2 = async (req, res) => {
    let sResult = false;
    let sCount = 0;
    let sList = [];

    try {
        const storeId = req.body.store_id;
        const imgData1 = req.body.imgData1;
        const imgData2 = req.body.imgData2;
        const imgData3 = req.body.imgData3;
        const imgData4 = req.body.imgData4;

        const getMediaId = await Store.getMediaId(storeId);
        console.log("getMediaId",getMediaId);
        if(getMediaId.length > 0){
            for await (const iterator of getMediaId) {
                console.log("iterator",iterator);
                console.log("sCount",sCount);
                let temp = {};
                if(parseInt(sCount) === 0){
                    temp.url_path = imgData1;
                } else if (parseInt(sCount) === 1) {
                    temp.url_path = imgData2;
                } else if (parseInt(sCount) === 2) {
                    temp.url_path = imgData3;
                } else if (parseInt(sCount) === 3) {
                    temp.url_path = imgData4;
                }
                temp.key = parseInt(iterator.media_id);
                sList.push(temp);
                sCount += 1;
                console.log("temp",temp);
            }
            console.log("sList",sList);
            
            const result = await Sales.updateStoreMediaData(sList,storeId);
            console.log("result",result);
            if(result === "0000"){
                sResult = true;
            }
        }

    } catch (error) {
        console.log("error",error);
    }
    res.status(200).json(sResult);
}


AuthController.categoryList = async (req, res) => {
    const store_id = req.params.store_id;

    let sResult = [];
    let noList = "none";
    let sLimit = false;
    let limitMain = 1;
    let mainId = 1;
    try {
        const checkCategory = await Store.checkCategory(store_id);
        if(checkCategory.length > 0){
            if(checkCategory[0].menu_id != undefined && checkCategory[0].menu_id != null){
                noList = parseInt(checkCategory[0].menu_id);
                const result = await Store.getCategoryList(noList);
                if(result.length > 0){
                    let count = 1;
                    for await (let i of result) {
                        let temp = {};
                        temp.key = count;
                        temp.name = i.name;
                        temp.index = i.id_order;
                        temp.id = i.category_id;
                        temp.useYn = "미사용";
                        temp.isMain = "아니오";
                        if(i.status > 0){
                            temp.useYn = "사용중";
                        }
                        if(i.is_main > 0){
                            temp.isMain = "예";
                            mainId = i.category_id;
                            limitMain ++;
                        }
                        count ++;
    
                        sResult.push(temp);
                    }
                }
            }
        }

        if(limitMain > 1){
            sLimit = true;
        }
    } catch (error) {
        console.log("error",error);
    }
    res.status(200).json({sResult,noList,sLimit,mainId});
}

AuthController.insertCategory = async (req, res) => {
    const storeId = req.body.store_id;
    const sContent = req.body.sContent;

    let menuId = req.body.menuId;
    let isMain = req.body.isMain;
    let isUse = req.body.isUse;
    let isProcess = true;
    let oResult = {
        resultCd : "9999",
        resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
    };

    try {
        if(menuId === "none"){
            let sName = storeId + "메뉴";
            const insert = await Store.insertMenuId(sName,storeId);
            if(insert[0] != undefined){
                menuId = insert[0];
            } else {
                isProcess = false;
            }
        }
        
        if(isMain){
            isMain = 1;
        } else {
            isMain = 0;
        }
        if(isUse === "unused"){
            isUse = 0;
        } else {
            isUse = 1;
        }

        let sCount = await Store.categoryListLength(menuId);
        if(sCount != undefined && sCount != null){
            if(sCount[0].count != null){
                sCount = parseInt(sCount[0].count) + 1;
            } else {
                sCount = 0;
            }
        } else {
            isProcess = false;
        }

        let checkTitle = await Store.checkCategoryTitle(menuId,sContent);
        if(checkTitle != undefined && checkTitle != null){
            if(checkTitle[0].count > 0){
                isProcess = false;
                oResult.resultCd = "8888";
                oResult.resultMsg = "같은 이름의 카테고리가 존재합니다";
            }
        } else {
            isProcess = false;
        }

        if(isProcess){
            const insertCategory = await Store.insertCategory(menuId, sContent, isMain, isUse, sCount);
            if(insertCategory[0] != undefined){
                oResult.resultCd = "0000";
                oResult.resultMsg = "등록되었습니다";
            }
        }
    } catch (error) {
        console.log("StoreController.insertCategoryV2 fail !!!!=======> ",error);
    }

    res.status(200).json(oResult);
}
 
AuthController.deleteCategory = async (req, res) => {
    let oResult = false;
    try {
        const categoryId = req.body.category_id;
        const result = await Store.deleteCategory(categoryId);
        if(result != undefined){
            oResult = true;
        } 
    } catch (error) {
        console.log("error",error);
    }
    res.status(200).json(oResult);
    
}


AuthController.editCategoryList = async (req, res) => {
    const sContent = req.body.sContent;
    const menuId = req.body.menuId;

    let isMain = req.body.isMain;
    let isUse = req.body.isUse;

    let oResult = false;

    try {
        if(isMain){
            isMain = 1;
        } else {
            isMain = 0;
        }
        if(isUse){
            isUse = 1;
        } else {
            isUse = 0;
        }

        const result = await Store.editcategory(sContent,menuId,isMain,isUse);
        if(result != undefined){
            oResult = true;
        } 
    } catch (error) {
        console.log("error",error);
    }
    res.status(200).json(oResult);
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
                    }
                    count ++;
                }
            }
        }

        const getoptionList = await Store.getoptionList(store_id);
        if(getoptionList.length > 0){
            let count = 1;
            for await (let i of getoptionList) {
                let temp = {};
                temp.key = count;
                temp.name = i.name;
                temp.id = i.option_type_id;
                if(i.status > 0){
                    aResult.push(temp);
                }
                count ++;
            }
        }

    } catch (error) {
        console.log("error",error);
    }
    res.status(200).json({sResult,aResult});
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
                temp.price = convertToKRW(Math.floor(parseFloat(i.base_price)), true);
                temp.soldOut = "주문가능";
                temp.urlImg = "";
                
                if(i.is_soldout > 0){
                    temp.soldOut = "일시품절";
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

AuthController.insertOptionV2 = async (req, res) => {
    const sData = req.body.sData;
    const store_id = req.body.store_id;
    
    let type = req.body.type;
    let isProcess = true;
    let count = 0;
    let sMin = 0;
    let sGroupTitle = req.body.sGroupTitle;
    let oResult = {
        resultCd : "9999",
        resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
    };

    try {
        if(sData.length > 0){
            if(type === "radioDouble"){
                sMin = parseInt(req.body.minCount);
                count = parseInt(req.body.minCount);
                type = "checkbox";
                if(sData.length < sMin){
                    isProcess = false;
                    oResult.resultCd = "7777";
                    oResult.resultMsg = "최소 선택가능 횟수가 입력된 옵션보다 큽니다";
                }
            } else if (type === "checkbox"){
                count = parseInt(req.body.maxCount);
                if(sData.length < count){
                    isProcess = false;
                    oResult.resultCd = "7777";
                    oResult.resultMsg = "최대 선택가능 횟수가 입력된 옵션보다 큽니다";
                }
            } else {
                type = "radio";
            }

            const checkOptionGroupNm = await Store.checkOptionGroupNm(store_id,sGroupTitle);
            if (checkOptionGroupNm !== undefined && checkOptionGroupNm !== null && checkOptionGroupNm !== '') {
                isProcess = false;
                oResult.resultCd = "7777";
                oResult.resultMsg = "동일한 옵션의 이름이 존재합니다.";
            }

            if(isProcess){
                const makeOption = await Store.makeOption(store_id,sGroupTitle,type,count,sMin,sData);
                if(makeOption === "0000"){
                    oResult.resultCd = "0000";
                    oResult.resultMsg = "등록되었습니다";
                }
            }
        } else {
            oResult.resultCd = "8888";
            oResult.resultMsg = "옵션리스트를 작성해주세요";
        }
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}


AuthController.registerMenuV2 = async (req, res) => {
    const sFileList = req.body.sFileList;
    const sTitle = req.body.sTitle;
    const sCategory = req.body.sCategory;
    const iPrice = req.body.iPrice;
    const option = req.body.option;
    const sDesc = req.body.sDesc;
    const store_id = req.body.store_id;
    
    let oResult = {
        resultCd : "9999",
        resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
    };
    let dPrice = req.body.dPrice;

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
            let sCount = await Store.productListLength(sCategory);
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
                const insertMenu = await Sales.insertMenuV2(store_id,sTitle,sDesc,iPrice,dPrice,sCount,sFileList,sCategory,option);
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

AuthController.registerMenuV3 = async (req, res) => {
    const sFileList = req.body.sFileList;
    const sTitle = req.body.sTitle;
    const sCategory = req.body.sCategory;
    const iPrice = req.body.iPrice;
    const option = req.body.option;
    const sDesc = req.body.sDesc;
    const store_id = req.body.store_id;
    
    let oResult = {
        resultCd : "9999",
        resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
    };
    let dPrice = req.body.dPrice;
    let productType = req.body.productType;
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
            let sCount = await Store.productListLength(sCategory);
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
                if(productType !== undefined && productType !== null){
                    if(productType === "normal"){
                        productType = 0;
                    } else {
                        productType = 1;
                    }
                } else {
                    productType = 0;
                }
                if(iStock !== undefined && iStock !== null){
                    if(iStock === ""){
                        iStock = 0;
                    }
                } else {
                    iStock = 0;
                }
                const insertMenu = await Sales.insertMenuV3(store_id,sTitle,sDesc,iPrice,dPrice,sCount,sFileList,sCategory,option,productType,iStock);
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
 

AuthController.deleteMenuV2 = async (req, res) => {
    let oResult = false;
    try {
        const menuId = req.body.sIndex;
        const result = await Store.deleteMenu(menuId);
        if(result !== undefined){
            oResult = true;
        } 
    } catch (error) {
        console.log("error",error);
    }
    res.status(200).json(oResult);
}


AuthController.getMenuDetailV3 = async (req, res) => {
    const menu_id = req.params.menu_id;

    let oResult = {};
    let sOption = [];
    try {
        const getMenuDetail = await Store.getMenuDetail(parseInt(menu_id));
        if(getMenuDetail != undefined && getMenuDetail != null){
            const optionList = await Store.getOptionListByMenuId(parseInt(menu_id));
            if(optionList !== undefined && optionList !== null && optionList.length > 0){
                for await (let i of optionList) {
                    let temp = {};
                    temp.key = parseInt(i.option_type_id);
                    temp.name = i.name.toString();
                    sOption.push(temp);
                }
            }

            if(getMenuDetail[0].url_path !== null && getMenuDetail[0].url_path !== ""){
                oResult.url_path = getMenuDetail[0].url_path;
            } else {
                oResult.url_path = "";
            }

            if(getMenuDetail[0].is_soldout > 0){
                oResult.soldOut = "일시품절";
                oResult.status = "use";
            } else {
                oResult.soldOut = "주문가능";
                oResult.status = "unused";
            }

            if(Math.floor(parseFloat(getMenuDetail[0].org_price)) === Math.floor(parseFloat(getMenuDetail[0].base_price))){
                oResult.base_price = 0;
                oResult.org_price = Math.floor(parseFloat(getMenuDetail[0].org_price));
            } else {
                oResult.base_price = Math.floor(parseFloat(getMenuDetail[0].base_price));
                oResult.org_price = Math.floor(parseFloat(getMenuDetail[0].org_price));
            }

            if(parseInt(getMenuDetail[0].is_throo_only) === 0){
                oResult.isThrooOnly = "normal";
            } else {
                oResult.isThrooOnly = "only";
            }

            if(parseInt(getMenuDetail[0].in_stock) === 0){
                oResult.inStock = "";
            } else {
                oResult.inStock = getMenuDetail[0].in_stock.toString();
            }

            oResult.options = sOption;
            oResult.productId = getMenuDetail[0].product_id;
            oResult.categoryId = getMenuDetail[0].category_id;
            oResult.category_name = getMenuDetail[0].category_name;
            oResult.product_name = getMenuDetail[0].product_name;
            oResult.description = getMenuDetail[0].description;
            oResult.mediaId = getMenuDetail[0].product_media_id;
        }
    } catch (error) {
        console.log("StoreController.getMenuDetailV2 fail error!!!!",error);
    }
    res.status(200).json(oResult);
}

AuthController.getMenuDetailV2 = async (req, res) => {
    const menu_id = req.params.menu_id;

    let oResult = {};
    let sOption = [];
    try {
        const getMenuDetail = await Store.getMenuDetail(parseInt(menu_id));
        if(getMenuDetail != undefined && getMenuDetail != null){
            const optionList = await Store.getOptionListByMenuId(parseInt(menu_id));
            if(optionList !== undefined && optionList !== null && optionList.length > 0){
                for await (let i of optionList) {
                    let temp = {};
                    temp.key = parseInt(i.option_type_id);
                    temp.name = i.name.toString();
                    sOption.push(temp);
                }
            }

            if(getMenuDetail[0].url_path !== null && getMenuDetail[0].url_path !== ""){
                oResult.url_path = getMenuDetail[0].url_path;
            } else {
                oResult.url_path = "";
            }

            if(getMenuDetail[0].is_soldout > 0){
                oResult.soldOut = "일시품절";
                oResult.status = "use";
            } else {
                oResult.soldOut = "주문가능";
                oResult.status = "unused";
            }

            if(Math.floor(parseFloat(getMenuDetail[0].org_price)) === Math.floor(parseFloat(getMenuDetail[0].base_price))){
                oResult.base_price = 0;
                oResult.org_price = Math.floor(parseFloat(getMenuDetail[0].org_price));
            } else {
                oResult.base_price = Math.floor(parseFloat(getMenuDetail[0].base_price));
                oResult.org_price = Math.floor(parseFloat(getMenuDetail[0].org_price));
            }

            oResult.options = sOption;
            oResult.productId = getMenuDetail[0].product_id;
            oResult.categoryId = getMenuDetail[0].category_id;
            oResult.category_name = getMenuDetail[0].category_name;
            oResult.product_name = getMenuDetail[0].product_name;
            oResult.description = getMenuDetail[0].description;
            oResult.mediaId = getMenuDetail[0].product_media_id;
        }
    } catch (error) {
        console.log("StoreController.getMenuDetailV2 fail error!!!!",error);
    }
    res.status(200).json(oResult);
}


AuthController.editMenuV2 = async (req, res) => {
    const sTitle = req.body.sTitle;
    const sCategory = req.body.sCategory;
    const iPrice = req.body.iPrice;
    const options = req.body.options;
    const sDesc = req.body.sDesc;
    const productId = req.body.product_id;
    const mediaId = req.body.media_id;
    const preOptionList = req.body.pre_option_list;
    const store_id = req.body.store_id;
    const urlPath = req.body.url_path;
    const isCheck = req.body.isCheck;
    
    let dPrice = req.body.iPrice;
    let oResult = {
        resultCd : "9999",
        resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
    };
    
    try {
        if(req.body.dPrice !== undefined && req.body.dPrice !== null && parseInt(req.body.dPrice) !== 0 && req.body.dPrice !== ""){
            dPrice = req.body.dPrice;
        }
        const editMenu = await Sales.editMenuV2(mediaId,productId,sTitle,sDesc,iPrice,dPrice,sCategory,preOptionList,options,urlPath,isCheck,store_id);
        if(editMenu === "0000"){
            oResult.resultCd = "0000";
            oResult.resultMsg = "정상적으로 처리되었습니다";
        }
        
    } catch (error) {
        console.log("StoreController.editMenuV2 error =>>>>>>>>>>",error);
    }
    res.status(200).json(oResult);
}

AuthController.editMenuV3 = async (req, res) => {
    const sTitle = req.body.sTitle;
    const sCategory = req.body.sCategory;
    const iPrice = req.body.iPrice;
    const options = req.body.options;
    const sDesc = req.body.sDesc;
    const productId = req.body.product_id;
    const mediaId = req.body.media_id;
    const preOptionList = req.body.pre_option_list;
    const store_id = req.body.store_id;
    const urlPath = req.body.url_path;
    const isCheck = req.body.isCheck;

    let productType = req.body.productType;
    let iStock = req.body.iStock;
    let dPrice = req.body.iPrice;
    let oResult = {
        resultCd : "9999",
        resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
    };
    
    try {
        if(req.body.dPrice !== undefined && req.body.dPrice !== null && parseInt(req.body.dPrice) !== 0 && req.body.dPrice !== ""){
            dPrice = req.body.dPrice;
        }
        if(productType !== undefined && productType !== null){
            if(productType === "normal"){
                productType = 0;
            } else {
                productType = 1;
            }
        } else {
            productType = 0;
        }
        if(iStock !== undefined && iStock !== null){
            if(iStock === ""){
                iStock = 0;
            }
        } else {
            iStock = 0;
        }
        const editMenu = await Sales.editMenuV3(mediaId,productId,sTitle,sDesc,iPrice,dPrice,sCategory,preOptionList,options,urlPath,isCheck,store_id,iStock,productType);
        if(editMenu === "0000"){
            oResult.resultCd = "0000";
            oResult.resultMsg = "정상적으로 처리되었습니다";
        }
        
    } catch (error) {
        console.log("StoreController.editMenuV3 error =>>>>>>>>>>",error);
    }
    res.status(200).json(oResult);
}


AuthController.optionList = async (req, res) => {
    let sResult = [];
    try {
        const store_id = req.params.store_id;
        const result = await Store.getoptionList(store_id);
        if(result.length > 0){
            let count = 1;
            for await (let i of result) {
                let temp = {};
                temp.key = count;
                temp.name = i.name;
                temp.count = i.input_max;
                temp.id = i.option_type_id;
                temp.menu = "";
                temp.optionNm = "";

                if(i.input_type === "radio"){
                    temp.type = "선택영역";
                } else {
                    temp.type = "체크박스";
                }

                const items = await Store.getOptionDetail(parseInt(i.option_type_id));
                if(items.length > 0){
                    let sucTemp = "";
                    let tempOption = [];
                    for await (let pData of items) {
                        let pDataList = {};
                        pDataList.name = pData.name;
                        tempOption.push(pDataList);
                    }
                    if(tempOption.length > 0){
                        sucTemp = tempOption.map(function(elem){
                            return elem.name;
                        }).join(", ");
                    }
                    temp.optionNm = sucTemp;
                }

                const products = await Store.getInsideOfOption(parseInt(store_id),parseInt(i.option_type_id));
                if(products.length > 0){
                    let sucTemp = "";
                    let tempMenu = [];
                    for await (let sData of products) {
                        let sDataList = {};
                        sDataList.productNm = sData.name;
                        tempMenu.push(sDataList);
                    }
                    if(tempMenu.length > 0){
                        sucTemp = tempMenu.map(function(elem){
                            return elem.productNm;
                        }).join(", ");
                    }
                    temp.menu = sucTemp;
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

AuthController.deleteOption = async (req, res) => {
    let oResult = false;
    let xAction = false;
    
    try {
        const oData = req.body.sIndex;
        const checkUp = await Store.checkHaveProduct(oData);
        if(checkUp.length > 0){
            xAction = true;
        }

        const result = await Store.deleteOption(oData,xAction);
        if(result === "0000"){
            oResult = true;
        }
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}
 

AuthController.detailOptionRow = async (req, res) => {
    let sResult = [];
    let optionInputType = "";
    let result = {}
    let oResult = {
        resultCd : "9999",
        resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
    };

    try {
        const optionId = req.params.option_id;
        if(optionId != undefined){
            const getOptionList = await Store.getOptionList(optionId);
            if(getOptionList.length > 0){
                let count = 1;
                for await (let i of getOptionList) {
                    let temp = {};
                    temp.key = count;
                    temp.name = i.optionName;
                    temp.price = parseFloat(i.price);

                    if(optionInputType === ""){
                        optionInputType = i.input_type.toString();
                    }
                    sResult.push(temp);
                    count ++;
                }

                if(getOptionList[0].maxCount > 0){
                    result.maxCount = parseInt(getOptionList[0].maxCount);
                } else {
                    result.maxCount = 0;
                }
                if(getOptionList[0].minCount > 0){
                    result.minCount = parseInt(getOptionList[0].minCount);
                } else {
                    result.minCount = 0;
                }
                
                result.inputType = optionInputType;
                result.sGroupTitle = getOptionList[0].groupTitle;
                result.list = sResult;

                oResult.resultCd = "0000";
                oResult.resultData = result;
            }
        }
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}


AuthController.editOptionV2 = async (req, res) => {
    const sData = req.body.sData;
    const optionId = req.body.option_id;

    let isProcess = true;
    let count = 0;
    let sMin = 0;
    let productList = [];
    let optionIdList = [];
    let xAction = false;
    let sGroupTitle = req.body.sGroupTitle;
    let oResult = {
        resultCd : "9999",
        resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
    };

    try {
        if(sData.length > 0){
            if(req.body.maxCount !== undefined){
                count = parseInt(req.body.maxCount);

                if(sData.length < count){
                    isProcess = false;
                    oResult.resultCd = "7777";
                    oResult.resultMsg = "최대 선택가능 횟수가 입력된 옵션보다 큽니다";
                }
            }
            
            if(req.body.minCount !== undefined){
                if(parseInt(req.body.minCount) > 1){
                    sMin = parseInt(req.body.minCount);
                    count = parseInt(req.body.minCount);
                }

                if(sData.length < sMin){
                    isProcess = false;
                    oResult.resultCd = "7777";
                    oResult.resultMsg = "최소 선택가능 횟수가 입력된 옵션보다 큽니다";
                }
            }

            const checkUp = await Store.checkHaveProduct(optionId);
            if(checkUp !== undefined && checkUp !== null){
                if(checkUp.length > 0){
                    for await (let i of checkUp) {
                        let tempProduct = {};
                        tempProduct.id = i.id;
                        productList.push(tempProduct);
                    }
                    
                    const getOptionId = await Store.getOptionId(optionId);
                    for await (let s of getOptionId) {
                        let tempOption = {};
                        tempOption.id = s.id;
                        optionIdList.push(tempOption);
                    }
        
                    xAction = true;
                }
            }

            if(isProcess){
                const editOption = await Store.editOption(sGroupTitle,optionId,count,sMin,sData,optionIdList,productList,xAction);
                if(editOption === "0000"){
                    oResult.resultCd = "0000";
                    oResult.resultMsg = "수정되었습니다";
                }
            }
        } else {
            oResult.resultCd = "8888";
            oResult.resultMsg = "옵션리스트를 작성해주세요";
        }
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}

AuthController.editOptionV3 = async (req, res) => {
    const sData = req.body.sData;
    const optionId = req.body.option_id;
    
    let type = req.body.type;
    let isProcess = true;
    let count = 0;
    let sMin = 0;
    let productList = [];
    let optionIdList = [];
    let xAction = false;
    let sGroupTitle = req.body.sGroupTitle;
    let oResult = {
        resultCd : "9999",
        resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
    };

    try {
        if(sData.length > 0){
            if(type === "radioDouble"){
                sMin = parseInt(req.body.minCount);
                count = parseInt(req.body.minCount);
                type = "checkbox";
                if(sData.length < sMin){
                    isProcess = false;
                    oResult.resultCd = "7777";
                    oResult.resultMsg = "최소 선택가능 횟수가 입력된 옵션보다 큽니다";
                }
            } else if (type === "checkbox"){
                count = parseInt(req.body.maxCount);
                if(sData.length < count){
                    isProcess = false;
                    oResult.resultCd = "7777";
                    oResult.resultMsg = "최대 선택가능 횟수가 입력된 옵션보다 큽니다";
                }
            } else {
                type = "radio";
            }

            const checkUp = await Store.checkHaveProduct(optionId);
            if(checkUp !== undefined && checkUp !== null){
                if(checkUp.length > 0){
                    for await (let i of checkUp) {
                        let tempProduct = {};
                        tempProduct.id = i.id;
                        productList.push(tempProduct);
                    }
                    
                    const getOptionId = await Store.getOptionId(optionId);
                    for await (let s of getOptionId) {
                        let tempOption = {};
                        tempOption.id = s.id;
                        optionIdList.push(tempOption);
                    }
        
                    xAction = true;
                }
            }

            if(isProcess){
                const editOption = await Store.editOptionV3(sGroupTitle,optionId,count,sMin,type,sData,optionIdList,productList,xAction);
                if(editOption === "0000"){
                    oResult.resultCd = "0000";
                    oResult.resultMsg = "수정되었습니다";
                }
            }
        } else {
            oResult.resultCd = "8888";
            oResult.resultMsg = "옵션리스트를 작성해주세요";
        }
    } catch (error) {
        console.log("error",error);
    }

    res.status(200).json(oResult);
}
 
AuthController.testPushMessage = async (req, res) => {
    const sTitle = req.body.title;
    const sContent = req.body.content;

    let oNotiMessage = {
        data: {
            title: sTitle,
            body: sContent
        },
        notification: {
            title: sTitle,
            body: sContent
        }
    };
  
    let aPosPushTokens = await Sales.getPushTokens(17);
    if (aPosPushTokens != undefined && aPosPushTokens.length > 0) {
        oNotiMessage.token = aPosPushTokens[0].token;
        await  oFirebaseAdminAppSales.messaging()
                                .send(oNotiMessage)
                                .then((response) => {
                                    console.log("response", JSON.stringify(response));
                                    return true
                                })
                                .catch((error) => {
                                    console.log("error", JSON.stringify(error));
                                    return false
                                });

    }
}
 
AuthController.sendMessageForSales = async (req, res) => {
    const sTitle = req.body.title;
    const sContent = req.body.content;
    const type = req.body.type;
    const sValue = req.body.value;
    
    let result = [];
    let oResult = false;
    let pushTitle= "";
    if(type !== undefined && sTitle !== undefined && sContent !== undefined && sValue !== undefined){
        await Sales.insertMessageList(type,sValue,sTitle,sContent);
        if(type === "group"){
            result = await Sales.getEachSalesTeam(sValue);
            pushTitle = "스루 " + result[0].group_name + " 영업팀 공지사항";
        } else if (type === "all") {
            result = await Sales.getTotalSalesTeam();
            pushTitle = "스루영업팀 전체 공지사항";
        }

        let oNotiMessage = {
            data: {
                title: pushTitle,
                body: sTitle
            },
            notification: {
                title: pushTitle,
                body: sTitle
            },
            android: {
                priority: "high",
                ttl: 3600 * 1000,
                notification: {
                    channelId: "notice"
                },
            },
        };

        if(result.length > 0){
            for await (const iterator of result) {
                let aPosPushTokens = await Sales.getPushTokens(iterator.admin_user_id);
                if (aPosPushTokens != undefined && aPosPushTokens.length > 0) {
                    if(aPosPushTokens[0].token !== undefined && aPosPushTokens[0].token !== null && aPosPushTokens[0].token !== ""){
                        oNotiMessage.token = aPosPushTokens[0].token;
                        const res = await  oFirebaseAdminAppSales.messaging()
                                                .send(oNotiMessage)
                                                .then((response) => {
                                                    console.log("response", JSON.stringify(response));
                                                    return true
                                                })
                                                .catch((error) => {
                                                    console.log("error", JSON.stringify(error));
                                                    return false
                                                });
                        if(res){
                            oResult = true;
                        }                      
                    }
                }
            }
        }
    }
    res.status(200).json(oResult);
}
 
AuthController.getPushMessageList = async (req, res) => {
    let oResult = [];
    try {
        const groupId = req.body.groupId;
        const getSalesMessage = await Sales.getAllSalesMessage();
        if(getSalesMessage.length > 0){
            for await (const e of getSalesMessage) {
                let temp = {};
                temp.title = e.title;
                temp.content = e.content;
                temp.date = moment(e.created_at).format('MM-DD');

                if(parseInt(e.group_id) === parseInt(groupId)){
                    oResult.push(temp);
                } else if(e.type_id === "all"){
                    oResult.push(temp);
                }
            }
        }
    } catch (error) {
        console.log("getPushMessageList fail! error ======> ",error);
    }
    res.status(200).json(oResult);
}

AuthController.storeActiveList = async (req, res) => {
    let oResult = [];
    let sIndex = 1;
    try {
        const salesId = req.params.salesId;
        const storeUnActiveList = await Sales.storeActiveList(parseInt(salesId));
        if(storeUnActiveList.length > 0){
            for await (const e of storeUnActiveList) {
                const getStoreLogoImg = await Sales.getStoreLogoImg(parseInt(e.store_id));
                const isLogin = await Store.isLogin(e.store_id);
                
                let temp = {};
                temp.key = sIndex.toString();
                temp.title = e.email;
                temp.phone_number = e.phone_number;
                temp.date = moment(e.created_at).format('YYYY-MM-DD');
                temp.id = parseInt(e.store_id);
                temp.running = false;
                temp.authenticate = false;
                temp.image = "https://api-stg.ivid.kr/img/no-image-new.png";
                temp.img_url_state = false;
                temp.isLogin = false;

                if(parseInt(e.verified) > 0){
                    temp.authenticate = true;
                }
                if(parseInt(e.status) > 0){
                    temp.running = true;
                }
                if(e.store_name !== undefined && e.store_name !== null && e.store_name !== ""){
                    temp.title = e.store_name;
                }
                if(getStoreLogoImg !== undefined && getStoreLogoImg.length > 0){
                    if(getStoreLogoImg[0].url_path !== ""){
                        temp.image = getStoreLogoImg[0].url_path;
                        temp.img_url_state = true;
                    }
                }
                if(isLogin !== undefined && isLogin !== null){
                    if(parseInt(isLogin[0].sNm) > 0){
                        temp.isLogin = true;
                    }
                }
                oResult.push(temp);
                sIndex += 1;
            }
        }
    } catch (error) {
        console.log("getPushMessageList fail! error ======> ",error);
    }
    res.status(200).json(oResult);
}

AuthController.searchStoreActiveList = async (req, res) => {
    let oResult = [];
    let sIndex = 1;
    try {
        const salesId = req.body.sales_id;
        const sParam = req.body.sParam;
        const storeUnActiveList = await Sales.searchStoreActiveList(parseInt(salesId),sParam);
        if(storeUnActiveList.length > 0){
            for await (const e of storeUnActiveList) {
                const getStoreLogoImg = await Sales.getStoreLogoImg(parseInt(e.store_id));
                const isLogin = await Store.isLogin(e.store_id);
                let temp = {};
                temp.key = sIndex.toString();
                temp.title = e.email;
                temp.phone_number = e.phone_number;
                temp.date = moment(e.created_at).format('YYYY-MM-DD');
                temp.id = parseInt(e.store_id);
                temp.running = false;
                temp.authenticate = false;
                temp.image = "https://api-stg.ivid.kr/img/no-image-new.png";
                temp.img_url_state = false;
                temp.isLogin = false;

                if(parseInt(e.verified) > 0){
                    temp.authenticate = true;
                }
                if(parseInt(e.status) > 0){
                    temp.running = true;
                }
                if(e.store_name !== undefined && e.store_name !== null && e.store_name !== ""){
                    temp.title = e.store_name;
                }
                if(getStoreLogoImg !== undefined && getStoreLogoImg.length > 0){
                    if(getStoreLogoImg[0].url_path !== ""){
                        temp.image = getStoreLogoImg[0].url_path;
                        temp.img_url_state = true;
                    }
                }
                if(isLogin !== undefined && isLogin !== null){
                    if(parseInt(isLogin[0].sNm) > 0){
                        temp.isLogin = true;
                    }
                }
                oResult.push(temp);
                sIndex += 1;
            }
        }
    } catch (error) {
        console.log("getPushMessageList fail! error ======> ",error);
    }
    res.status(200).json(oResult);
}

AuthController.storeUnActiveList = async (req, res) => {
    let oResult = [];
    let sIndex = 1;
    try {
        const salesId = req.params.salesId;
        const storeUnActiveList = await Sales.storeUnActiveList(parseInt(salesId));
        if(storeUnActiveList.length > 0){
            for await (const e of storeUnActiveList) {
                const getStoreLogoImg = await Sales.getStoreLogoImg(parseInt(e.store_id));
                const isLogin = await Store.isLogin(e.store_id);

                let temp = {};
                temp.key = sIndex.toString();
                temp.title = e.email;
                temp.phone_number = e.phone_number;
                temp.date = moment(e.created_at).format('YYYY-MM-DD');
                temp.id = parseInt(e.store_id);
                temp.running = false;
                temp.authenticate = false;
                temp.image = "https://api-stg.ivid.kr/img/no-image-new.png";
                temp.img_url_state = false;
                temp.isLogin = false;

                if(parseInt(e.verified) > 0){
                    temp.authenticate = true;
                }
                if(e.store_name !== undefined && e.store_name !== null && e.store_name !== ""){
                    temp.title = e.store_name;
                }
                if(getStoreLogoImg !== undefined && getStoreLogoImg.length > 0){
                    if(getStoreLogoImg[0].url_path !== ""){
                        temp.image = getStoreLogoImg[0].url_path;
                        temp.img_url_state = true;
                    }
                }
                if(isLogin !== undefined && isLogin !== null){
                    if(parseInt(isLogin[0].sNm) > 0){
                        temp.isLogin = true;
                    }
                }
                oResult.push(temp);
                sIndex += 1;
            }
        }
    } catch (error) {
        console.log("getPushMessageList fail! error ======> ",error);
    }
    res.status(200).json(oResult);
}

AuthController.searchStoreUnActiveList = async (req, res) => {
    let oResult = [];
    let sIndex = 1;
    try {
        const salesId = req.body.sales_id;
        const sParam = req.body.sParam;
        const storeUnActiveList = await Sales.searchStoreUnActiveList(parseInt(salesId),sParam);
        if(storeUnActiveList.length > 0){
            for await (const e of storeUnActiveList) {
                const getStoreLogoImg = await Sales.getStoreLogoImg(parseInt(e.store_id));
                const isLogin = await Store.isLogin(e.store_id);

                let temp = {};
                temp.key = sIndex.toString();
                temp.title = e.email;
                temp.phone_number = e.phone_number;
                temp.date = moment(e.created_at).format('YYYY-MM-DD');
                temp.id = parseInt(e.store_id);
                temp.running = false;
                temp.authenticate = false;
                temp.image = "https://api-stg.ivid.kr/img/no-image-new.png";
                temp.img_url_state = false;
                temp.isLogin = false;

                if(parseInt(e.verified) > 0){
                    temp.authenticate = true;
                }
                if(e.store_name !== undefined && e.store_name !== null && e.store_name !== ""){
                    temp.title = e.store_name;
                }
                if(getStoreLogoImg !== undefined && getStoreLogoImg.length > 0){
                    if(getStoreLogoImg[0].url_path !== ""){
                        temp.image = getStoreLogoImg[0].url_path;
                        temp.img_url_state = true;
                    }
                }
                if(isLogin !== undefined && isLogin !== null){
                    if(parseInt(isLogin[0].sNm) > 0){
                        temp.isLogin = true;
                    }
                }
                oResult.push(temp);
                sIndex += 1;
            }
        }
    } catch (error) {
        console.log("getPushMessageList fail! error ======> ",error);
    }
    res.status(200).json(oResult);
}

AuthController.groupMessage = async (req, res) => {
    const groupId = req.body.groupId;
    const sTitle = req.body.title;
    const sContent = req.body.content;
    
    let oResult = false;
    if(sTitle !== undefined && sContent !== undefined){
        await Sales.insertMessageList("group",groupId,sTitle,sContent);

        const result = await Sales.getEachSalesTeam(groupId);
        const pushTitle = result[0].group_name + " 영업팀 전달사항";
        let oNotiMessage = {
            data: {
                title: pushTitle,
                body: sTitle
            },
            notification: {
                title: pushTitle,
                body: sTitle
            },
            android: {
                priority: "high",
                ttl: 3600 * 1000,
                notification: {
                    channelId: "notice"
                },
            },
        };

        if(result.length > 0){
            for await (const iterator of result) {
                let aPosPushTokens = await Sales.getPushTokens(iterator.admin_user_id);
                if (aPosPushTokens !== undefined && aPosPushTokens.length > 0) {
                    if(aPosPushTokens[0].token !== undefined && aPosPushTokens[0].token !== null && aPosPushTokens[0].token !== ""){
                        oNotiMessage.token = aPosPushTokens[0].token;
                        const res = await  oFirebaseAdminAppSales.messaging()
                                                .send(oNotiMessage)
                                                .then((response) => {
                                                    console.log("response", JSON.stringify(response));
                                                    return true
                                                })
                                                .catch((error) => {
                                                    console.log("error", JSON.stringify(error));
                                                    return false
                                                });
                        if(res){
                            oResult = true;
                        }                      
                    }
                }
            }
        }
    }
    res.status(200).json(oResult);
}

AuthController.groupMessageV2 = async (req, res) => {
    const groupId = req.body.groupId;
    const salesId = req.body.salesId;
    const sTitle = req.body.title;
    const sContent = req.body.content;
    
    let oResult = false;
    let result = [];
    let pushTitle= "";
    if(sTitle !== undefined && sContent !== undefined){
        await Sales.insertMessageList("group",groupId,sTitle,sContent);

        if(salesId.toString() === 29){
            result = await Sales.getTotalSalesTeam();
            pushTitle = "스루영업팀 전체 공지사항";
        } else  {
            result = await Sales.getEachSalesTeam(groupId);
            pushTitle = result[0].group_name + " 영업팀 전달사항";
        }
        let oNotiMessage = {
            data: {
                title: pushTitle,
                body: sTitle
            },
            notification: {
                title: pushTitle,
                body: sTitle
            },
            android: {
                priority: "high",
                ttl: 3600 * 1000,
                notification: {
                    channelId: "notice"
                },
            },
        };

        if(result.length > 0){
            for await (const iterator of result) {
                let aPosPushTokens = await Sales.getPushTokens(iterator.admin_user_id);
                if (aPosPushTokens !== undefined && aPosPushTokens.length > 0) {
                    if(aPosPushTokens[0].token !== undefined && aPosPushTokens[0].token !== null && aPosPushTokens[0].token !== ""){
                        oNotiMessage.token = aPosPushTokens[0].token;
                        const res = await  oFirebaseAdminAppSales.messaging()
                                                .send(oNotiMessage)
                                                .then((response) => {
                                                    console.log("response", JSON.stringify(response));
                                                    return true
                                                })
                                                .catch((error) => {
                                                    console.log("error", JSON.stringify(error));
                                                    return false
                                                });
                        if(res){
                            oResult = true;
                        }                      
                    }
                }
            }
        }
    }
    res.status(200).json(oResult);
}

AuthController.updatePushToken = async (req, res) => {
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

module.exports = AuthController;
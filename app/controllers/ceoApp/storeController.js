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

const tradersAuthorize = async (sQuery) => {
    let oResult = false;

    const oRes = await axios({
        url: 'https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=DL2Li3A7xuz6dJ09MIn6zht9byZsUCZADkDRfzCL9oVfzQPW04EL4mjxumbga30hj%2B73jMC1Q8y8AEJnFSkb9w%3D%3D',
        method: "post",
        timeout: (15 * 1000),
        dataType: "JSON",
        headers: {
            'Content-Type' : "application/json",
        },
        data: JSON.stringify(sQuery),
        transformResponse: [(data) => {
            return data;
        }],
    });
    if (oRes.status != undefined && oRes.status === 200) {
        let sRes = oRes.data;
        if(sRes !== undefined && sRes !== null){
            let oParsedRes = JSON.parse(sRes);
            if(oParsedRes.data !== undefined && oParsedRes.data !== null){
                for await (let sData of oParsedRes.data) {
                    if(sData.b_stt_cd !== undefined && sData.b_stt_cd !== null && sData.b_stt_cd === "01"){
                        oResult = true;
                    }
                }
            }
        }
    }
   
    return oResult;
}

const getStoreTypeX = async (sIndex,aIndex,dIndex,zIndex,nIndex,mIndex) => {
    let oResult = {
        resultCd : false,
        mainType : zIndex.mainType,
        subType : zIndex.subType,
        mainTypeNm: zIndex.mainTypeNm,
        mainTypeNumber: zIndex.mainTypeNumber,
        subTypeNm: zIndex.subTypeNm,
        subTypeNumber: zIndex.subTypeNumber,
        mainTypeListNm: zIndex.mainTypeListNm,
        subTypeListNm: zIndex.subTypeListNm,
    };
    let tempMainTypeListNm = nIndex;
    let tempSubTypeListNm = mIndex;
    let xUserData = await Store.getStoreTypeXStoreId(sIndex,aIndex);
    if(xUserData.length > 0){
        xUserData = xUserData[0];
        let tempList = {};
        if(xUserData.is_main.toString() === "1"){
            if(xUserData.parent_store_type_id.toString() === "1"){
                oResult.mainTypeNm = "카페";
                oResult.mainTypeNumber = 2;
            } else if (xUserData.parent_store_type_id.toString() === "2"){
                oResult.mainTypeNm = "음식점";
                oResult.mainTypeNumber = 1;
            } else if (xUserData.parent_store_type_id.toString() === "8"){
                oResult.mainTypeNm = "숍";
                oResult.mainTypeNumber = 3;
            }
            tempList.key = dIndex;
            tempList.name = xUserData.name.toString();
            if(tempMainTypeListNm !== ""){
                tempMainTypeListNm = tempMainTypeListNm + ", " + xUserData.name.toString();
            } else {
                tempMainTypeListNm = xUserData.name.toString();
            }
            oResult.mainType.push(tempList);
        } else {
            if(xUserData.parent_store_type_id.toString() === "1"){
                oResult.subTypeNm = "카페";
                oResult.subTypeNumber = 2;
            } else if (xUserData.parent_store_type_id.toString() === "2"){
                oResult.subTypeNm = "음식점";
                oResult.subTypeNumber = 1;
            } else if (xUserData.parent_store_type_id.toString() === "8"){
                oResult.subTypeNm = "숍";
                oResult.subTypeNumber = 3;
            }
            tempList.key = dIndex;
            tempList.name = xUserData.name.toString();
            if(tempSubTypeListNm !== ""){
                tempSubTypeListNm = tempSubTypeListNm + ", " + xUserData.name.toString();
            } else {
                tempSubTypeListNm = xUserData.name.toString();
            }
            oResult.subType.push(tempList);
        }
        oResult.mainTypeListNm = tempMainTypeListNm;
        oResult.subTypeListNm = tempSubTypeListNm;
        oResult.resultCd = true;
    }
    return oResult;
}

// The authentication controller.
var StoreRegisterController = {};

StoreRegisterController.insertMainMenu = async (req, res) => {
    const store_id = req.body.store_id;
    const targetKeys = req.body.targetKeys;
    const storeNm = req.body.store_name;

    let process1 = false;
    let process2 = false;
    let process3 = false;
    let menuId = null;
    let categoryId = null;
    let oResult = {
        resultCd : "9999",
        resultMsg: "네트워크 에러입니다 다시 시도바랍니다."
    };
    try {
        const checkMenuId = await Store.checkMenuId(parseInt(store_id));
        if(checkMenuId !== undefined && checkMenuId.length > 0){
            menuId = parseInt(checkMenuId[0].menu_id);
            process1 = true;
        } else {
            oResult.resultMsg = "잘못된 값을 전달받았습니다, 관리자에 문의바랍니다."
            process1 = false;
        }

        if(process1){
            let checkTitle = await Store.checkMainMenu(parseInt(store_id));
            if(checkTitle.length > 0){
                categoryId = checkTitle[0].category_id;
                process2 = true;
            } else {
                let sCount = await Store.categoryListLength(parseInt(menuId));
                if(sCount != undefined && sCount != null){
                    if(sCount[0].count != null){
                        sCount = parseInt(sCount[0].count) + 1;
                    } else {
                        sCount = 0;
                    }

                    const insertCategory = await Store.insertCategory(menuId, storeNm + "의 대표메뉴", 1, 1, sCount);
                    categoryId = insertCategory[0];
                    process2 = true;

                } else {
                    process2 = false;
                }
            }
        }

        if(process2){
            if(targetKeys.length > 0){
                process3 = true;
            } else {
                oResult.resultMsg = "메뉴를 선택해주세요."
                process3 = false;
            }
        }

        if(process3){
            const result = await Store.mainMenuInsert(targetKeys,store_id,categoryId);
            if(result === "0000"){
                oResult.resultCd = "0000"
            }
        }

    } catch (error) {
        console.log(`StoreRegisterController.mainMenuCopyProduct error storeId = ${store_id} ==>>>>>>>`, error);
        console.log("error",error);
    }

    res.status(200).json(oResult);
}

StoreRegisterController.searchProduct = async (req, res) => {
    const store_id = req.body.store_id;
    const sParam = req.body.sParam;

    let oResult = [];

    try {
        const result = await Store.searchProduct(parseInt(store_id),sParam);
        if(result !== undefined && result !== null){
            if(result.length > 0){
                for await (let iterator of result) {
                let temp = {};
                    temp.name = iterator.name;
                    temp.id = iterator.product_id;
                    temp.price = convertToKRW(Math.floor(parseFloat(iterator.base_price)), true); 
                    oResult.push(temp);
                }
            }
        }
    } catch (error) {
        console.log(`StoreRegisterController.searchProduct error storeId = ${store_id} ==>>>>>>>`, error);
        console.log("error",error);
    }

    res.status(200).json(oResult);
}

StoreRegisterController.getAllProduct = async (req, res) => {
    const store_id = req.params.store_id;

    let oResult = [];

    try {
        const result = await Store.getAllProduct(parseInt(store_id));
        if(result !== undefined && result !== null){
            if(result.length > 0){
                for await (let iterator of result) {
                let temp = {};
                    temp.name = iterator.name;
                    temp.id = iterator.product_id;
                    temp.price = convertToKRW(Math.floor(parseFloat(iterator.base_price)), true); 
                    oResult.push(temp);
                }
            }
        }
    } catch (error) {
        console.log(`StoreRegisterController.getAllProduct error storeId = ${store_id} ==>>>>>>>`, error);
        console.log("error",error);
    }

    res.status(200).json(oResult);
}

StoreRegisterController.changeIndexCategory = async (req, res) => {
    const categoryList = req.body.categoryList;
    const store_id = req.body.storeId;
 
    let oResult = {
       resultCd : "9999",
       resultMsg : "네트워크에러입니다 잠시 후 다시 시도바랍니다"
    };
 
    try {
        if(categoryList.length > 1){
            const result = await Store.categorySwitch(categoryList);
            if(result === "0000"){
                oResult.resultCd = "0000";
                oResult.resultMsg = "변경되었습니다";
            }
        } else {
            oResult.resultCd = "8888";
        }
    } catch (error) {
        console.log(`StoreRegisterController.categoryList error storeId = ${store_id} ==>>>>>>>`, error);
        console.log("error",error);
    }

    res.status(200).json(oResult);
}

StoreRegisterController.mainMenu = async (req, res) => {
    const store_id = req.params.store_id;

    let sResult = {
        mainList: [],
        otherList: [],
    };
    try {
        let getCategoryId = await Store.getMainMenuId(parseInt(store_id));
        if(getCategoryId.length > 0){
            for await (const iterator of getCategoryId) {
                const result = await Store.getMainMenuProduct(parseInt(iterator.category_id));
                if(result.length > 0){
                    for await (const liter of result) {
                        let tempList = {};
                        tempList.url_path = "";
                        tempList.name = liter.name;
                        tempList.price = convertToKRW(Math.floor(parseFloat(liter.base_price)), true); 
                        tempList.key = liter.product_id;
                        if(liter.url_path !== undefined && liter.url_path !== null && liter.url_path !== ""){
                            tempList.url_path = liter.url_path;
                        }
                        
                        if(parseInt(iterator.is_main) > 0){
                            sResult.mainList.push(tempList);
                        } else {
                            sResult.otherList.push(tempList);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.log(`StoreRegisterController.mainMenu error storeId = ${store_id} ==>>>>>>>`, error);
    }
    res.status(200).json(sResult);
}

StoreRegisterController.categoryList = async (req, res) => {
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
                        let tempName = "";
                        let temp = {};
                        temp.key = count;
                        temp.name = i.name;
                        temp.index = i.id_order;
                        temp.id = i.category_id;
                        
                        if(i.is_main > 0){
                            mainId = i.category_id;
                            limitMain ++;
                        }

                        const getMenuList = await Sales.getMenuList(parseInt(i.category_id));
                        if(getMenuList.length > 0){
                            let tempCount = 0;
                            for await (let i of getMenuList) {
                                if(tempName === ""){
                                    tempName = i.name;
                                } else {
                                    if (0 < tempCount < 3) {
                                        tempName = tempName + ", " + i.name;
                                    } else if (tempCount = 3) {
                                        tempName = tempName + "...";
                                    }
                                }
                                tempCount += 1;
                            }
                        }
                        temp.productLine = tempName;

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
        console.log(`StoreRegisterController.categoryList error storeId = ${store_id} ==>>>>>>>`, error);
    }
    res.status(200).json({sResult,noList,sLimit,mainId});
}

StoreRegisterController.pickupInfo = async (req, res) => {
    const store_id = req.body.store_id;
    const sNoti = req.body.sNotsNearByDistanceValue;
    const sParkingTime = req.body.sParkingTime;

    let oResult = false;
    try {
        const result = await Store.storePickUpInfo(sNoti,sParkingTime,store_id);
        if(result != undefined){
            oResult = true;
        }
    } catch (error) {
        console.log(`StoreRegisterController.pickupInfo error storeId = ${store_id} ==>>>>>>>`, error);
    }
    
    res.status(200).json(oResult);
}

StoreRegisterController.getStoreAlert = async (req, res) => {
    let sResult = {
        resultCd: "9999",
        intro: ""
    };

    const store_id = req.params.store_id;
    try {
        const result = await Store.getStoreAlert(parseInt(store_id));
        if(result !== undefined && result !== null){
            sResult.resultCd = "0000";
            sResult.intro = result.description_noti;
        }
    } catch (error) {
        console.log(`StoreRegisterController.getStoreAlert error storeId = ${store_id} ==>>>>>>>`, error);
    }
    
    res.status(200).json(sResult);
}
    
StoreRegisterController.introduction = async (req, res) => {
    let sResult = true;

    const storeId = req.body.storeId;
    const introduction = req.body.introduction;
    try {
        if(introduction !== undefined && introduction !== null && storeId !== undefined && storeId !== null && parseInt(storeId) > 0){
            await Store.changeStoreDescriptionText(introduction,parseInt(storeId));
        }
    } catch (error) {
        console.log(`StoreRegisterController.introduction error storeId = ${storeId} ==>>>>>>>`, error);
    }
    
    res.status(200).json(sResult);
}
    
StoreRegisterController.getIntroduction = async (req, res) => {
    let sResult = {
        resultCd: "9999",
        intro: ""
    };

    const store_id = req.params.store_id;
    try {
        const result = await Store.getIntroduction(parseInt(store_id));
        if(result !== undefined && result !== null){
            sResult.resultCd = "0000";
            sResult.intro = result.description;
        }
    } catch (error) {
        console.log(`StoreRegisterController.getIntroduction error storeId = ${store_id} ==>>>>>>>`, error);
    }
    
    res.status(200).json(sResult);
}
    
StoreRegisterController.getOriginIntroduction = async (req, res) => {
    let sResult = {
        resultCd: "9999",
        intro: ""
    };

    const store_id = req.params.store_id;
    try {
        const result = await Store.getOriginIntroduction(parseInt(store_id));
        if(result !== undefined && result !== null){
            sResult.resultCd = "0000";
            sResult.intro = result.description_extra;
        }
    } catch (error) {
        console.log(`StoreRegisterController.getOriginIntroduction error storeId = ${store_id} ==>>>>>>>`, error);
    }
    
    res.status(200).json(sResult);
}
    
StoreRegisterController.originIntroduction = async (req, res) => {
    let sResult = true;

    const storeId = req.body.storeId;
    const introduction = req.body.introduction;
    try {
        if(introduction !== undefined && introduction !== null && storeId !== undefined && storeId !== null && parseInt(storeId) > 0){
            await Store.changeStoreDescriptionExtraText(introduction,parseInt(storeId));
        }
    } catch (error) {
        console.log(`StoreRegisterController.originIntroduction error storeId = ${storeId} ==>>>>>>>`, error);
    }
    
    res.status(200).json(sResult);
}

StoreRegisterController.getStoreNotice = async (req, res) => {
    let oResult = {
        plainOptions : [],
        cafeOptions : [],
        shopOptions : [],
        mainType : [],
        subType : [],
        mainTypeNm: "",
        mainTypeNumber: 0,
        subTypeNm: "",
        subTypeNumber: 0,
        mainTypeListNm: "",
        subTypeListNm: "",
    };
    let sNm = 1;
    let iNm = 1;
    let xNm = 1;
    let tempMainTypeListNm = "";
    let tempSubTypeListNm = "";

    const store_id = req.params.store_id;
    try {
        const getList = await Store.getStoreType();
        for await (const iterator of getList) {
            if(iterator.parent_store_type_id.toString() === "2"){
                let temp = {
                    key: sNm,
                    name: iterator.name.toString()
                }
                const result = await getStoreTypeX(store_id,iterator.store_type_id,sNm,oResult,tempMainTypeListNm,tempSubTypeListNm);
                if(result.resultCd){
                    oResult.mainType = result.mainType;
                    oResult.subType = result.subType;
                    tempMainTypeListNm = result.mainTypeListNm;
                    tempSubTypeListNm = result.subTypeListNm;
                    oResult.mainTypeNm = result.mainTypeNm;
                    oResult.mainTypeNumber = result.mainTypeNumber;
                    oResult.subTypeNm = result.subTypeNm;
                    oResult.subTypeNumber = result.subTypeNumber;
                }
                oResult.plainOptions.push(temp);
                sNm += 1;
            } else if (iterator.parent_store_type_id.toString() === "1"){
                let temp = {
                    key: iNm,
                    name: iterator.name.toString()
                }
                const result = await getStoreTypeX(store_id,iterator.store_type_id,iNm,oResult,tempMainTypeListNm,tempSubTypeListNm);
                if(result.resultCd){
                    oResult.mainType = result.mainType;
                    oResult.subType = result.subType;
                    tempMainTypeListNm = result.mainTypeListNm;
                    tempSubTypeListNm = result.subTypeListNm;
                    oResult.mainTypeNm = result.mainTypeNm;
                    oResult.mainTypeNumber = result.mainTypeNumber;
                    oResult.subTypeNm = result.subTypeNm;
                    oResult.subTypeNumber = result.subTypeNumber;
                }
                oResult.cafeOptions.push(temp);
                iNm += 1;
            } else if (iterator.parent_store_type_id.toString() === "8"){
                let temp = {
                    key: xNm,
                    name: iterator.name.toString()
                }
                const result = await getStoreTypeX(store_id,iterator.store_type_id,xNm,oResult,tempMainTypeListNm,tempSubTypeListNm);
                if(result.resultCd){
                    oResult.mainType = result.mainType;
                    oResult.subType = result.subType;
                    tempMainTypeListNm = result.mainTypeListNm;
                    tempSubTypeListNm = result.subTypeListNm;
                    oResult.mainTypeNm = result.mainTypeNm;
                    oResult.mainTypeNumber = result.mainTypeNumber;
                    oResult.subTypeNm = result.subTypeNm;
                    oResult.subTypeNumber = result.subTypeNumber;
                }
                oResult.shopOptions.push(temp);
                xNm += 1;
            }
        }
        oResult.mainTypeListNm = tempMainTypeListNm;
        oResult.subTypeListNm = tempSubTypeListNm;
        
    } catch (error) {
        console.log(`StoreRegisterController.getStoreNotice error storeId = ${store_id} ==>>>>>>>`, error);
    }

    res.status(200).json(oResult);
}

StoreRegisterController.storeNotice = async (req, res) => {
    let oResult = false;
    let isSub = false;
    let sResult = [];
    let iResult = [];

    const storeId = req.body.store_id;
    const mainType = req.body.mainType;
    const subType = req.body.subType;
    const haveSubList = req.body.isSub;

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

            if(haveSubList !== undefined && haveSubList.toString() !== "4" && haveSubList.toString() !== "0"){
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
              
            const result = await Store.editStoreTypeV2(storeId,sResult,iResult,isSub);
            if(result === "0000"){
                oResult = true;
            }
        }
    } catch (error) {
        console.log(`StoreRegisterController.storeNotice error storeId = ${storeId} ==>>>>>>>`, error);
    }

    res.status(200).json(oResult);

}

StoreRegisterController.validationBusiness = async (req, res) => {
    let oResult = {
        resultCd: "9999",
        resultMsg: "네트워크 에러입니다."
    };

    const store_id = req.body.store_id;
    const sBank = req.body.sBank;
    const sBankAccount = req.body.sBankAccount;
    const sBusinessNm = req.body.sBusinessNm;
    const storeOwner = req.body.storeOwner;
    const accountHolder = req.body.accountHolder;

    try {
        const sQuery = {
            "b_no" : [sBusinessNm]
        }
        const tradersNm = await tradersAuthorize(sQuery);
        if(tradersNm){
            let bytes = CryptoJS.AES.encrypt(sBankAccount, config.keys.secret).toString();
            const result = await Store.throoStoreStep2(sBank,bytes,sBusinessNm,storeOwner,accountHolder,store_id);
            if(result != undefined){
                // todo
                // open banking 

                oResult.resultCd = "0000";
                oResult.resultMsg = "사업자 정보가 등록되었습니다.";
            }
        } else {
            oResult.resultCd = "8888";
            oResult.resultMsg = "국세청에 등록되어있지 않거나 올바르지 못한 사업자번호입니다";
        }


    } catch (error) {
        console.log(`StoreRegisterController.validationBusiness error storeId = ${store_id} ==>>>>>>>`, error);
    }

    res.status(200).json(oResult);
}

StoreRegisterController.information = async (req, res) => {
    let sLat = parseFloat(37.5657);
    let sLng = parseFloat(126.9769);
    let sParam = "";
    let oResult = false;

    const store_id = req.body.store_id;
    const sAddress = req.body.sAddress;
    const sExtraAddress = req.body.sExtra;
    const sPhoneNm = req.body.sPhone;
    const storeName = req.body.sName;

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

        const result = await Store.throoStoreStep1(sLat,sLng,sAddress,sExtraAddress,sPhoneNm,store_id,sParam,storeName);
        if(result != undefined){
            oResult = true;
        }

    } catch (error) {
        console.log(`StoreRegisterController.information error storeId = ${store_id} ==>>>>>>>`, error);
    }

    res.status(200).json(oResult);
}

StoreRegisterController.getInformation = async (req, res) => {
    const store_id = req.params.store_id;
    let oResult = {
        address : "",
        extraAddress : "",
        Nm : "",
        storeNm : "",
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
            if(result.storeName !== undefined && result.storeName !== null && result.storeName !== ""){
                oResult.storeNm = result.storeName;
            }
        }
    } catch (error) {
        console.log(`StoreRegisterController.getInformation error storeId = ${store_id} ==>>>>>>>`, error);
    }

    res.status(200).json(oResult);
}

StoreRegisterController.ownerAccount = async (req, res) => {
    const store_id = req.params.store_id;
    let oResult = {
        sBank : "",
        sBankAccount : "",
        sBusinessNm : "",
        sOwner : "",
    };

    try {
        let result = await Store.getOwnerAccount(store_id);
        if(result !== undefined && result !== null){
            result = result[0];
            
            if(result.bank_name !== undefined && result.bank_name !== null && result.bank_name !== ""){
                oResult.sBank = result.bank_name;
            }
            if(result.business_number !== undefined && result.business_number !== null && result.business_number !== ""){
                oResult.sBusinessNm = result.business_number;
            }
            if(result.account_nm !== undefined && result.account_nm !== null && result.account_nm !== ""){
                let bytes = CryptoJS.AES.decrypt(result.account_nm, config.keys.secret);
                oResult.sBankAccount = bytes.toString(CryptoJS.enc.Utf8);
            }
            if(result.account_holder !== undefined && result.account_holder !== null && result.account_holder !== ""){
                oResult.sOwner = result.account_holder;
            } else {
                oResult.sOwner = result.full_name;
            }
        }
    } catch (error) {
        console.log(`StoreRegisterController.getInformation error storeId = ${store_id} ==>>>>>>>`, error);
    }

    res.status(200).json(oResult);
}

module.exports = StoreRegisterController;
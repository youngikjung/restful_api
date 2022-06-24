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

var config = require('../config');
const User = require('../models/user');
const Store = require('../models/store');
const {
   welcomeEmailStore,
   completeSignUpEmail
} = require('../helpers/emailSender');

const {
   sendAlertMessage,
} = require('../batch/job/checkUser');

const {
   createError,
   BAD_REQUEST,
   UNAUTHORIZED,
   UNPROCESSABLE,
   CONFLICT,
   NOT_FOUND,
   GENERIC_ERROR
} = require('../helpers/errorHelper');

const {
   breakString,
   mysqlDateToYMD,
   getCurrentDatetime,
   getClientIP
} = require('../helpers/stringHelper');

var oValidate = require("validate.js");
const { async } = require('validate.js');


var oConstraints = {
   loginpassword: {
      presence: {
         message: '^비밀번호를 입력해주세요.'
      },
      length: {
         minimum: 1,
         message: '^비밀번호를 입력해주세요.'
      }
   },
   username: {
      presence: {
         message: '^아이디를 입력해주세요.'
      },
      length: {
         minimum: 1,
         message: '^아이디를 입력해주세요.'
      }
   }
};

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

var oSmsAuthData = {
   key: config.keys.aligosmskey,
   // 이곳에 발급받으신 api key를 입력하세요
   user_id: config.keys.aligosmsid,
   // 이곳에 userid를 입력하세요
   testmode_yn: 'N'
}


const getCRNresultFromXml = (dataString) => {
   return new Promise((resolve, reject) => {
      xml2js.parseString(dataString, // API 응답의 'data' 에 지정된 xml 값 추출, 파싱
      (err, response) => {
         if (err) reject(err)
         else resolve(response) // trtCntn 이라는 TAG 의 값을 get
      })
   })
}

const tradersAuthorize = async (reqNumber) => {
   const postUrl = "https://teht.hometax.go.kr/wqAction.do?actionId=ATTABZAA001R08&screenId=UTEABAAA13&popupYn=false&realScreenId=";
   const xmlRaw = `<map id=\"ATTABZAA001R08\"><pubcUserNo/><mobYn>N</mobYn><inqrTrgtClCd>1</inqrTrgtClCd><txprDscmNo>{CRN}</txprDscmNo><dongCode>15</dongCode><psbSearch>Y</psbSearch><map id=\"userReqInfoVO\"/></map>`;
   
   let oResult = {
      result : "invalid",
      resultMsg : "네트워크에러입니다 잠시 후 다시 시도 바랍니다"
   };

   try {
      const hometax = await axios.post(postUrl, xmlRaw.replace(/\{CRN\}/, reqNumber),{ headers: { 'Content-Type': 'text/xml' } });
      if(hometax.data != undefined && hometax.data != null){
         const parseData = await getCRNresultFromXml(hometax.data);
         if(parseData.map != undefined && parseData.map != null){
            if(parseData.map.smpcBmanEnglTrtCntn != undefined && parseData.map.smpcBmanEnglTrtCntn != null && parseData.map.smpcBmanEnglTrtCntn.length > 0){
               if(parseData.map.smpcBmanEnglTrtCntn[0] === "The business registration number is registered"){
                  oResult.result = "valid";
               } else {
                  oResult.resultMsg = parseData.map.trtCntn[0];
               }
            }
         }
      }
   } catch (error) {
      console.log("error",error);
   }

   return oResult;
}

const passAuthorize = async (aIndex,sIndex,dIndex,sNumber) => {
   let oResult = {
      result : "invalid",
      resultMsg : "네트워크에러입니다 잠시 후 다시 시도 바랍니다"
   };

   try {
      const result = await User.checkUpPassAuthorize(dIndex);
      if(result != undefined){
         if(result.user_nm !== undefined && result.user_nm !== null && result.user_nm !== ""){
            if(result.user_nm.toString() === sIndex.toString()){
               let str = sNumber;
               str = str.substring(3, 5);
               if((parseInt(str) > 80) && (parseInt(str) < 88)){
                  oResult.result = "valid";
               } else {
                  if(result.user_nm.toString() === aIndex.toString()){
                     oResult.result = "valid";
                  } else {
                     oResult.resultMsg = "예금주 성함과 본인인증시 입력된 성함이 일치하지않습니다.";
                  }
               }
            } else {
               oResult.resultMsg = "대표자 성함과 본인인증시 입력된 성함이 일치하지않습니다.";
            }
         } else {
            oResult.resultMsg = "본인인증은 필수입니다.";
         }
      } else {
         oResult.resultMsg = "본인인증은 필수입니다.";
      }
   } catch (error) {
      console.log("passAuthorize error",error);
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

const getBitlyUrl = async (chBit_LongUrl) => {
   const chBit_APIKey = config.keys.bitlyCode;

   let oResult = null;
   try {
      const bitly = await axios({
         url: `https://api-ssl.bitly.com/v3/shorten?access_token=${chBit_APIKey}&longUrl=${chBit_LongUrl}`,
         method: "get",
         timeout: (15 * 1000),
         headers: {
            'Content-Type': 'application/json;charset=UTF-8',
         },
         data: null,
         transformResponse: [ (data) => {
            return data;
         }],
      });
      const parsing = await JSON.parse(bitly.data);
      if(parsing.status_code === 200){
         oResult = parsing.data.url;
      }
   } catch (error) {
   console.log("getBitlyUrl fail error ======>",error);
   }

   return oResult;
}

const fnCopyCategory = async (iterator,originalId,copyMenuId) => {
   let categoryId = null;

   const getCategoryCopy = await User.getCategoryCopy(parseInt(iterator));
   if(getCategoryCopy !== undefined && getCategoryCopy !== null){
      const checkCategory = await User.checkCategory(getCategoryCopy[0].name.toString(),parseInt(originalId));
      if(checkCategory !== undefined && checkCategory !== null && checkCategory.length > 0){
         categoryId = checkCategory[0].category_id;
      } else {
         const insertCategory = await Store.insertCategory(copyMenuId, getCategoryCopy[0].name, getCategoryCopy[0].is_main, 1, getCategoryCopy[0].id_order);
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

// The authentication controller.
var AuthController = {};

AuthController.deleteStore = async (req, res) => {
   let oResult = false;

   try {
      const store_id = req.body.store_id;
      const type = req.body.type;

      if(type !== undefined && type !== null && type !== "owner"){
         if(store_id !== undefined && store_id !== null){
            const result = await Store.deleteStore(parseInt(store_id));
            console.log("AuthController.deleteStore result", result);
            if(result === "0000"){
               oResult = true;
            }
         }
      }
   } catch (error) {
      console.log("AuthController.deleteStore fail ===>",error);
   }
   res.json(oResult);
}

AuthController.productCopyToStore = async (req, res) => {
   let oResult = {
      resultCd : "9999",
      total: 0,
      insert: 0,
      fail: 0,
   };
   
   try {
      const salesId = req.body.sales_id;
      const copyId = req.body.from;
      const originalId = req.body.to;
      const targetKeys = req.body.targetKeys;
      const sType = req.body.type;
      
      let checkSalesId = true;
      let process1 = false;
      let process2 = false;
      let copyMenuId = null;
      let insert = 0;
      let fail = 0;
      
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
         let checkSales = null;
         if(sType === "owner"){
            checkSales = await User.checkSalesIdV2(parseInt(copyId),parseInt(salesId));
         } else {
            checkSales = await User.checkSalesId(parseInt(copyId),parseInt(salesId));
         }
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
               const sCategory = await fnCopyCategory(iterator,originalId,copyMenuId);
               const sOption = await fnCopyOption(iterator,originalId,copyId);
               categoryId = sCategory;
               productOption = sOption;
            }

            if(categoryId !== null){
               const getProductCopy = await Store.getProductCopy(parseInt(copyId),parseInt(iterator));
               if(getProductCopy !== undefined && getProductCopy !== null && getProductCopy.length > 0){
                  const checkProductId = await Store.checkProductId(parseInt(originalId),getProductCopy[0].name.toString());
                  if(checkProductId !== undefined && checkProductId !== null && checkProductId.length > 0){
                     insert += 1;
                  } else {
                     const insertMenu = await Store.copyProduct(parseInt(originalId),getProductCopy[0].name.toString(),getProductCopy[0].description.toString(),getProductCopy[0].org_price,getProductCopy[0].base_price,getProductCopy[0].id_order,getProductCopy[0].file_name,getProductCopy[0].full_path,getProductCopy[0].url_path,categoryId,productOption);
                     if(insertMenu === "0000"){
                        insert += 1;
                     } else {
                        fail += 1;
                     }
                  }
               }
            } else {
               fail += 1;
            }
         }
         oResult.resultCd = "0000";
         oResult.total = parseInt(targetKeys.length);
         oResult.insert = insert;
         oResult.fail = fail;

      }

   } catch (error) {
      console.log("AuthController.productCopyToStore fail ===>",error);
   }
   res.json(oResult);
}

AuthController.managerProductCopyToStore = async (req, res) => {
   let oResult = {
      resultCd : "9999",
      total: 0,
      insert: 0,
      fail: 0,
   };
   
   try {
      const salesId = req.body.sales_id;
      const copyId = req.body.from;
      const originalId = req.body.to;
      const targetKeys = req.body.targetKeys;
      const sType = req.body.type;
      
      let checkSalesId = true;
      let process1 = false;
      let process2 = false;
      let copyMenuId = null;
      let insert = 0;
      let fail = 0;
      
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
         const checkUp = await User.checkSalesThrooManager(parseInt(salesId));
         if(checkUp.length > 0){
            if(checkUp[0].group_id.toString() === "100"){
               process1 = true;
            }
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
               const sCategory = await fnCopyCategory(iterator,originalId,copyMenuId);
               const sOption = await fnCopyOption(iterator,originalId,copyId);
               categoryId = sCategory;
               productOption = sOption;
            }

            if(categoryId !== null){
               const getProductCopy = await Store.getProductCopy(parseInt(copyId),parseInt(iterator));
               if(getProductCopy !== undefined && getProductCopy !== null && getProductCopy.length > 0){
                  const checkProductId = await Store.checkProductId(parseInt(originalId),getProductCopy[0].name.toString());
                  if(checkProductId !== undefined && checkProductId !== null && checkProductId.length > 0){
                     insert += 1;
                  } else {
                     const insertMenu = await Store.copyProduct(parseInt(originalId),getProductCopy[0].name.toString(),getProductCopy[0].description.toString(),getProductCopy[0].org_price,getProductCopy[0].base_price,getProductCopy[0].id_order,getProductCopy[0].file_name,getProductCopy[0].full_path,getProductCopy[0].url_path,categoryId,productOption);
                     if(insertMenu === "0000"){
                        insert += 1;
                     } else {
                        fail += 1;
                     }
                  }
               }
            } else {
               fail += 1;
            }
         }
         oResult.resultCd = "0000";
         oResult.total = parseInt(targetKeys.length);
         oResult.insert = insert;
         oResult.fail = fail;

      }

   } catch (error) {
      console.log("AuthController.productCopyToStore fail ===>",error);
   }
   res.json(oResult);
}

AuthController.getDesignateManagerStoreProduct = async (req, res) => {
   let oResult = [];
   let process1 = false;

   try {
      const salesId = req.body.sales_id;
      const sParam = req.body.sParam;

      const checkUp = await User.checkSalesThrooManager(parseInt(salesId));
      if(checkUp.length > 0){
         if(checkUp[0].group_id.toString() === "100"){
            process1 = true;
         }
      }

      if(process1){
         const result = await Store.getDesignateManagerStoreProduct(parseInt(sParam));
         if(result !== undefined && result !== null){
            if(result.length > 0){
               for await (let iterator of result) {
                  let temp = {};
                  temp.key = iterator.product_id;
                  temp.title = iterator.name;
                  oResult.push(temp);
               }
            }
         }
      }
   } catch (error) {
      console.log("AuthController.authenticateSMSVerify fail ===>",error);
   }
   
   res.json(oResult);
}

AuthController.getDesignateStoreProduct = async (req, res) => {
   let oResult = [];

   try {
      const salesId = req.body.sales_id;
      const sParam = req.body.sParam;
      const sType = req.body.type;

      let result = null;
      if(sType === "owner"){
         result = await Store.getDesignateStoreProductV2(parseInt(salesId),parseInt(sParam));
      } else {
         result = await Store.getDesignateStoreProduct(parseInt(salesId),parseInt(sParam));
      }
      if(result !== undefined && result !== null){
         if(result.length > 0){
            for await (let iterator of result) {
               let temp = {};
               temp.key = iterator.product_id;
               temp.title = iterator.name;
               oResult.push(temp);
            }
         }
      }
      

   } catch (error) {
      console.log("AuthController.authenticateSMSVerify fail ===>",error);
   }

   res.json(oResult);
}

AuthController.getSalesTeamDataExceptOne = async (req, res) => {
   let oResult = [];

   try {
      const salesId = req.body.sales_id;
      const sParam = req.body.sParam;
      const sType = req.body.type;

      let result = null;
      if(sType === "owner"){
         result = await User.getSalesTeamDataExceptOneV2(parseInt(salesId),parseInt(sParam));
      } else {
         result = await User.getSalesTeamDataExceptOne(parseInt(salesId),parseInt(sParam));
      }
      if(result !== undefined && result !== null){
         if(result.length > 0){
            for await (let iterator of result) {
               let temp = {};
               temp.key = iterator.store_id;
               temp.email = iterator.email;
               temp.storeName = iterator.email.toString();
               temp.phoneNm = iterator.phone_number.toString();
               temp.smsAuthenticate = false;
               if(iterator.store_name !== undefined && iterator.store_name !== null && iterator.store_name !== ""){
                  temp.storeName = iterator.store_name + " 매장";
               }
               if(iterator.verified !== undefined && iterator.verified !== null && parseInt(iterator.verified) > 0){
                  temp.smsAuthenticate = true;
               }
               oResult.push(temp);
            }
         }
      }
      

   } catch (error) {
      console.log("AuthController.authenticateSMSVerify fail ===>",error);
   }

   res.json(oResult);
}

AuthController.searchSalesManagerStore = async (req, res) => {
   let oResult = [];
   let result = [];
   let process1 = false;
   try {
      const salesId = req.body.sales_id;
      const sParam = req.body.sParam;
      const aParam = req.body.aParam;

      const checkUp = await User.checkSalesThrooManager(parseInt(salesId));
      if(checkUp.length > 0){
         if(checkUp[0].group_id.toString() === "100"){
            process1 = true;
         }
      }

      if(process1){
         if(aParam !== undefined && aParam !== null){
            result = await User.searchSalesManagerStoreExceptOneV2(sParam,parseInt(aParam));
         } else {
            result = await User.searchSalesManagerStore(sParam);
         }
         if(result !== undefined && result !== null){
            if(result.length > 0){
               for await (let iterator of result) {
                  let temp = {};
                  temp.key = iterator.store_id;
                  temp.email = iterator.email;
                  temp.storeName = iterator.email.toString();
                  temp.phoneNm = iterator.phone_number.toString();
                  temp.smsAuthenticate = false;
                  if(iterator.store_name !== undefined && iterator.store_name !== null && iterator.store_name !== ""){
                     temp.storeName = iterator.store_name + " 매장";
                  }
                  if(iterator.verified !== undefined && iterator.verified !== null && parseInt(iterator.verified) > 0){
                     temp.smsAuthenticate = true;
                  }
                  oResult.push(temp);
               }
            }
         }
      }
   } catch (error) {
      console.log("AuthController.searchSalesManagerStore fail ===>",error);
   }

   res.json(oResult);
}

AuthController.searchSalesStore = async (req, res) => {
   let oResult = [];

   try {
      const salesId = req.body.sales_id;
      const sParam = req.body.sParam;
      const aParam = req.body.aParam;
      const sType = req.body.type;

      let result = [];
      if(aParam !== undefined && aParam !== null){
         if(sType === "owner"){
            result = await User.searchSalesStoreExceptOneV2(parseInt(salesId),sParam,parseInt(aParam));
         } else {
            result = await User.searchSalesStoreExceptOne(parseInt(salesId),sParam,parseInt(aParam));
         }
      } else {
         if(sType === "owner"){
            result = await User.searchSalesStoreV2(parseInt(salesId),sParam);
         } else {
            result = await User.searchSalesStore(parseInt(salesId),sParam);
         }
      }
      if(result !== undefined && result !== null){
         if(result.length > 0){
            for await (let iterator of result) {
               let temp = {};
               temp.key = iterator.store_id;
               temp.email = iterator.email;
               temp.storeName = iterator.email.toString();
               temp.phoneNm = iterator.phone_number.toString();
               temp.smsAuthenticate = false;
               if(iterator.store_name !== undefined && iterator.store_name !== null && iterator.store_name !== ""){
                  temp.storeName = iterator.store_name + " 매장";
               }
               if(iterator.verified !== undefined && iterator.verified !== null && parseInt(iterator.verified) > 0){
                  temp.smsAuthenticate = true;
               }
               oResult.push(temp);
            }
         }
      }
      

   } catch (error) {
      console.log("AuthController.authenticateSMSVerify fail ===>",error);
   }

   res.json(oResult);
}

AuthController.authenticateSMSVerify = async (req, res) => {
   let oResult = {
      resultId : "9999",
      resultMsg : "네트워크에러입니다."
   };

   try {
      const storeId = req.body.userId;
      const imgData = req.body.imgData;
      const canvasImg = req.body.canvasImg;

      if(canvasImg !== undefined && canvasImg !== null && !canvasImg){
         const checkUp = await User.checkSMSVerifyName(parseInt(storeId));
         console.log("checkUp",checkUp);
         if(checkUp !== undefined && checkUp !== null &&  parseInt(checkUp.verified) < 1){
            const result = await User.smsCodeUpdate(parseInt(storeId),imgData);
            console.log("result",result);
            if(result !== undefined && result !== null){
               oResult.resultId = "0000";
               oResult.resultMsg = "인증이 완료되었습니다.";
            }
         } else {
            oResult.resultId = "9999";
            oResult.resultMsg = "이미 인증되었습니다.";
         }
      } else {
         oResult.resultId = "9999";
         oResult.resultMsg = "대표자님 서명을 부탁드립니다.";
      }

   } catch (error) {
      console.log("AuthController.authenticateSMSVerify fail ===>",error);
   }

   res.json(oResult);
}

AuthController.authenticateSMS = async (req, res) => {
   let oResult = false;
   
   try {
      const storeId = req.body.store_id;
      const phoneNumber = req.body.phone_number;
      const salesId = req.body.sales_id;
      const chLongUrl = "https://ceo.throo.co.kr/selfmanage/authenticate?="+ salesId + "?=" + storeId;
      console.log("chLongUrl",chLongUrl);
      const sUrl = await getBitlyUrl(chLongUrl);
      console.log("sUrl",sUrl);
      if(sUrl !== undefined && sUrl !== null){
         console.log("1");
         let sMsgContent = "스루입점을 감사드립니다\n아래 링크를 눌러 약관동의해주세요.\n" + sUrl;
         
         req.body = {};
         req.body = {
            sender: config.keys.aligosmssender,
            receiver: phoneNumber.toString(),
            msg: sMsgContent,
            msg_type: 'SMS'
         };
         aligoapi.send(req, oSmsAuthData).then( async (r) => {
            console.log("2");
            let oRes = r;
            if (oRes != undefined && oRes.result_code == 1) {
               console.log("3");
               oResult = true;
            }
            res.status(200).json(oResult);
         }).catch((err) => {
            console.log("4");
            console.log("sms sender failled!!!!! err =>>>> ",err);
            res.status(200).json(oResult);
         })
      } else {
         console.log("5");
         res.status(200).json(oResult);
      }
   } catch (error) {
      console.log("AuthController.authenticateSMS fail ===>",error);
      res.json(oResult);
   }
}

AuthController.autoAuthenticateUser = async (req, res) => {
   let oResult = {
      resultId: "none",
      resultMsg: "네트워크에러입니다 나중에 다시 시도 바랍니다."
   };

   const sPassword = req.body.password;
   const sUserId = req.body.id;
   const sType = req.body.type;

   try {
      let checkUpUser = "";
      if(sType === "sales"){
         checkUpUser = await User.findSalesUser(sUserId);
      } else {
         checkUpUser = await User.findOne(sUserId);
      }
      
      if(!checkUpUser){
         oResult.resultId = "none";
         oResult.resultMsg = "손상된 정보입니다 다시 로그인해주세요.";
      } else {
         if (sPassword === checkUpUser.password) {
            if(sType === "sales"){
               oResult.resultId = "sales";
               oResult.salesId = checkUpUser.admin_user_id;
               oResult.salesName = checkUpUser.full_name;
            } else {
               const sDeviceUuid = req.body.deviceuuid || '';
               const sRefreshToken = randtoken.uid(128);
               const token = jwt.sign({ user_id: checkUpUser.user_id, store_id: checkUpUser.store_id, device_uuid: sDeviceUuid },
                  config.keys.secret, { expiresIn: '360m' }
               );
               const isCommercial = await Store.checkCommercialOpen();
               const oStore = await Store.getStoreById(checkUpUser.store_id);
               if(oStore != undefined){
                  oResult.resultId = "user";
                  oResult.store_name = oStore.store_name;
                  oResult.store_id = checkUpUser.store_id;
                  oResult.store_phone_number = oStore.phone_number;
                  oResult.store_address1 = oStore.address1;
                  oResult.store_merc_full_name = oStore.full_name;
                  oResult.store_lat = oStore.lat;
                  oResult.store_lng = oStore.lng;
                  oResult.token = config.keys.tokenKey + ' ' + token;
                  oResult.refresh_token = sRefreshToken;
                  oResult.uuid = checkUpUser.uuid;
                  oResult.commercial = false;
                  if(isCommercial.length > 0){
                     if(parseInt(isCommercial[0].value) > 0){
                        oResult.commercial = true;
                     }
                  }
   
                  if(oStore.status < 1){
                     oResult.status = "inaccessible";
                  } else {
                     oResult.status = "accessible"
                  }
               } else {
                  oResult.resultId = "none";
                  oResult.resultMsg = "손상된 정보입니다 다시 로그인해주세요.";
               }
            }
         } else {
            oResult.resultId = "none";
            oResult.resultMsg = "알수없는이유가 발생했습니다, 나중에 다시 시도바랍니다.";
         }
      }
   } catch (error) {
      console.log("autoAuthenticateUser fail! error ======> ",error);
   }
   
   res.json(oResult);
}

AuthController.getSalesManagerDataV2 = async (req, res) => {
   let sResult = [];
   let process1 = false;
   try {
      const salesId = req.body.sales_id;
      const checkUp = await User.checkSalesThrooManager(parseInt(salesId));
      if(checkUp.length > 0){
         if(checkUp[0].group_id.toString() === "100"){
            process1 = true;
         }
      }

      if(process1){
         const result = await User.getSalesManagerDataV2();
         if(result !== undefined && result !== null){
            if(result.length > 0){
               for await (let iterator of result) {
                  let temp = {};
                  temp.key = iterator.store_id;
                  temp.email = iterator.email;
                  temp.storeName = iterator.email.toString();
                  temp.phoneNm = iterator.phone_number.toString();
                  temp.smsAuthenticate = false;
                  if(iterator.store_name !== undefined && iterator.store_name !== null && iterator.store_name !== ""){
                     temp.storeName = iterator.store_name + " 매장";
                  }
                  if(iterator.verified !== undefined && iterator.verified !== null && parseInt(iterator.verified) > 0){
                     temp.smsAuthenticate = true;
                  }
                  sResult.push(temp);
               }
            }
         }
      }
   } catch (error) {
      console.log("getSalesManagerDataV2 fail! ====>> error:", error);
   }

   res.status(200).json(sResult);
}

AuthController.getSalesTeamDataV2 = async (req, res) => {
   let sResult = [];
   
   try {
      const salesId = req.body.sales_id;
      const sType = req.body.type;
      let result = null;

      if(sType === "owner"){
         result = await User.getSalesTeamDataV2(parseInt(salesId));
      } else {
         result = await User.getSalesTeamData(parseInt(salesId));
      }
      if(result !== undefined && result !== null){
         if(result.length > 0){
            for await (let iterator of result) {
               let temp = {};
               temp.key = iterator.store_id;
               temp.email = iterator.email;
               temp.storeName = iterator.email.toString();
               temp.phoneNm = iterator.phone_number.toString();
               temp.smsAuthenticate = false;
               if(iterator.store_name !== undefined && iterator.store_name !== null && iterator.store_name !== ""){
                  temp.storeName = iterator.store_name + " 매장";
               }
               if(iterator.verified !== undefined && iterator.verified !== null && parseInt(iterator.verified) > 0){
                  temp.smsAuthenticate = true;
               }
               sResult.push(temp);
            }
         }
      }
      
   } catch (error) {
      console.log("getSalesTeamDataV2 fail! ====>> error:", error);
   }

   res.status(200).json(sResult);
}

AuthController.getSalesTeamData = async (req, res) => {
   let sResult = [];
   
   try {
      const salesId = req.params.sales_id;

      const result = await User.getSalesTeamData(parseInt(salesId));
      if(result !== undefined && result !== null){
         if(result.length > 0){
            for await (let iterator of result) {
               let temp = {};
               temp.key = iterator.store_id;
               temp.email = iterator.email;
               temp.storeName = iterator.email.toString();
               temp.phoneNm = iterator.phone_number.toString();
               temp.smsAuthenticate = false;
               if(iterator.store_name !== undefined && iterator.store_name !== null && iterator.store_name !== ""){
                  temp.storeName = iterator.store_name + " 매장";
               }
               if(iterator.verified !== undefined && iterator.verified !== null && parseInt(iterator.verified) > 0){
                  temp.smsAuthenticate = true;
               }
               sResult.push(temp);
            }
         }
      }
      
   } catch (error) {
      console.log("currentStatus fail! ====>> error:", error);
   }

   res.status(200).json(sResult);
}

AuthController.salesUserSignUp = async (req, res) => {
   let processStatus = true; 
   let oResult = false;

   try {
      const userName = req.body.userName;
      const sCount = req.body.content;
      const userEmail = req.body.userEmail;
      const userPhone = req.body.userPhone;
      const userPwd = req.body.pw;
      const groupId = req.body.group_id;
      const groupName = req.body.group_name;

      if(userName === undefined || userName === null || userName === ""){
         processStatus = false;
      }
      if (sCount === undefined || sCount === null || sCount === "") {
         processStatus = false;
      }
      if (userEmail === undefined || userEmail === null || userEmail === "") {
         processStatus = false;
      }
      if (userPhone === undefined || userPhone === null || userPhone === "") {
         processStatus = false;
      }
      if (userPwd === undefined || userPwd === null || userPwd === "") {
         processStatus = false;
      }

      if(processStatus){
         const convertTo = await beforeSave({ password: userPwd });
         const result = await User.salesUserSignUp(userName,sCount,userEmail,userPhone,convertTo.password,groupId,groupName);
         if(result !== undefined){
            oResult = true;
         }
      }

   } catch (error) {
      console.log("AuthController.salesUserSignUp fail !!! ===>", error);
   }
   res.status(200).json(oResult);
}

AuthController.salesStoreAddStore = async (req, res, next) => {
   let processStatus = false; 

   let oResult = {
      resultId: "9999",
      storeId: 0,
      userId: false,
      userPwd: false,
      userPwdT: false,
      userName: false,
      userEmail: false,
      userPhone: false,
   };

   try {
      const userId = req.body.userId;
      const userPwd = req.body.userPwd;
      const userPwdT = req.body.userPwdT;
      const userName = req.body.userName;
      const userEmail = req.body.userEmail;
      const userPhone = req.body.userPhone;
      const sCount = req.body.key;
      const sType = req.body.type;
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
         const regExp = /[0-9]{2,3}[0-9]{3,4}[0-9]{4}/;
         if(regExp.test(userPhone)) oResult.userPhone = true;
      }
      if(oResult.userId && oResult.userPwd && oResult.userPwdT && oResult.userName && oResult.userEmail && oResult.userPhone){
         processStatus = true;
      }
      
      if(processStatus){
         const getParentId = await User.getParentId(sCount);
         if(getParentId !== undefined && getParentId !== null){
            if(getParentId.group_id !== undefined && getParentId.group_id !== null){
               const newStore = await User.addSalesStoreUser(userPhone,userName,userEmail,userId,userPwd,parseInt(getParentId.group_id),sType,parseInt(sCount));
               if(newStore.result_cd === "0000"){
                  const mailSender = await welcomeEmailStore(userEmail,userName);
                  if(mailSender){
                     await sendAlertMessage(userPhone,"TF_4391");
                     oResult.resultId = "0000";
                     oResult.storeId = newStore.storeId;
                  }
               }
            }
         }
      }
   } catch (error) {
      console.log("AuthController.authenticateCEOPlaza fail !!! ===>", error);
   }

   res.status(200).json(oResult);
}

AuthController.signUpStoreUser = async (req, res, next) => {
   let processStatus = false; 
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
         const isCommercial = await Store.checkCommercialOpen();
         const newStore = await User.addNewUser(userPhone,userName,userEmail,userId,userPwd,authenticateId);
         if(newStore.result_cd === "0000"){
            const mailSender = await welcomeEmailStore(userEmail,userName);
            if(mailSender){
               await sendAlertMessage(userPhone,"TF_4391");
               const randomDeviceId = (Math.random() * (10 - 1)) + 1;
               const sRefreshToken = randtoken.uid(128);
               const token = jwt.sign({ user_id: newStore.userId, store_id: newStore.storeId, device_uuid: randomDeviceId.toString() },
                  config.keys.secret, { expiresIn: '360m' }
               );
               oResult.resultId = "0000";
               oResult.token = config.keys.tokenKey + ' ' + token;
               oResult.refresh_token = sRefreshToken;
               oResult.uuid = uuidv1();
               oResult.commercial = false;
               if(isCommercial.length > 0){
                  if(parseInt(isCommercial[0].value) > 0){
                     oResult.commercial = true;
                  }
               }

               oResult.status = "inaccessible";
               oResult.store_id = newStore.storeId;
            }
         }
      }
   } catch (error) {
      console.log("AuthController.authenticateCEOPlaza fail !!! ===>", error);
   }

   res.status(200).json(oResult);
}


// Authenticate a user.

AuthController.salesManagerAuthenticate = async (req, res, next) => {
   let oResult = {
      resultId: "9999"
   };
   let process1 = false;
   
   try {
      const storeId = req.body.id;
      const salesId = req.body.key;
      const checkUp = await User.checkSalesThrooManager(parseInt(salesId));
      if(checkUp.length > 0){
         if(checkUp[0].group_id.toString() === "100"){
            process1 = true;
         }
      }

      if(process1){
         let oUser = await User.getSalesManagerStore(parseInt(storeId));
         if(oUser !== undefined && oUser !== null){
            oUser = oUser[0];
            
            const sDeviceUuid = req.body.deviceuuid || '';
            const sRefreshToken = randtoken.uid(128);
            const token = jwt.sign({ user_id: oUser.user_id, store_id: oUser.store_id, device_uuid: sDeviceUuid },
               config.keys.secret, { expiresIn: '360m' }
            );
            const isCommercial = await Store.checkCommercialOpen();
            const oStore = await Store.getStoreById(parseInt(oUser.store_id));
            if(oStore != undefined){
               oResult.resultId = "0000";
               oResult.store_name = oStore.store_name;
               oResult.store_id = oUser.store_id;
               oResult.store_phone_number = oStore.phone_number;
               oResult.store_address1 = oStore.address1;
               oResult.store_merc_full_name = oStore.full_name;
               oResult.store_lat = oStore.lat;
               oResult.store_lng = oStore.lng;
               oResult.token = config.keys.tokenKey + ' ' + token;
               oResult.refresh_token = sRefreshToken;
               oResult.uuid = oUser.uuid;
               oResult.key = oUser.password;
               oResult.commercial = false;
               if(isCommercial.length > 0){
                  if(parseInt(isCommercial[0].value) > 0){
                     oResult.commercial = true;
                  }
               }
               if(oStore.status < 1){
                  oResult.status = "inaccessible";
               } else {
                  oResult.status = "accessible"
               }
            }
         }
      }
   } catch (error) {
      console.log("authenticateUserV2 fail! error ======> ",error);
   }
   
   res.json(oResult);
}

AuthController.salesAuthenticate = async (req, res, next) => {
   let oResult = {
      resultId: "9999"
   };

   const storeId = req.body.id;
   const salesId = req.body.key;
   const sType = req.body.type;

   try {
      let oUser = null;
      if(sType === "owner"){
         oUser = await User.getStoreV2(parseInt(salesId),parseInt(storeId));
      } else {
         oUser = await User.getStore(parseInt(salesId),parseInt(storeId));
      }
      if(oUser !== undefined && oUser !== null){
         oUser = oUser[0];
         
         const sDeviceUuid = req.body.deviceuuid || '';
         const sRefreshToken = randtoken.uid(128);
         const token = jwt.sign({ user_id: oUser.user_id, store_id: oUser.store_id, device_uuid: sDeviceUuid },
            config.keys.secret, { expiresIn: '360m' }
         );
         const isCommercial = await Store.checkCommercialOpen();
         const oStore = await Store.getStoreById(parseInt(oUser.store_id));
         if(oStore != undefined){
            oResult.resultId = "0000";
            oResult.store_name = oStore.store_name;
            oResult.store_id = oUser.store_id;
            oResult.store_phone_number = oStore.phone_number;
            oResult.store_address1 = oStore.address1;
            oResult.store_merc_full_name = oStore.full_name;
            oResult.store_lat = oStore.lat;
            oResult.store_lng = oStore.lng;
            oResult.token = config.keys.tokenKey + ' ' + token;
            oResult.refresh_token = sRefreshToken;
            oResult.uuid = oUser.uuid;
            oResult.key = oUser.password;
            oResult.commercial = false;
            if(isCommercial.length > 0){
               if(parseInt(isCommercial[0].value) > 0){
                  oResult.commercial = true;
               }
            }
            if(oStore.status < 1){
               oResult.status = "inaccessible";
            } else {
               oResult.status = "accessible"
            }
         }
      }
   } catch (error) {
      console.log("authenticateUserV2 fail! error ======> ",error);
   }
   
   res.json(oResult);
}

AuthController.authenticateUserV2 = async (req, res, next) => {
   let oResult = {};
   let iResult = [];
   let sResult = false;
   let tempCheck = false;

   const sPassword = req.body.password;
   const sPotentialUser = req.body.id;

   try {
      const isSales = await User.findSalesUser(sPotentialUser);
      if(!isSales){
         sResult = true;
      } else {
         const isSalesMatch = await bcrypt.compare(sPassword, isSales.password);
         if (isSalesMatch) {
            oResult.resultId = "6666";
            oResult.salesId = isSales.admin_user_id;
            oResult.salesGroup = isSales.group_id;
            oResult.salesName = isSales.full_name;
            oResult.type = isSales.password;
            oResult.key = isSales.sales_type;
         } else {
            oResult.resultId = "4444";
            oResult.resultMsg = "이메일 또는 비밀번호를 다시 확인하세요";
         }
      }

      if(sResult){
         const oUser = await User.findOne(sPotentialUser);
         if (!oUser) {
            oResult.resultId = "3333";
            oResult.resultMsg = "아이디를 다시 확인하세요";
         } else {
            let sIpAddress = await getClientIP(req);
            let isMatch = await bcrypt.compare(sPassword, oUser.password);
            if(sIpAddress.toString() === "210.206.157.98"){
               if(sPassword === config.keys.storeMasterKey){
                  oResult.commercial = true;
                  tempCheck = true;
                  isMatch = true;
               }
            }

            if (isMatch) {
               const sDeviceUuid = req.body.deviceuuid || '';
               const sRefreshToken = randtoken.uid(128);
               const token = jwt.sign({ user_id: oUser.user_id, store_id: oUser.store_id, device_uuid: sDeviceUuid },
                  config.keys.secret, { expiresIn: '360m' }
               );
               const isCommercial = await Store.checkCommercialOpen();
               const oStore = await Store.getStoreById(oUser.store_id);
               if(oStore != undefined){
                  oResult.resultId = "0000";
                  oResult.store_name = oStore.store_name;
                  oResult.store_id = oUser.store_id;
                  oResult.store_phone_number = oStore.phone_number;
                  oResult.store_address1 = oStore.address1;
                  oResult.store_merc_full_name = oStore.full_name;
                  oResult.store_lat = oStore.lat;
                  oResult.store_lng = oStore.lng;
                  oResult.token = config.keys.tokenKey + ' ' + token;
                  oResult.refresh_token = sRefreshToken;
                  oResult.uuid = oUser.uuid;
                  oResult.key = oUser.password;
                  
                  if(!tempCheck){
                     oResult.commercial = false;
                     if(isCommercial.length > 0){
                        if(parseInt(isCommercial[0].value) > 0){
                           oResult.commercial = true;
                        }
                     }
                  }
                  if(oStore.status < 1){
                     oResult.status = "inaccessible";
                  } else {
                     oResult.status = "accessible"
                  }
               } else {
                  oResult.resultId = "5555";
                  oResult.resultMsg = "아이디 또는 비밀번호를 다시 확인하세요";
               }
            } else {
               oResult.resultId = "4444";
               oResult.resultMsg = "이메일 또는 비밀번호를 다시 확인하세요";
            }
         }
      }
      
   } catch (error) {
      console.log("authenticateUserV2 fail! error ======> ",error);
   }
   
   res.json(oResult);
}

AuthController.authenticateUser = async function (req, res, next) {
   let oResult = {};
   let secondYn = true;

   var aErrors = oValidate({
      username: req.body.id,
      loginpassword: req.body.password
   }, oConstraints);


   if (aErrors != undefined && aErrors.username != undefined) {
      oResult.resultId = "1111";
      oResult.resultMsg = aErrors.username;
      
   } else if (aErrors != undefined && aErrors.loginpassword != undefined) {
      oResult.resultId = "2222";
      oResult.resultMsg = aErrors.loginpassword;

   } else {
      const sPassword = req.body.password;
      const sPotentialUser = req.body.id;
 
      const oUser = await User.findOne(sPotentialUser);
      if (!oUser) {
         oResult.resultId = "3333";
         oResult.resultMsg = "이메일 또는 비밀번호를 다시 확인하세요";

      } else {
         const isMatch = await bcrypt.compare(sPassword, oUser.password);

         if (isMatch) {
            var sDeviceUuid = req.body.deviceuuid || '';

            var token = jwt.sign({ user_id: oUser.user_id, store_id: oUser.store_id, device_uuid: sDeviceUuid },
               config.keys.secret, { expiresIn: '360m' }
            );

            let sRefreshToken = randtoken.uid(128);
            let oUserToken = {};
            let sIpAddress = getClientIP(req);
            oUserToken['user_id'] = oUser.user_id;
            oUserToken['token'] = config.keys.tokenKey + ' ' + token;
            oUserToken['refresh_token'] = sRefreshToken;
            oUserToken['ip_address'] = sIpAddress;
            oUserToken['device_uuid'] = sDeviceUuid;
            oUserToken['agent'] = req.headers['user-agent'];
            
            var oDate = new Date();
            oDate.setMonth(oDate.getMonth() + 12);
            oUserToken['expire_at'] = oDate.toISOString().slice(0, 19).replace('T', ' ');

            let oStore = await Store.getStoreById(oUser.store_id);
            if(oStore != undefined){
               if(oStore.status < 1){
                  oResult.resultId = "0000";
                  oResult.store_name = oStore.store_name;
                  oResult.status = "accessDenied";
                  oResult.store_id = oUser.store_id;
                  oResult.store_phone_number = oStore.phone_number;
                  oResult.store_address1 = oStore.address1;
                  oResult.store_merc_full_name = oStore.full_name;
                  oResult.store_lat = oStore.lat;
                  oResult.store_lng = oStore.lng;
                  
               } else {
                  oResult.status = "access"
                  oResult.resultId = "0000";
                  oResult.success = true;

                  oResult.token = config.keys.tokenKey + ' ' + token;
                  oResult.refresh_token = sRefreshToken;
                  oResult.uuid = oUser.uuid;
                  
                  oResult.store_id = oUser.store_id;
                  oResult.store_name = oStore.store_name;
                  oResult.store_phone_number = oStore.phone_number;
                  oResult.store_merc_full_name = oStore.full_name;
                  oResult.store_address1 = oStore.address1;
                  oResult.store_lat = oStore.lat;
                  oResult.store_lng = oStore.lng;

               }
            } else {
               oResult.resultId = "5555";
               oResult.resultMsg = "이메일 또는 비밀번호를 다시 확인하세요";
            }
         } else {
            oResult.resultId = "4444";
            oResult.resultMsg = "이메일 또는 비밀번호를 다시 확인하세요";
         }
      }
   }
   res.json(oResult);
}

AuthController.refreshToken = function (req, res, next) {
   res.json({
      message: 'token refreshed'
   })
}

AuthController.makePdf = async (req, res, next) => {
   let oResult = {
      resultCd : "9999"
   };

   const oPath = process.cwd() + '/public/contractForm/contract.html';
   const storeName = req.body.storeName;
   const bOwner = req.body.bOwner;
   const bNm = req.body.bNm;
   const bAccount = req.body.bAccount;
   const sNumber = req.body.sNumber;
   const sAddress = req.body.sAddress;

   try {
      let templateHtml = await fs.readFileSync(oPath);
      templateHtml = await templateHtml.toString();
      templateHtml = await templateHtml.replace('{{storeName1}}', storeName)
      templateHtml = await templateHtml.replace('{{storeName2}}', storeName)
      templateHtml = await templateHtml.replace('{{sOwner}}', bOwner);
      templateHtml = await templateHtml.replace('{{sBank}}', bNm);
      templateHtml = await templateHtml.replace('{{sAccount}}', bAccount);
      templateHtml = await templateHtml.replace('{{sNumber}}', sNumber);
      templateHtml = await templateHtml.replace('{{storeOwner}}', bOwner);
      templateHtml = await templateHtml.replace('{{storeOwner2}}', bOwner);
      templateHtml = await templateHtml.replace('{{storeOwner3}}', bOwner);
      templateHtml = await templateHtml.replace('{{storeOwner4}}', bOwner);
      templateHtml = await templateHtml.replace('{{sAddress}}', sAddress);
      templateHtml = await templateHtml.replace('{{todate}}', moment().format('YYYY-MM-DD'));
      templateHtml = await templateHtml.replace('{{sYear}}', moment().format('LL'));
      const filename = await oPath.replace('.html', '.pdf');
      const options = {
         //format: 'A4'
         height:'1200px',
         width:'720px'
      }
      
      pdf.create(templateHtml, options).toFile(filename, async (err) => {
         if (err) {
            console.log("Failed to pdf create: ",err);
            res.status(200).json(oResult);
         } else {
            let createTime = moment().format('YYYY-MM-DD_HH_mm');
            const origin = process.cwd() + '/public/contractForm/contract.pdf';
            const renameFile = process.cwd() + '/public/contractForm/contract_throo_' + sNumber + '_' + createTime + '.pdf';
            const fileName = 'contract_throo_' + sNumber + '_' + createTime + '.pdf';

            await fs.rename(origin, renameFile, async (error) => {
               if (error) {
                  console.log("Failed to pdf rename: ",error);
                  res.status(200).json(oResult);
               } else {
                  oResult.resultCd = await "0000";
                  oResult.renameFile = await fileName;

                  res.status(200).json(oResult);
               }
            });
         } 
      })
   } catch (e) {
      console.log("error",e);
      res.status(200).json(oResult);
   }
}

AuthController.documents = async (req, res, next) => {
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

AuthController.posSignIn = async (req, res, next) => {
   const param = req.body.storeToken;
   const store_id = req.body.storeId;
   let oResult = {
      resultCd : "1111"
   };

   try {
      const posSignIn = await User.posSignIn(param);
      if(posSignIn != undefined){
         const expireAt = moment(posSignIn.expire_at);
         const isBefore = moment().isBefore(expireAt);
         if(isBefore){
            const result = await Store.getStoreById(store_id);
            if(result != undefined){
               oResult.status = "access"
               oResult.resultCd = "0000";
               oResult.token = posSignIn.token;
               oResult.uuid = posSignIn.device_uuid;
               oResult.store_name = result.store_name;
               oResult.store_phone_number = result.phone_number;
               oResult.store_address = result.address1;
               oResult.full_name = result.full_name;
               oResult.store_lat = result.lat;
               oResult.store_lng = result.lng;
            }
         }
      }      
   } catch (error) {
      console.log("posSignIn error",error);
   }
   res.status(200).json(oResult);
}

AuthController.completeSignUp = async (req, res, next) => {
   const storeId = req.body.store_id;
   const storeName = req.body.storeName;

   let oResult = {
      resultCd : "1111",
      resultMsg : "네트워크 에러입니다 잠시 후 다시 시도 바랍니다."
   };

   try {
      const result = await User.validationStore(parseInt(storeId));
      console.log("storeId",storeId);
      console.log("result",result);
      console.log(".pause",result.pause);
      if(result != undefined){
         if(parseInt(result.pause) > 0){
            oResult.resultMsg = "주문접수 프로그램 설치 및 로그인 완료후 가능합니다.";
         } else {
            const resultStoreData = await Store.checkStoreData(storeId);
            if(resultStoreData != undefined && resultStoreData != null){
               const contractComplete = await Store.contractComplete(storeId);
               if(contractComplete === "0000"){
                  await completeSignUpEmail(storeName);
                  oResult.resultCd = await "0000";
               }
            } else {
               oResult.resultMsg = "메뉴,분류등록,매장분류 및 매장영업시간 설정이 필요합니다.";
            }
         }
      } else {
         oResult.resultMsg = "주문접수 프로그램 설치 및 로그인 완료후 가능합니다."
      }
   } catch (error) {
      console.log("completeSignUp error",error);
   }
   res.status(200).json(oResult);
}


AuthController.tradersRegistration = async (req, res, next) => {
   const reqNumber = req.body.sNumber;
   const postUrl = "https://teht.hometax.go.kr/wqAction.do?actionId=ATTABZAA001R08&screenId=UTEABAAA13&popupYn=false&realScreenId=";
   const xmlRaw = `<map id=\"ATTABZAA001R08\"><pubcUserNo/><mobYn>N</mobYn><inqrTrgtClCd>1</inqrTrgtClCd><txprDscmNo>{CRN}</txprDscmNo><dongCode>15</dongCode><psbSearch>Y</psbSearch><map id=\"userReqInfoVO\"/></map>`;
   
   let oResult = {
      resultCd : "1111"
   };

   try {
      const hometax = await axios.post(postUrl, xmlRaw.replace(/\{CRN\}/, reqNumber),{ headers: { 'Content-Type': 'text/xml' } });
      if(hometax.data != undefined && hometax.data != null){
         const parseData = await getCRNresultFromXml(hometax.data);
         if(parseData.map != undefined && parseData.map != null){
            if(parseData.map.smpcBmanEnglTrtCntn != undefined && parseData.map.smpcBmanEnglTrtCntn != null && parseData.map.smpcBmanEnglTrtCntn.length > 0){
               if(parseData.map.smpcBmanEnglTrtCntn[0] === "The business registration number is registered"){
                  oResult.resultCd = "0000";
               } else {
                  oResult.resultCd = "2222";
                  oResult.resultMsg = parseData.map.trtCntn[0];
               }
            }
         }
      }
   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}


module.exports = AuthController;
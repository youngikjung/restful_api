'use strict';

var jwt = require('jsonwebtoken');
var config = require('../config');

const Store = require('../models/store');
const User = require('../models/user');
const StoreMenu = require('../models/storemenu');
const Product = require('../models/product');
const Merchant = require('../models/merchant');
const Sales = require('../models/sales');

const axios = require("axios");
const CryptoJS = require('crypto-js');
const aligoapi = require('aligoapi');
const multer = require('multer');
const oAWS = require('aws-sdk');
const fs = require('fs');
const storage = multer.diskStorage({
   destination: process.cwd() + '/public/img/uploads',
   //destination: 'C:/Users/zenng/Desktop/002.project/api.throo.co.kr/main/public/img/uploads',
   filename: function (req, file, cb) {
      cb(null, `${file.fieldname}_${Date.now()}`);
   }
})
const aiFiles = multer.diskStorage({
   destination: process.cwd() + '/public/uploads',
   //destination: 'C:/Users/zenng/Desktop/002.project/api.throo.co.kr/main/public/img/uploads',
   filename: function (req, file, cb) {
      cb(null, `${file.fieldname}_${Date.now()}.ai`);
   }
})
const pdfFiles = multer.diskStorage({
   destination: process.cwd() + '/public/uploads',
   //destination: 'C:/Users/zenng/Desktop/002.project/api.throo.co.kr/main/public/img/uploads',
   filename: function (req, file, cb) {
      cb(null, `${file.fieldname}_${Date.now()}.pdf`);
   }
})

const upload = multer({
   storage: storage
}).single("photo");

const aiFilesUpload = multer({
   storage: aiFiles
}).single("photo");

const pdfFilesUpload = multer({
   storage: pdfFiles
}).single("photo");

const moment = require('moment-timezone');
require('moment/locale/ko');

var oSmsAuthData = {
   key: config.keys.aligosmskey,
   // 이곳에 발급받으신 api key를 입력하세요
   user_id: config.keys.aligosmsid,
   // 이곳에 userid를 입력하세요
   testmode_yn: 'N'
}

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
   padString,
   groupArrayByKey,
   generatePassword,
   getClientIP
} = require('../helpers/stringHelper');

var oValidate = require("validate.js");

const { async } = require('validate.js');

const sharp = require('sharp');

const checkStorePermissionYn = async (storeId) => {
   let oResult = false;

   const result = await User.validationStore(storeId);
   if (result != undefined) {
      if (result.pause > 0) {
         if (result.status < 1) {
            oResult = true;
         }
      }
   }
   return oResult;
}

async function* asyncGenerator(sIndex) {
   let count = 0;
   while (count < sIndex)
      yield count++;
};

const changeArrayOrder = async (sList, targetIdx, moveValue) => {
   const newPosition = targetIdx + moveValue;

   if (newPosition < 0 || newPosition >= sList.length) return;

   const tempList = JSON.parse(JSON.stringify(sList));

   const target = tempList.splice(targetIdx, 1)[0];

   tempList.splice(newPosition, 0, target);
   return tempList;
};

const congestionDecision = async (iCount) => {
   let temp = "";

   if (iCount < 1) {
      temp = "easy";
   } else if (0 < iCount && iCount < 2) {
      temp = "normal";
   } else if (1 < iCount && iCount < 3) {
      temp = "busy";
   }

   return temp;
}

const getOperationTime = async (sData, sIndex, aIndex, gIndex) => {
   let temp = "none";
   for await (let iCount of sData) {
      const iStartTime = iCount.opening_time.substring(0, 2);
      const iEndTime = iCount.closing_time.substring(0, 2);
      if (gIndex.toString() === iCount.day_of_week.toString()) {
         if (parseInt(aIndex) <= parseInt(iEndTime)) {
            if (parseInt(sIndex) >= parseInt(iStartTime)) {
               temp = await congestionDecision(iCount.congestion_type);
            }
         } else {
            if (parseInt(sIndex) <= parseInt(iEndTime)) {
               temp = await congestionDecision(iCount.congestion_type);
            }
         }
      }
   }
   return temp;
}

const getOperationTimeEveryDay = async (sData, sIndex, aIndex) => {
   let temp = "none";
   for await (let iCount of sData) {
      const iStartTime = iCount.opening_time.substring(0, 2);
      const iEndTime = iCount.closing_time.substring(0, 2);
      if (parseInt(aIndex) <= parseInt(iEndTime)) {
         if (parseInt(sIndex) >= parseInt(iStartTime)) {
            temp = await congestionDecision(iCount.congestion_type);
         }
      } else {
         if (parseInt(sIndex) <= parseInt(iEndTime)) {
            temp = await congestionDecision(iCount.congestion_type);
         }
      }
   }

   return temp;
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


var RegisterController = {}


RegisterController.index = function (req, res) {
   res.status(200).json({ message: 'Welcome to the store area !' });
}

RegisterController.addCoperationCompany = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
      
   } else {
      let sResult = {
         resultMsg: "처리에 실패하였습니다.",
         resultCd: "9999",
      };
      let result = null;
      try {
         const storeId = req.body.store_id;
         const companyCode = req.body.sCompany;
         const salesId = req.body.salesId;

         const authenticateSalesUser = await checkAuthenticateSalesUser(salesId);
         if(authenticateSalesUser.result){
            if(parseInt(authenticateSalesUser.activated) > 0){
               if(parseInt(companyCode) < 1){
                  result = await User.deleteCoperationCompany(parseInt(storeId));
               } else {
                  const checkFirst = await User.checkdChangedCoperationCompany(parseInt(storeId));
                  if(checkFirst.length > 0){
                     result = await User.changedCoperationCompany(parseInt(storeId),parseInt(companyCode));
                  } else {
                     result = await User.addCoperationCompany(parseInt(storeId),parseInt(companyCode));
                  }
               }
               if(result !== null){
                  sResult.resultMsg = "정상적으로 처리되었습니다.";
                  sResult.resultCd = "0000";
               }
            }
         }

      } catch (error) {
         console.log("addCoperationCompany error",error);
      }

      res.status(200).json(sResult);
   }
}
RegisterController.storeStampList = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
      
   } else {
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
                  sCount += 1;
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
}

RegisterController.storeStampChangeState = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
      
   } else {
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
}

RegisterController.storeStampDelete = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
      
   } else {
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
}

RegisterController.storeStampEdit = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
      
   } else {

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
}

RegisterController.insertStamp = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));
      
   } else {
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
}

RegisterController.deleteCoupon = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));

   } else {
      let sResult = false;

      try {
         const storeId = req.body.store_id;
         const couponId = req.body.couponId;
         await Store.storeCouponDelete(parseInt(storeId),parseInt(couponId));
      } catch (error) {
         console.log("RegisterController deleteCoupon error",error);
      }
  
      res.status(200).json(sResult);
   }
}

RegisterController.bannerLogo = async (req, res) => {
   console.log("aaas");
   let sBucketName = "throo-store-product";
   let iStoreId = (req.headers['store-id'] != undefined ? req.headers['store-id'] : 0);

   //await createAwsS3Bucket(sBucketName);

   let oResult = {};
   await upload(req, res, async (error) => {
      if (error) {
         console.log("error", error);
         res.status(200).json(oResult);
      } else {
         let sFileLocation = process.cwd() + '/public/img/uploads/' + req.file.filename;
         let oUploadRes = await resizeImageAndUploadToS3(sBucketName, sFileLocation, req.file.filename, iStoreId, true);

         if (oUploadRes !== false) {
            oResult.file_name = oUploadRes.file_name;
            oResult.full_path = oUploadRes.full_path;
            oResult.url_path = oUploadRes.url_path;
            res.status(200).json(oResult);
         } else {
            res.status(200).json(oResult);
            return
         }

         /*
         sharp(process.cwd() + '/public/img/uploads/' + req.file.filename)
            .resize(1024)
            .jpeg({ quality: 80 })
            .toFile(process.cwd() + '/public/img/uploads/resized/' + req.file.filename + ".jpg", (err, info) => {
               if (err != null) {
                  console.log("resize img err", err);
                  res.status(200).json(oResult);
                  return
               }
               oResult.file_name = req.file.filename + ".jpg";
               oResult.full_path = '/ceo/public/img/uploads/resized/' + req.file.filename + ".jpg";
               oResult.url_path = 'https://api.ivid.kr/ceo/img/uploads/resized/' + req.file.filename + ".jpg";
               //oResult.url_path = 'https://api-stg.ivid.kr/ceo/img/uploads/resized/' + req.file.filename + ".jpg";
               res.status(200).json(oResult);
            })
            */
      }
   });
}

RegisterController.insertCoupon = async (req, res) => {
   const iUserId = req.user.user_id;
   if (iUserId === undefined) {
      res.json(createError({
         status: UNAUTHORIZED,
         message: 'Unauthorized',
         type: 'userid'
      }));

   } else {
      let sResult = {
         resultCd: "9999",
         resultMsg: "네트워크 에러입니다, 잠시 후 다시 시도바랍니다.",
      };
      let process = true;
      let name = "";
      let count_limit = 999999999;
      let partner_discount = 0;
      let requirement = 0;
      let maxLimit = null;
      let description = "";
      let result = null;

      try {
         const couponName = req.body.cNm;
         const couponCount = req.body.couponCount;
         const countType = req.body.countType;
         const couponAmount = req.body.cAmount;
         const limitAmount = req.body.limitAmount;
         const couponIsLimitAmount = req.body.sLimitAmount;
         const startDate = req.body.startDate;
         const endDate = req.body.endDate;
         const storeId = req.body.store_id;
         const couponDiscountType = req.body.couponDiscountType;
         const percentDiscount = req.body.percentDiscount;
         const maxLimitDiscount = req.body.maxLimitDiscount;
         
         if(couponName !== undefined && couponName !== null && couponName !== ""){
            name = couponName;
         } else {
            process = false;
            sResult.resultMsg = "쿠폰명을 입력해주세요";
         }

         if(countType !== undefined && countType !== null && countType !== "none"){
            if(couponCount !== undefined && couponCount !== null){
               count_limit = parseInt(couponCount) > 0 ? parseInt(couponCount) : 0;
            } else {
               sResult.resultMsg = "쿠폰수량을 입력해주세요";
               process = false;
            }
         }
         
         if(limitAmount !== undefined && limitAmount !== null && limitAmount === "min"){
            if(couponIsLimitAmount !== undefined && couponIsLimitAmount !== null){
               requirement = parseInt(couponIsLimitAmount) > 0 ? parseInt(couponIsLimitAmount) : 0;
            } else {
               process = false;
               sResult.resultMsg = "최소금액을 입력해주세요";
            }
         }
         
         if(couponDiscountType === "amount"){
            if(couponAmount !== undefined && couponAmount !== null){
               partner_discount = parseInt(couponAmount) > 0 ? parseInt(couponAmount) : 0;
            } else {
               process = false;
               sResult.resultMsg = "할인금액을 입력해주세요";
            }
         } else {
            if(percentDiscount !== undefined && percentDiscount !== null){
               partner_discount = parseInt(percentDiscount) > 0 ? parseInt(percentDiscount) : 0;
            } else {
               process = false;
               sResult.resultMsg = "할인 %을 입력해주세요";
            }
         }

         if(maxLimitDiscount !== undefined && maxLimitDiscount !== null && maxLimitDiscount !== ""){
            maxLimit = parseInt(maxLimitDiscount);
         }
         if(process){
            const sIpAddress = await getClientIP(req);
            description = req.body.description + ":" + storeId + ":" + ((sIpAddress !== undefined && sIpAddress !== null) ? sIpAddress.toString() : "getIPfail");
            if(couponDiscountType === "amount"){
               result = await Store.storeCouponAmountInsert(parseInt(storeId),partner_discount,partner_discount,requirement,count_limit,name,description,startDate,endDate);
            } else {
               result = await Store.storeCouponPercentInsert(parseInt(storeId),partner_discount,partner_discount,requirement,count_limit,name,description,startDate,endDate,maxLimit);
            }
            if(result !== undefined && result !== null){
               await Store.storeCouponConnect(parseInt(storeId),result[0]);
               sResult.resultCd = "0000";
            }
         }

      } catch (error) {
         console.log("RegisterController.insertCoupon fail !!! ===>", error);
      }

      res.status(200).json(sResult);
   }
}

RegisterController.proprietorshipV2 = async (req, res) => {
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

         const sQuery = {
            "b_no" : [sBusinessNm]
         }
         const tradersNm = await tradersAuthorize(sQuery);
         if(tradersNm){
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
            console.log("merchantNm", merchantNm);
            const result = await User.proprietorshipInsert(sLat, sLng, sAddress, sExtraAddress, storeName, merchantName, merchantNm, sPhoneNm, sEmail, bytes, sBank, storeId, sParam, isSales, isRenew, userId);
            if (result === "0000") {
               oResult.resultCd = "0000";
               oResult.resultMsg = "사업자등록이 완료되었습니다."
            }
         } else {
            oResult.resultCd = "1111";
            oResult.resultMsg = "국세청에 등록되어있지 않거나 올바르지 못한 사업자번호입니다";
         }
      }
   } catch (error) {
      console.log("RegisterController.proprietorship fail !!! ===>", error);
   }

   res.status(200).json(oResult);
}

RegisterController.proprietorship = async (req, res) => {
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

      if (storeId === undefined && storeId === null && storeId === "") {
         oResult.resultCd = "1111";
         oResult.resultMsg = "필수정보가 누락되었습니다.";
      } else if (storeName === undefined && storeName === null && storeName === "") {
         oResult.resultCd = "1111";
         oResult.resultMsg = "상호명이 누락되었습니다.";
      } else if (storeOwner === undefined && storeOwner === null && storeOwner === "") {
         oResult.resultCd = "1111";
         oResult.resultMsg = "대표자명이 누락되었습니다.";
      } else if (sBusinessNm === undefined && sBusinessNm === null && sBusinessNm === "") {
         oResult.resultCd = "1111";
         oResult.resultMsg = "사업자번호가 누락되었습니다.";
      } else if (sAddress === undefined && sAddress === null && sAddress === "") {
         oResult.resultCd = "1111";
         oResult.resultMsg = "주소가 누락되었습니다.";
      } else if (sPhoneNm === undefined && sPhoneNm === null && sPhoneNm === "") {
         oResult.resultCd = "1111";
         oResult.resultMsg = "전화번호가 누락되었습니다.";
      } else if (sEmail === undefined && sEmail === null && sEmail === "") {
         oResult.resultCd = "1111";
         oResult.resultMsg = "이메일정보가 누락되었습니다.";
      } else if (sAccountNm === undefined && sAccountNm === null && sAccountNm === "") {
         oResult.resultCd = "1111";
         oResult.resultMsg = "계좌번호가 누락되었습니다.";
      } else if (sBank === undefined && sBank === null && sBank === "") {
         oResult.resultCd = "1111";
         oResult.resultMsg = "은행명이 누락되었습니다.";
      } else {
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

         let bytes = CryptoJS.AES.encrypt(sAccountNm, config.keys.secret).toString();
         const result = await User.proprietorshipInsert(sLat, sLng, sAddress, sExtraAddress, storeName, merchantName, merchantNm, sPhoneNm, sEmail, bytes, sBank, storeId, sParam);
         if (result === "0000") {
            oResult.resultCd = "0000";
            oResult.resultMsg = "사업자등록이 완료되었습니다."
         }
      }
   } catch (error) {
      console.log("RegisterController.proprietorship fail !!! ===>", error);
   }

   res.status(200).json(oResult);
}

RegisterController.verifySmsV2 = async (req, res) => {
   let oResult = {
      resultCd: false,
      resultMsg: '인증번호를 잘못 입력하였습니다.'
   };

   try {
      const sEmail = req.body.userId;
      const userPhone = req.body.userPhone;
      const sCount = req.body.sCount;
      const sCode = req.body.smsToken;

      const result = await User.verifySmsCodeV2(userPhone, sCount, sCode, sEmail);
      if (result != undefined && result.length > 0) {
         let oData = result[0];
         if (oData.expired == true) {
            oResult.resultCd = false;
            oResult.resultMsg = '인증번호가 만료되었습니다.'
            res.json({
               success: false,
               message: '인증번호를 만료되었습니다.'
            })
         } else if (oData.verified == 1) {
            oResult.resultCd = false;
            oResult.resultMsg = '이미 사용된 인증번호입니다.'

         } else {
            await User.verifiedSmsCodeV2(userPhone, sCount, sCode, sEmail);
            oResult.resultCd = true;
            oResult.resultMsg = 'SMS 인증완료.'
         }
      } else {
         oResult.resultCd = false;
         oResult.resultMsg = '인증번호를 잘못 입력하였습니다.'
      }
   } catch (error) {
      console.log("RegisterController.verifySms fail !!! ===>", error);
   }

   res.status(200).json(oResult);

}

RegisterController.verifySms = async (req, res) => {
   let oResult = {
      resultCd: false,
      resultMsg: '인증번호를 잘못 입력하였습니다.'
   };

   try {
      const userPhone = req.body.userPhone;
      const sCount = req.body.sCount;
      const sCode = req.body.smsToken;

      const result = await User.verifySmsCode(userPhone, sCount, sCode);
      if (result != undefined && result.length > 0) {
         let oData = result[0];
         if (oData.expired == true) {
            oResult.resultCd = false;
            oResult.resultMsg = '인증번호가 만료되었습니다.'
            res.json({
               success: false,
               message: '인증번호를 만료되었습니다.'
            })
         } else if (oData.verified == 1) {
            oResult.resultCd = false;
            oResult.resultMsg = '이미 사용된 인증번호입니다.'

         } else {
            await User.verifiedSmsCode(userPhone, sCount, sCode);
            oResult.resultCd = true;
            oResult.resultMsg = 'SMS 인증완료.'
         }
      } else {
         oResult.resultCd = false;
         oResult.resultMsg = '인증번호를 잘못 입력하였습니다.'
      }
   } catch (error) {
      console.log("RegisterController.verifySms fail !!! ===>", error);
   }

   res.status(200).json(oResult);

}

RegisterController.sendSMS = async (req, res) => {
   let oResult = {
      resultCd: "9999",
      resultMsg: "SMS 전송에 실패하였습니다."
   };
   let processStatus = true;

   try {
      const userPhone = req.body.userPhone;
      const token = req.body.token;
      const ipAddress = getClientIP(req);

      if (userPhone !== undefined && userPhone !== null) {

         let bCheckSpam = await User.checkSpammingSms(userPhone);
         if (bCheckSpam != undefined && bCheckSpam.length > 0) {
            if (bCheckSpam[0].sent_count > 3) {
               processStatus = false;
               oResult.resultCd = "9999";
               oResult.resultMsg = "1시간에 최대 3번 시도가능합니다";
               res.status(200).json(oResult);
            }
         }

         if (processStatus) {
            let sRandomSmsCode = generatePassword(6, true);
            let sSmsHashCode = '';
            if (config.keys.smsreceiverhash != undefined) {
               sSmsHashCode = "\n" + config.keys.smsreceiverhash;
            }
            let sMsgContent = '[' + sRandomSmsCode + '] 스루입점계약을 위한 본인확인 인증번호입니다.' + sSmsHashCode;

            req.body = {};
            req.body = {
               sender: config.keys.aligosmssender,
               receiver: userPhone.toString(),
               msg: sMsgContent,
               msg_type: 'SMS'
            };

            aligoapi.send(req, oSmsAuthData).then(async (r) => {
               let oRes = r;
               if (oRes != undefined && oRes.result_code == 1) {
                  const insert = await User.createRandomSmsCode(userPhone, sRandomSmsCode, sMsgContent, token, ipAddress);
                  if (insert !== undefined && insert !== null) {
                     oResult.resultCd = "0000";
                     oResult.resultMsg = "메세지가 전송되었습니다";
                  }
               }
               res.status(200).json(oResult);
            }).catch((err) => {
               console.log("sms sender failled!!!!! err =>>>> ", err);
               res.status(200).json(oResult);
            })
         }
      }
   } catch (error) {
      console.log("RegisterController.sendSMS fail !!! ===>", error);
      res.status(200).json(oResult);
   }
}

RegisterController.sendSMSV2 = async (req, res) => {
   let oResult = {
      resultCd: "9999",
      resultMsg: "SMS 전송에 실패하였습니다."
   };
   let processStatus = true;

   try {
      const userPhone = req.body.userPhone;
      const sEmail = req.body.userId;
      const token = req.body.token;
      const ipAddress = getClientIP(req);

      if (userPhone !== undefined && userPhone !== null && sEmail !== undefined && sEmail !== null && token !== undefined && token !== null) {

         let bCheckSpam = await User.checkSpammingSmsV2(userPhone, sEmail);
         if (bCheckSpam != undefined && bCheckSpam.length > 0) {
            if (bCheckSpam[0].sent_count > 3) {
               processStatus = false;
               oResult.resultCd = "9999";
               oResult.resultMsg = "1시간에 최대 3번 시도가능합니다";
               res.status(200).json(oResult);
            }
         }

         if (processStatus) {
            let sRandomSmsCode = generatePassword(6, true);
            let sSmsHashCode = '';
            if (config.keys.smsreceiverhash != undefined) {
               sSmsHashCode = "\n" + config.keys.smsreceiverhash;
            }
            let sMsgContent = '[' + sRandomSmsCode + '] 스루입점계약을 위한 본인확인 인증번호입니다.' + sSmsHashCode;

            req.body = {};
            req.body = {
               sender: config.keys.aligosmssender,
               receiver: userPhone.toString(),
               msg: sMsgContent,
               msg_type: 'SMS'
            };

            aligoapi.send(req, oSmsAuthData).then(async (r) => {
               let oRes = r;
               if (oRes != undefined && oRes.result_code == 1) {
                  const insert = await User.createRandomSmsCodeV2(userPhone, sRandomSmsCode, sMsgContent, token, ipAddress, sEmail);
                  if (insert !== undefined && insert !== null) {
                     oResult.resultCd = "0000";
                     oResult.resultMsg = "메세지가 전송되었습니다";
                  }
               }
               res.status(200).json(oResult);
            }).catch((err) => {
               console.log("sms sender failled!!!!! err =>>>> ", err);
               res.status(200).json(oResult);
            })
         }
      } else {
         oResult.resultCd = "9999";
         oResult.resultMsg = "전화번호와 아이디를 입력해주세요.";
         res.status(200).json(oResult);
      }
   } catch (error) {
      console.log("RegisterController.sendSMS fail !!! ===>", error);
      res.status(200).json(oResult);
   }
}

RegisterController.sendFindIDSMSV2 = async (req, res) => {
   let oResult = {
      resultCd: "9999",
      resultMsg: "SMS 전송에 실패하였습니다."
   };
   let processStatus = true;

   try {
      const userPhone = req.body.userPhone;
      const sEmail = req.body.userId;
      const token = req.body.token;
      const ipAddress = getClientIP(req);

      if (userPhone !== undefined && userPhone !== null && sEmail !== undefined && sEmail !== null && token !== undefined && token !== null) {

         let bCheckSpam = await User.checkSpammingSmsV2(userPhone, sEmail);
         if (bCheckSpam != undefined && bCheckSpam.length > 0) {
            if (bCheckSpam[0].sent_count > 3) {
               processStatus = false;
               oResult.resultCd = "9999";
               oResult.resultMsg = "1시간에 최대 3번 시도가능합니다";
               res.status(200).json(oResult);
            }
         }

         if (processStatus) {
            let sRandomSmsCode = generatePassword(6, true);
            let sSmsHashCode = '';
            if (config.keys.smsreceiverhash != undefined) {
               sSmsHashCode = "\n" + config.keys.smsreceiverhash;
            }
            let sMsgContent = '[' + sRandomSmsCode + '] 스루계정정보를 찾기 위한 본인확인 인증번호입니다.' + sSmsHashCode;

            req.body = {};
            req.body = {
               sender: config.keys.aligosmssender,
               receiver: userPhone.toString(),
               msg: sMsgContent,
               msg_type: 'SMS'
            };

            aligoapi.send(req, oSmsAuthData).then(async (r) => {
               let oRes = r;
               if (oRes != undefined && oRes.result_code == 1) {
                  const insert = await User.createRandomSmsCodeV2(userPhone, sRandomSmsCode, sMsgContent, token, ipAddress, sEmail);
                  if (insert !== undefined && insert !== null) {
                     oResult.resultCd = "0000";
                     oResult.resultMsg = "메세지가 전송되었습니다";
                  }
               }
               res.status(200).json(oResult);
            }).catch((err) => {
               console.log("sms sender failled!!!!! err =>>>> ", err);
               res.status(200).json(oResult);
            })
         }
      } else {
         oResult.resultCd = "9999";
         oResult.resultMsg = "전화번호와 아이디를 입력해주세요.";
         res.status(200).json(oResult);
      }
   } catch (error) {
      console.log("RegisterController.sendSMS fail !!! ===>", error);
      res.status(200).json(oResult);
   }
}

RegisterController.editStoreOperation = async (req, res) => {
   let stringList = [];
   let iDayType = "day";
   let oResult = {
      resultCd: false,
      scheduleList: [],
   };

   try {
      const store_id = req.body.store_id;
      const sData = req.body.sData;
      for await (let dataLink of sData) {
         let tempDay = "일요일" + dataLink.opening_time + "~" + dataLink.closing_time;

         if (dataLink.day_of_week > 0 && dataLink.day_of_week < 2) {
            tempDay = "월요일" + dataLink.opening_time + "~" + dataLink.closing_time;
         } else if (dataLink.day_of_week > 1 && dataLink.day_of_week < 3) {
            tempDay = "화요일" + dataLink.opening_time + "~" + dataLink.closing_time;
         } else if (dataLink.day_of_week > 2 && dataLink.day_of_week < 4) {
            tempDay = "수요일" + dataLink.opening_time + "~" + dataLink.closing_time;
         } else if (dataLink.day_of_week > 3 && dataLink.day_of_week < 5) {
            tempDay = "목요일" + dataLink.opening_time + "~" + dataLink.closing_time;
         } else if (dataLink.day_of_week > 4 && dataLink.day_of_week < 6) {
            tempDay = "금요일" + dataLink.opening_time + "~" + dataLink.closing_time;
         } else if (dataLink.day_of_week > 5 && dataLink.day_of_week < 7) {
            tempDay = "토요일" + dataLink.opening_time + "~" + dataLink.closing_time;
         } else if (dataLink.day_of_week > 6 && dataLink.day_of_week < 8) {
            tempDay = "매일" + dataLink.opening_time + "~" + dataLink.closing_time;
         } else if (dataLink.day_of_week > 7 && dataLink.day_of_week < 9) {
            tempDay = "평일" + dataLink.opening_time + "~" + dataLink.closing_time;
         } else if (dataLink.day_of_week > 8 && dataLink.day_of_week < 10) {
            tempDay = "주말" + dataLink.opening_time + "~" + dataLink.closing_time;
         }

         stringList.push(tempDay);
      }
      stringList = await stringList.join("\n");

      const insertOperation = await Store.insertOperation(sData, store_id, stringList);
      if (insertOperation === "0000") {
         for await (let eCount of sData) {
            if (eCount.day_of_week > 6 && eCount.day_of_week < 8) {
               iDayType = await "everyday";
            } else if (eCount.day_of_week > 7 && eCount.day_of_week < 10) {
               iDayType = await "weekly";
            }
         }

         for await (let iCount of asyncGenerator(24)) {
            let tempResult = [];
            let temp = {};
            let tempOpen = "";
            let tempClose = "";

            temp.key = iCount;
            temp.value = [];

            if (iCount < 9) {
               tempOpen = "0" + iCount.toString();
               tempClose = "0" + (iCount + 1).toString();
            } else if (iCount > 8 && iCount < 10) {
               tempOpen = "0" + iCount.toString();
               tempClose = (iCount + 1).toString();
            } else {
               tempOpen = iCount.toString();
               tempClose = (iCount + 1).toString();
            }

            for await (let gCount of asyncGenerator(7)) {
               let getValue = null;
               let tempValue = {};

               if (iDayType === "day") {
                  getValue = await getOperationTime(sData, tempOpen, tempClose, gCount);
               } else if (iDayType === "everyday") {
                  getValue = await getOperationTimeEveryDay(sData, tempOpen, tempClose);
               } else {
                  let tempDayCount = 8;
                  if (gCount > 4 && gCount < 7) {
                     tempDayCount = 9;
                  }
                  getValue = await getOperationTime(sData, tempOpen, tempClose, tempDayCount);
               }

               tempValue.value = getValue;
               tempResult.push(tempValue);
            }

            if (iDayType !== "weekly") {
               temp.value = await changeArrayOrder(tempResult, 0, 6);
            } else {
               temp.value = tempResult;
            }

            oResult.scheduleList.push(temp);
            oResult.resultCd = true;
         }
      }
   } catch (error) {
      console.log("error", error);
   }

   res.status(200).json(oResult);
}

RegisterController.getStoreOperation = async (req, res) => {
   let sCount = 0;
   let iDayType = "day";
   let oResult = {
      resultCd: "unlocked",
      scheduleList: [],
      sData: [],
   };

   try {
      const store_id = req.params.store_id;
      const checkWebServiceYn = await checkStorePermissionYn(store_id);
      if (checkWebServiceYn) {
         const getList = await Store.getOperationTime(store_id);
         if (getList.length > 0) {
            oResult.resultCd = "locked";

            for await (let eCount of getList) {
               if (eCount.day_of_week > 6 && eCount.day_of_week < 8) {
                  iDayType = await "everyday";
               } else if (eCount.day_of_week > 7 && eCount.day_of_week < 10) {
                  iDayType = await "weekly";
               }
            }

            for await (let iCount of asyncGenerator(24)) {
               let tempResult = [];
               let temp = {};
               let tempOpen = "";
               let tempClose = "";

               temp.key = iCount;
               temp.value = [];

               if (iCount < 9) {
                  tempOpen = "0" + iCount.toString();
                  tempClose = "0" + (iCount + 1).toString();
               } else if (iCount > 8 && iCount < 10) {
                  tempOpen = "0" + iCount.toString();
                  tempClose = (iCount + 1).toString();
               } else {
                  tempOpen = iCount.toString();
                  tempClose = (iCount + 1).toString();
               }

               for await (let gCount of asyncGenerator(7)) {
                  let getValue = null;
                  let tempValue = {};

                  if (iDayType === "day") {
                     getValue = await getOperationTime(getList, tempOpen, tempClose, gCount);
                  } else if (iDayType === "everyday") {
                     getValue = await getOperationTimeEveryDay(getList, tempOpen, tempClose);
                  } else {
                     let tempDayCount = 8;
                     if (gCount > 4 && gCount < 7) {
                        tempDayCount = await 9;
                     }
                     getValue = await getOperationTime(getList, tempOpen, tempClose, tempDayCount);
                  }

                  tempValue.value = getValue;
                  tempResult.push(tempValue);
               }

               if (iDayType !== "weekly") {
                  temp.value = await changeArrayOrder(tempResult, 0, 6);
               } else {
                  temp.value = tempResult;
               }

               oResult.scheduleList.push(temp);
            }

            for await (let iCount of getList) {
               let temp = {};
               let tempDay = "일요일";
               let tempTime = "여유";

               if (iCount.day_of_week > 0 && iCount.day_of_week < 2) {
                  tempDay = "월요일";
               } else if (iCount.day_of_week > 1 && iCount.day_of_week < 3) {
                  tempDay = "화요일";
               } else if (iCount.day_of_week > 2 && iCount.day_of_week < 4) {
                  tempDay = "수요일";
               } else if (iCount.day_of_week > 3 && iCount.day_of_week < 5) {
                  tempDay = "목요일";
               } else if (iCount.day_of_week > 4 && iCount.day_of_week < 6) {
                  tempDay = "금요일";
               } else if (iCount.day_of_week > 5 && iCount.day_of_week < 7) {
                  tempDay = "토요일";
               } else if (iCount.day_of_week > 6 && iCount.day_of_week < 8) {
                  tempDay = "매일";
               } else if (iCount.day_of_week > 7 && iCount.day_of_week < 9) {
                  tempDay = "평일";
               } else if (iCount.day_of_week > 8 && iCount.day_of_week < 10) {
                  tempDay = "주말";
               }

               if (iCount.congestion_type > 0 && iCount.congestion_type < 2) {
                  tempTime = "보통";
               } else if (iCount.congestion_type > 1 && iCount.congestion_type < 3) {
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
      }
   } catch (error) {
      console.log("error", error);
   }

   res.status(200).json(oResult);
}

RegisterController.getStoreHoliday = async (req, res) => {
   let oResult = {
      resultCd: "unlocked",
      official: [],
      temporary: [],
      oKey: 0,
      tKey: 0,
   };
   let oCount = 0;
   let tCount = 0;

   try {
      const store_id = req.params.store_id;
      const checkWebServiceYn = await checkStorePermissionYn(store_id);
      if (checkWebServiceYn) {
         const result = await Store.getStoreHoliday(store_id);
         if (result.length > 0) {
            for await (const iterator of result) {
               let temp = {};
               if (iterator.type > 0 && iterator.type < 2) {
                  temp.key = tCount + 1;
                  temp.fromDate = iterator.holiday_from;
                  temp.toDate = iterator.holiday_to;

                  oResult.temporary.push(temp);

                  tCount += 1;

               } else {
                  temp.key = oCount + 1;
                  temp.sMethodValue = iterator.date_type;
                  temp.sDayValue = iterator.day_of_week;

                  oResult.official.push(temp);

                  oCount += 1;
               }
            }
         }

         if (oResult.official.length > 0 || oResult.temporary.length > 0) {
            oResult.resultCd = "locked";
            oResult.tKey = tCount;
            oResult.oKey = oCount;
         }
      }
   } catch (error) {
      console.log("error", error);
   }

   res.status(200).json(oResult);
}

RegisterController.editStoreHoliday = async (req, res) => {
   let oResult = false;

   try {
      let officialResult = true;
      let temperaryResult = true;

      const store_id = req.body.store_id;
      const iList = req.body.iList;
      const sList = req.body.sList;
      const checkWebServiceYn = await checkStorePermissionYn(store_id);
      if (checkWebServiceYn) {
         const insertOfficial = await Store.officialHoliday(iList, 0, store_id);
         if (insertOfficial !== "0000") {
            officialResult = false;
         }

         const insertTemperary = await Store.temperaryHoliday(sList, 1, store_id);
         if (insertTemperary !== "0000") {
            temperaryResult = false;
         }

         if (officialResult && temperaryResult) {
            oResult = true;
         }
      }

   } catch (error) {
      console.log("error", error);
   }

   res.status(200).json(oResult);
}

RegisterController.editStoreExtraInfo = async (req, res) => {
   let oResult = false;

   try {
      const store_id = req.body.store_id;
      const sContent = req.body.sContent;
      const sPhoneNm = req.body.sPhoneNm;
      let sNotiValue = req.body.sNotiValue;
      let parkingTime = req.body.parkingTime;

      const checkWebServiceYn = await checkStorePermissionYn(store_id);
      if (checkWebServiceYn) {
         if (typeof (sNotiValue) === 'string') {
            sNotiValue = await 100;
         }

         if (typeof (parkingTime) === 'string') {
            parkingTime = await 5;
         }

         const result = await Store.editStoreExtraInfo(store_id, sContent, sPhoneNm, sNotiValue, parkingTime);
         if (result != undefined) {
            oResult = true;
         }
      }
   } catch (error) {
      console.log("error", error);
   }

   res.status(200).json(oResult);
}

RegisterController.storeExtraInfo = async (req, res) => {
   let oResult = {
      resultCd: "unlocked",
      address: "",
      Nm: "",
      parkingTime: "5분",
      sNoti: "100m",
   };

   try {
      const store_id = req.params.store_id;
      const checkWebServiceYn = await checkStorePermissionYn(store_id);
      if (checkWebServiceYn) {
         const result = await Store.storeExtraInfo(store_id);
         if (result != undefined) {
            if (result[0].address1 != undefined && result[0].address1 != null && result[0].address1 != "") {
               oResult.address = await result[0].address1;
            }

            if (result[0].phone_number != undefined && result[0].phone_number != null && result[0].phone_number != "") {
               oResult.Nm = await result[0].phone_number;
            }

            if (result[0].parking_time != undefined && result[0].parking_time != null && result[0].parking_time != "") {
               oResult.parkingTime = await result[0].parking_time;
            }

            if (result[0].noti_nearby_distance != undefined && result[0].noti_nearby_distance != null && result[0].noti_nearby_distance > 0) {
               oResult.sNoti = await result[0].noti_nearby_distance;
            }

            if (oResult.address !== "" || oResult.Nm !== "") {
               oResult.resultCd = "locked";
            }
         }
      }
   } catch (error) {
      console.log("error", error);
   }

   res.status(200).json(oResult);
}

RegisterController.editStoreInfo = async (req, res) => {
   let oResult = false;
   let sPass = false;
   let sCount = 1;
   let getParamSubType = 0;

   try {
      const storeId = req.body.store_id;
      const sInfo = req.body.sInfo;
      const sNoti = req.body.sNoti;
      const sDetail = req.body.sDetail;
      const mainType = req.body.mainType;
      const subType = req.body.subType;

      const checkWebServiceYn = await checkStorePermissionYn(storeId);
      if (checkWebServiceYn) {
         const getParam = await Store.getParamType(mainType.toString());
         if (getParam != undefined && getParam != null) {
            if (subType !== "") {
               const subTypeName = await Store.getParamType(subType.toString());
               if (subTypeName != undefined && subTypeName != null) {
                  getParamSubType = await subTypeName.store_type_id;
                  sCount = await 2;
               }
            }

            const edit = await Store.editStoreType(storeId, sCount, getParam.store_type_id, getParamSubType);
            if (edit === "0000") {
               sPass = true;
            }

            if (sPass) {
               const result = await Store.editStoreInfo(storeId, sInfo, sNoti, sDetail, 0);
               if (result != undefined) {
                  oResult = true;
               }
            }
         }
      }
   } catch (error) {
      console.log("error", error);
   }

   res.status(200).json(oResult);
}

RegisterController.settingStoreDetail = async (req, res) => {
   let oResult = {
      resultCd: "unlocked",
      plainOptions: [],
      cafeOptions: [],
      shopOptions: [],
      setType: "",
      subTypeNm: "",
      sInfo: "",
      sNoti: "",
      sDetail: "",
   };
   let mNm = 0;
   let sNm = 0;

   try {
      const store_id = req.params.store_id;
      const checkWebServiceYn = await checkStorePermissionYn(store_id);
      if (checkWebServiceYn) {
         const storeDetail = await Store.getStoreText(store_id);
         if (storeDetail != undefined) {
            if (storeDetail[0].description != undefined && storeDetail[0].description != null && storeDetail[0].description != "") {
               oResult.sInfo = await storeDetail[0].description;
            }

            if (storeDetail[0].description_extra != undefined && storeDetail[0].description_extra != null && storeDetail[0].description_extra != "") {
               oResult.sDetail = await storeDetail[0].description_extra;
            }

            if (storeDetail[0].description_noti != undefined && storeDetail[0].description_noti != null && storeDetail[0].description_noti != "") {
               oResult.sNoti = await storeDetail[0].description_noti;
            }
         }

         const sType = await Store.getMainType(store_id);
         if (sType.length > 0) {
            for await (const gCount of sType) {
               if (gCount.is_main < 1) {
                  sNm = await gCount.store_type_id;

               } else if (gCount.is_main > 0 && gCount.is_main < 2) {
                  mNm = await gCount.store_type_id;
               }
            }
         }

         const getList = await Store.getStoreType();
         for await (const iterator of getList) {
            if (mNm > 0) {
               if (mNm.toString() === iterator.store_type_id.toString()) {
                  oResult.setType = iterator.name;
               }
            }

            if (sNm > 0) {
               if (sNm.toString() === iterator.store_type_id.toString()) {
                  oResult.subTypeNm = iterator.name;
               }
            }

            if (iterator.parent_store_type_id.toString() === "2") {
               oResult.plainOptions.push(iterator.name.toString());
            } else if (iterator.parent_store_type_id.toString() === "1") {
               oResult.cafeOptions.push(iterator.name.toString());
            } else if (iterator.parent_store_type_id.toString() === "8") {
               oResult.shopOptions.push(iterator.name.toString());
            }
         }

         if (oResult.setType !== "") {
            oResult.resultCd = "locked";
         }

      }
   } catch (error) {
      console.log("error", error);
   }

   res.status(200).json(oResult);
}

RegisterController.openingHoursDesc = async (req, res) => {
   let oResult = {};

   const store_id = req.params.store_id;
   const checkWebServiceYn = await checkStorePermissionYn(store_id);
   if (checkWebServiceYn) {
      const storeDesc = await Store.storeDesc(store_id);
      if (storeDesc != undefined && storeDesc != null) {
         oResult.result_cd = "0000";

         const storeOrderType = await Store.storeOrderType(store_id);
         if (storeOrderType != undefined && storeOrderType != null && storeOrderType.length > 0) {
            oResult.opening_time = storeOrderType[0].opening_time;
            oResult.closeing_time = storeOrderType[0].closing_time;

            if (storeOrderType[0].breaktime_from != null) {
               oResult.isBreakTime = true;
               oResult.breaktime_from = storeOrderType[0].breaktime_from;
               oResult.breaktime_to = storeOrderType[0].breaktime_to;
            } else {
               oResult.isBreakTime = false;
               oResult.breaktime_from = "00:00";
               oResult.breaktime_to = "00:00";
            }

            if (storeOrderType[0].all_time > 0) {
               oResult.allTime = false;
            } else {
               oResult.allTime = true;
            }

            const getOrderTimeCongestion = await Store.getOrderTimeCongestion(storeOrderType[0].store_time_id);
            if (parseInt(getOrderTimeCongestion[0].congestion_type) < 1) {
               oResult.orderTime = "easy";
            } else if (parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2) {
               oResult.orderTime = "normal";
            } else if (parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3) {
               oResult.orderTime = "busy";
            }

            const checkOptionBoth = await Store.checkOptionBoth(storeOrderType[0].store_time_id);
            if (checkOptionBoth.length > 0) {
               let sList = [];
               for await (let x of checkOptionBoth) {
                  let temp = {};
                  temp.from = x.time_from;
                  temp.to = x.time_to;
                  if (parseInt(x.congestion_type) < 1) {
                     temp.selectValue = "easy";
                  } else if (parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2) {
                     temp.selectValue = "normal";
                  } else if (parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3) {
                     temp.selectValue = "busy";
                  }
                  sList.push(temp);
               }
               oResult.congestionList = sList;
               oResult.congestion = true;
            } else {
               oResult.congestion = false;
            }
            oResult.date_type = "daily";

         } else {
            const weeklyOrderTimeList = await Store.weeklyOrderTimeList(store_id);
            if (weeklyOrderTimeList.length > 0) {
               let sList = [];
               for await (let i of weeklyOrderTimeList) {
                  if (parseInt(i.day_of_week) > 0 && parseInt(i.day_of_week) < 2) {
                     let operateList = {};
                     operateList.mOperatingList = {};
                     operateList.mOptionList = [];
                     operateList.mOperatingList.openTime = i.opening_time;
                     operateList.mOperatingList.closeTime = i.closing_time;

                     if (i.breaktime_from != null) {
                        operateList.mOperatingList.isBreakTime = true
                        operateList.mOperatingList.breakFrom = i.breaktime_from;
                        operateList.mOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.mOperatingList.isBreakTime = false
                        operateList.mOperatingList.breakFrom = "00:00";
                        operateList.mOperatingList.breakTo = "00:00";
                     }

                     if (i.all_time > 0) {
                        operateList.mOperatingList.allDay = false;
                     } else {
                        operateList.mOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if (parseInt(getOrderTimeCongestion[0].congestion_type) < 1) {
                        operateList.mOperatingList.orderTime = "easy";
                     } else if (parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2) {
                        operateList.mOperatingList.orderTime = "normal";
                     } else if (parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3) {
                        operateList.mOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if (checkOptionBoth.length > 0) {
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if (parseInt(x.congestion_type) < 1) {
                              temp.selectValue = "easy";
                           } else if (parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2) {
                              temp.selectValue = "normal";
                           } else if (parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3) {
                              temp.selectValue = "busy";
                           }
                           operateList.mOptionList.push(temp);
                        }
                        operateList.mOperatingList.isCongestion = true;

                     } else {
                        operateList.mOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if (i.day_of_week > 1 && i.day_of_week < 3) {
                     let operateList = {};
                     operateList.tOperatingList = {};
                     operateList.tOptionList = [];
                     operateList.tOperatingList.openTime = i.opening_time;
                     operateList.tOperatingList.closeTime = i.closing_time;

                     if (i.breaktime_from != null) {
                        operateList.tOperatingList.isBreakTime = true
                        operateList.tOperatingList.breakFrom = i.breaktime_from;
                        operateList.tOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.tOperatingList.isBreakTime = false
                        operateList.tOperatingList.breakFrom = "00:00";
                        operateList.tOperatingList.breakTo = "00:00";
                     }

                     if (i.all_time > 0) {
                        operateList.tOperatingList.allDay = false;
                     } else {
                        operateList.tOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if (parseInt(getOrderTimeCongestion[0].congestion_type) < 1) {
                        operateList.tOperatingList.orderTime = "easy";
                     } else if (parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2) {
                        operateList.tOperatingList.orderTime = "normal";
                     } else if (parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3) {
                        operateList.tOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if (checkOptionBoth.length > 0) {
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if (parseInt(x.congestion_type) < 1) {
                              temp.selectValue = "easy";
                           } else if (parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2) {
                              temp.selectValue = "normal";
                           } else if (parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3) {
                              temp.selectValue = "busy";
                           }
                           operateList.tOptionList.push(temp);
                        }
                        operateList.tOperatingList.isCongestion = true;

                     } else {
                        operateList.tOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if (i.day_of_week > 2 && i.day_of_week < 4) {
                     let operateList = {};
                     operateList.wOperatingList = {};
                     operateList.wOptionList = [];
                     operateList.wOperatingList.openTime = i.opening_time;
                     operateList.wOperatingList.closeTime = i.closing_time;

                     if (i.breaktime_from != null) {
                        operateList.wOperatingList.isBreakTime = true
                        operateList.wOperatingList.breakFrom = i.breaktime_from;
                        operateList.wOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.wOperatingList.isBreakTime = false
                        operateList.wOperatingList.breakFrom = "00:00";
                        operateList.wOperatingList.breakTo = "00:00";
                     }

                     if (i.all_time > 0) {
                        operateList.wOperatingList.allDay = false;
                     } else {
                        operateList.wOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if (parseInt(getOrderTimeCongestion[0].congestion_type) < 1) {
                        operateList.wOperatingList.orderTime = "easy";
                     } else if (parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2) {
                        operateList.wOperatingList.orderTime = "normal";
                     } else if (parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3) {
                        operateList.wOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if (checkOptionBoth.length > 0) {
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if (parseInt(x.congestion_type) < 1) {
                              temp.selectValue = "easy";
                           } else if (parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2) {
                              temp.selectValue = "normal";
                           } else if (parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3) {
                              temp.selectValue = "busy";
                           }
                           operateList.wOptionList.push(temp);
                        }
                        operateList.wOperatingList.isCongestion = true;

                     } else {
                        operateList.wOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if (i.day_of_week > 3 && i.day_of_week < 5) {
                     let operateList = {};
                     operateList.thOperatingList = {};
                     operateList.thOptionList = [];
                     operateList.thOperatingList.openTime = i.opening_time;
                     operateList.thOperatingList.closeTime = i.closing_time;

                     if (i.breaktime_from != null) {
                        operateList.thOperatingList.isBreakTime = true
                        operateList.thOperatingList.breakFrom = i.breaktime_from;
                        operateList.thOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.thOperatingList.isBreakTime = false
                        operateList.thOperatingList.breakFrom = "00:00";
                        operateList.thOperatingList.breakTo = "00:00";
                     }

                     if (i.all_time > 0) {
                        operateList.thOperatingList.allDay = false;
                     } else {
                        operateList.thOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if (parseInt(getOrderTimeCongestion[0].congestion_type) < 1) {
                        operateList.thOperatingList.orderTime = "easy";
                     } else if (parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2) {
                        operateList.thOperatingList.orderTime = "normal";
                     } else if (parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3) {
                        operateList.thOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if (checkOptionBoth.length > 0) {
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if (parseInt(x.congestion_type) < 1) {
                              temp.selectValue = "easy";
                           } else if (parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2) {
                              temp.selectValue = "normal";
                           } else if (parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3) {
                              temp.selectValue = "busy";
                           }
                           operateList.thOptionList.push(temp);
                        }
                        operateList.thOperatingList.isCongestion = true;

                     } else {
                        operateList.thOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if (i.day_of_week > 4 && i.day_of_week < 6) {
                     let operateList = {};
                     operateList.fOperatingList = {};
                     operateList.fOptionList = [];
                     operateList.fOperatingList.openTime = i.opening_time;
                     operateList.fOperatingList.closeTime = i.closing_time;

                     if (i.breaktime_from != null) {
                        operateList.fOperatingList.isBreakTime = true
                        operateList.fOperatingList.breakFrom = i.breaktime_from;
                        operateList.fOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.fOperatingList.isBreakTime = false
                        operateList.fOperatingList.breakFrom = "00:00";
                        operateList.fOperatingList.breakTo = "00:00";
                     }

                     if (i.all_time > 0) {
                        operateList.fOperatingList.allDay = false;
                     } else {
                        operateList.fOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if (parseInt(getOrderTimeCongestion[0].congestion_type) < 1) {
                        operateList.fOperatingList.orderTime = "easy";
                     } else if (parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2) {
                        operateList.fOperatingList.orderTime = "normal";
                     } else if (parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3) {
                        operateList.fOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if (checkOptionBoth.length > 0) {
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if (parseInt(x.congestion_type) < 1) {
                              temp.selectValue = "easy";
                           } else if (parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2) {
                              temp.selectValue = "normal";
                           } else if (parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3) {
                              temp.selectValue = "busy";
                           }
                           operateList.fOptionList.push(temp);
                        }
                        operateList.fOperatingList.isCongestion = true;

                     } else {
                        operateList.fOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if (i.day_of_week > 5 && i.day_of_week < 7) {
                     let operateList = {};
                     operateList.sOperatingList = {};
                     operateList.sOptionList = [];
                     operateList.sOperatingList.openTime = i.opening_time;
                     operateList.sOperatingList.closeTime = i.closing_time;

                     if (i.breaktime_from != null) {
                        operateList.sOperatingList.isBreakTime = true
                        operateList.sOperatingList.breakFrom = i.breaktime_from;
                        operateList.sOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.sOperatingList.isBreakTime = false
                        operateList.sOperatingList.breakFrom = "00:00";
                        operateList.sOperatingList.breakTo = "00:00";
                     }

                     if (i.all_time > 0) {
                        operateList.sOperatingList.allDay = false;
                     } else {
                        operateList.sOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if (parseInt(getOrderTimeCongestion[0].congestion_type) < 1) {
                        operateList.sOperatingList.orderTime = "easy";
                     } else if (parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2) {
                        operateList.sOperatingList.orderTime = "normal";
                     } else if (parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3) {
                        operateList.sOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if (checkOptionBoth.length > 0) {
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if (parseInt(x.congestion_type) < 1) {
                              temp.selectValue = "easy";
                           } else if (parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2) {
                              temp.selectValue = "normal";
                           } else if (parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3) {
                              temp.selectValue = "busy";
                           }
                           operateList.sOptionList.push(temp);
                        }
                        operateList.sOperatingList.isCongestion = true;

                     } else {
                        operateList.sOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);

                  } else if (i.day_of_week < 1) {
                     let operateList = {};
                     operateList.suOperatingList = {};
                     operateList.suOptionList = [];
                     operateList.suOperatingList.openTime = i.opening_time;
                     operateList.suOperatingList.closeTime = i.closing_time;

                     if (i.breaktime_from != null) {
                        operateList.suOperatingList.isBreakTime = true
                        operateList.suOperatingList.breakFrom = i.breaktime_from;
                        operateList.suOperatingList.breakTo = i.breaktime_to;
                     } else {
                        operateList.suOperatingList.isBreakTime = false
                        operateList.suOperatingList.breakFrom = "00:00";
                        operateList.suOperatingList.breakTo = "00:00";
                     }

                     if (i.all_time > 0) {
                        operateList.suOperatingList.allDay = false;
                     } else {
                        operateList.suOperatingList.allDay = true;
                     }

                     const getOrderTimeCongestion = await Store.getOrderTimeCongestion(i.store_time_id);
                     if (parseInt(getOrderTimeCongestion[0].congestion_type) < 1) {
                        operateList.suOperatingList.orderTime = "easy";
                     } else if (parseInt(getOrderTimeCongestion[0].congestion_type) > 0 && parseInt(getOrderTimeCongestion[0].congestion_type) < 2) {
                        operateList.suOperatingList.orderTime = "normal";
                     } else if (parseInt(getOrderTimeCongestion[0].congestion_type) > 1 && parseInt(getOrderTimeCongestion[0].congestion_type) < 3) {
                        operateList.suOperatingList.orderTime = "busy";
                     }

                     const checkOptionBoth = await Store.checkOptionBoth(i.store_time_id);
                     if (checkOptionBoth.length > 0) {
                        for await (let x of checkOptionBoth) {
                           let temp = {};
                           temp.from = x.time_from;
                           temp.to = x.time_to;
                           if (parseInt(x.congestion_type) < 1) {
                              temp.selectValue = "easy";
                           } else if (parseInt(x.congestion_type) > 0 && parseInt(x.congestion_type) < 2) {
                              temp.selectValue = "normal";
                           } else if (parseInt(x.congestion_type) > 1 && parseInt(x.congestion_type) < 3) {
                              temp.selectValue = "busy";
                           }
                           operateList.suOptionList.push(temp);
                        }
                        operateList.suOperatingList.isCongestion = true;

                     } else {
                        operateList.suOperatingList.isCongestion = false;
                     }
                     sList.push(operateList);
                  }
               }
               oResult.date_type = "weekly";
               oResult.totalList = sList;
            } else {
               oResult.date_type = "none";
            }
         }
      } else {
         oResult.result_cd = "9999";
      }
   }

   res.status(200).json(oResult);

}

RegisterController.orderTimeDesc = async (req, res) => {
   let oResult = {};

   const store_id = req.params.store_id;
   const checkWebServiceYn = await checkStorePermissionYn(store_id);
   if (checkWebServiceYn) {
      const storeDesc = await Store.storeDesc(store_id);
      if (storeDesc != undefined && storeDesc != null) {
         oResult.result_cd = "0000";
         oResult.sEasy = "1";
         oResult.sNormal = "25";
         oResult.sBusy = "40";

         const storeOrderTime = await Store.storeOrderTime(store_id);
         for await (let i of storeOrderTime) {
            if (parseInt(i.congestion_type) < 1) {
               oResult.sEasy = i.minute;
            } else if (0 < parseInt(i.congestion_type) && parseInt(i.congestion_type) < 2) {
               oResult.sNormal = i.minute;
            } else if (1 < parseInt(i.congestion_type) && parseInt(i.congestion_type) < 3) {
               oResult.sBusy = i.minute;
            }
         }
      } else {
         oResult.result_cd = "9999";
      }
   }

   res.status(200).json(oResult);
}

RegisterController.pickUpZoneDesc = async (req, res) => {
   let oResult = {
      resultCd: "unlocked",
      sLat: 37.566611,
      sLng: 126.978441,
      sParkingImg: "",
   };

   try {
      const store_id = req.params.store_id;
      const checkWebServiceYn = await checkStorePermissionYn(store_id);
      if (checkWebServiceYn) {
         const storeDesc = await Store.storeDesc(store_id);
         if (storeDesc != undefined && storeDesc != null) {

            if (storeDesc[0].lat != undefined && storeDesc[0].lat != null && storeDesc[0].lat > 0) {
               oResult.sLat = await storeDesc[0].lat;
            }

            if (storeDesc[0].lng != undefined && storeDesc[0].lng != null && storeDesc[0].lng > 0) {
               oResult.sLng = await storeDesc[0].lng;
            }

            if (storeDesc[0].parking_image != undefined && storeDesc[0].parking_image != null && storeDesc[0].parking_image != "") {
               oResult.sParkingImg = await storeDesc[0].parking_image;
               oResult.resultCd = "locked";
            }
         }
      }
   } catch (error) {
      console.log(error);
   }

   res.status(200).json(oResult);
}

RegisterController.getStoreImage = async (req, res) => {
   let oResult = {
      resultCd: "unlocked",
      url_path_logo: "",
      url_path_first: "",
      url_path_second: "",
      url_path_third: "",
   };

   try {
      const store_id = req.params.store_id;
      const checkWebServiceYn = await checkStorePermissionYn(store_id);
      if (checkWebServiceYn) {
         const storeDesc = await Store.storeMediaImage(store_id);
         if (storeDesc.length > 0) {
            for await (let gData of storeDesc) {
               if (oResult.url_path_logo === "") {
                  oResult.url_path_logo = gData.url_path;
               } else if (oResult.url_path_first === "") {
                  oResult.url_path_first = gData.url_path;
               } else if (oResult.url_path_second === "") {
                  oResult.url_path_second = gData.url_path;
               } else if (oResult.url_path_third === "") {
                  oResult.url_path_third = gData.url_path;
               }
            }
            if ((oResult.url_path_logo !== "")) {
               oResult.resultCd = "locked";
            }
         }
      }
   } catch (error) {
      console.log("error", error);
   }

   res.status(200).json(oResult);
}

RegisterController.storeInfoDesc = async (req, res) => {
   let oResult = {};

   const store_id = req.params.store_id;
   const checkWebServiceYn = await checkStorePermissionYn(store_id);
   if (checkWebServiceYn) {
      const storeDesc = await Store.storeDesc(store_id);
      if (storeDesc != undefined && storeDesc != null) {
         oResult.result_cd = "0000";
         oResult.url_path_logo = "";
         oResult.url_path_store = "";
         oResult.description = storeDesc[0].description;
         oResult.description_extra = storeDesc[0].description_extra;
         oResult.description_noti = storeDesc[0].description_noti;

         if (storeDesc[0].url_path != undefined && storeDesc[0].url_path != null) {
            oResult.url_path_logo = storeDesc[0].url_path;
         }
         if (storeDesc[1].url_path != undefined && storeDesc[1].url_path != null) {
            oResult.url_path_store = storeDesc[1].url_path;
         }

      } else {
         oResult.result_cd = "9999";
      }
   }

   res.status(200).json(oResult);
}

RegisterController.filesLogo = async (req, res) => {
   let sBucketName = "throo-store-product";
   let iStoreId = (req.headers['store-id'] != undefined ? req.headers['store-id'] : 0);

   let oResult = {};
   await upload(req, res, async (error) => {
      if (error) {
         console.log("error", error);
         res.status(200).json(oResult);
      } else {
         let sFileLocation = process.cwd() + '/public/img/uploads/' + req.file.filename;
         let oUploadRes = await resizeImageAndUploadToS3(sBucketName, sFileLocation, req.file.filename, iStoreId, false);
         console.log("sFileLocation", sFileLocation);
         console.log("oUploadRes", oUploadRes);

         if (oUploadRes !== false) {
            oResult.file_name = oUploadRes.file_name;
            oResult.full_path = oUploadRes.full_path;
            oResult.url_path = oUploadRes.url_path;
            res.status(200).json(oResult);
         } else {
            res.status(200).json(oResult);
            return
         }
      }
   });
}

RegisterController.uploadAIFiles = async (req, res) => {
   let sBucketName = "throo-ceo-upload";
   let iStoreId = (req.headers['store-id'] != undefined ? req.headers['store-id'] : 0);

   //await createAwsS3Bucket(sBucketName);

   //res.status(200).json({});
   //return;

   let oResult = {};
   await aiFilesUpload(req, res, async (error) => {
      if (error) {
         console.log("error", error);
         res.status(200).json(oResult);
      } else {

         let sFileLocation = process.cwd() + '/public/uploads/' + req.file.filename;
         let oUploadRes = await fileUploadToS3(sBucketName, sFileLocation, req.file.filename, iStoreId, "application/postscript");

         console.log('oUploadRes', oUploadRes);

         if (oUploadRes !== false) {
            oResult.file_type = "application/postscript";
            oResult.file_name = oUploadRes.file_name;
            oResult.full_path = oUploadRes.full_path;
            oResult.url_path = oUploadRes.url_path;
            res.status(200).json(oResult);
         } else {
            console.log("upload error err", err);
            res.status(200).json(oResult);
            return
         }

         /*
         oResult.file_type = "application/postscript";
         oResult.file_name = req.file.filename;
         oResult.full_path = '/ceo/public/uploads/' + req.file.filename;
         oResult.url_path = 'https://api.ivid.kr/ceo/uploads/' + req.file.filename;
         res.status(200).json(oResult);
         */
      }
   });
}

RegisterController.uploadPDFFiles = async (req, res) => {
   let sBucketName = "throo-ceo-upload";
   let iStoreId = (req.headers['store-id'] != undefined ? req.headers['store-id'] : 0);

   //await createAwsS3Bucket(sBucketName);

   //res.status(200).json({});
   //return;

   let oResult = {};
   await pdfFilesUpload(req, res, async (error) => {
      if (error) {
         console.log("error", error);
         res.status(200).json(oResult);
      } else {

         let sFileLocation = process.cwd() + '/public/uploads/' + req.file.filename;
         let oUploadRes = await fileUploadToS3(sBucketName, sFileLocation, req.file.filename, iStoreId, "application/pdf");
         console.log('oUploadRes', oUploadRes);

         if (oUploadRes !== false) {
            oResult.file_type = "application/pdf";
            oResult.file_name = oUploadRes.file_name;
            oResult.full_path = oUploadRes.full_path;
            oResult.url_path = oUploadRes.url_path;
            res.status(200).json(oResult);
         } else {
            console.log("upload error err", err);
            res.status(200).json(oResult);
            return
         }

         /*
         oResult.file_type = "application/pdf";
         oResult.file_name = req.file.filename;
         oResult.full_path = '/ceo/public/uploads/' + req.file.filename;
         oResult.url_path = 'https://api.ivid.kr/ceo/uploads/' + req.file.filename;
         res.status(200).json(oResult);
         */
      }
   });
}


RegisterController.findId = async (req, res) => {
   let sResult = true;
   const store_id = req.params.sIndex;

   try {
      if (store_id != undefined && store_id != null && store_id != "") {
         const result = await User.findById(store_id);
         if (result != undefined && result != null) {
            if (result[0].count < 1) {
               sResult = false;
            }
         }
      }
   } catch (error) {
      console.log("RegisterController.findId fail !!! ===>", error);
   }
   res.status(200).json(sResult);
}


RegisterController.registerImage = async (req, res) => {
   const storeId = req.body.store_id;
   const logoImg = req.body.logoImg;
   const firstImg = req.body.firstImg;
   const secondImg = req.body.secondImg;
   const thirdImg = req.body.thirdImg;

   let sResult = false;

   try {
      const checkWebServiceYn = await checkStorePermissionYn(storeId);
      if (checkWebServiceYn) {
         const getMediaId = await Store.getMediaId(storeId);
         const result = await Store.imagesContentUpdate(getMediaId[0].media_id, getMediaId[1].media_id, getMediaId[2].media_id, getMediaId[3].media_id, logoImg, firstImg, secondImg, thirdImg);
         if (result === "0000") {
            sResult = true;
         }
      }
   } catch (error) {
      console.log(error);
   }
   res.status(200).json(sResult);

}

RegisterController.orderTime = async (req, res) => {
   let sResult = false;

   const storeId = req.body.store_id;
   const checkWebServiceYn = await checkStorePermissionYn(storeId);
   if (checkWebServiceYn) {
      let otFirst = req.body.sEasy;
      let otMiddle = req.body.sNormal;
      let otLast = req.body.sBusy;

      const result = await Store.orderTimeUpdate(otFirst, otMiddle, otLast, "", storeId);
      if (result === "0000") {
         sResult = true;
      }
   }

   res.status(200).json(sResult);

}


RegisterController.operatingTime = async (req, res) => {
   const type = req.body.type;
   const store_id = req.body.store_id;

   let sResult = false;

   const checkWebServiceYn = await checkStorePermissionYn(store_id);
   if (checkWebServiceYn) {
      if (type === "daily") {
         const operatingList = req.body.operatingList;
         const option = req.body.option;

         const openTime = operatingList.openTime;
         const closeTime = operatingList.closeTime;
         const orderTime = operatingList.orderTime;
         const isBreakTime = operatingList.isBreakTime;
         const isAlltime = operatingList.allDay;

         let breakFrom = null;
         let breakTo = null;

         let c_type;
         let sData = "none";

         if (orderTime === "easy") {
            c_type = 0
         } else if (orderTime === "normal") {
            c_type = 1
         } else {
            c_type = 2
         }

         if (isBreakTime) {
            breakFrom = operatingList.breakFrom
            breakTo = operatingList.breakTo
         }

         if (option === "width") {
            sData = req.body.dataSource;
         }
         let alltime = 1;
         if (isAlltime) {
            alltime = 0;
         }

         const result = await Store.storeTimeBusiness(store_id, openTime, closeTime, breakFrom, breakTo, 7, 1, c_type, sData, alltime);
         if (result === "0000") {
            sResult = true;
         }
      } else {
         const operating = req.body.sList;
         const result = await Store.storeTimeWeeklyBusiness(store_id, operating);
         if (result === "0000") {
            sResult = true;
         }
      }
   }

   res.status(200).json(sResult);

}

RegisterController.pickUpZone = async (req, res) => {
   const storeId = req.body.store_id;
   const parkingImg = req.body.parkingUpload;
   const userLat = req.body.userLat;
   const userLng = req.body.userLng;

   let sResult = false;

   try {
      const checkWebServiceYn = await checkStorePermissionYn(storeId);
      if (checkWebServiceYn) {
         const result = await Store.parkingDetailUpdate(storeId, parkingImg, userLat, userLng);
         if (result != undefined) {
            sResult = true;
         }
      }
   } catch (error) {
      console.log("error", error);
   }

   res.status(200).json(sResult);
}

RegisterController.insertCategory = async (req, res) => {
   const storeId = req.body.store_id;
   const storeNm = req.body.storeName;
   const sContent = req.body.sContent;

   let menuId = req.body.menuId;
   let isMain = req.body.isMain;
   let isUse = req.body.isUse;
   let process = true;
   let oResult = {
      resultCd: "9999",
      resultMsg: "네트워크에러입니다 잠시 후 다시 시도바랍니다"
   };

   const checkWebServiceYn = await checkStorePermissionYn(storeId);
   if (checkWebServiceYn) {
      try {
         if (menuId === "none") {
            let sName = storeNm + "메뉴";
            const insert = await Store.insertMenuId(sName, storeId);
            if (insert[0] != undefined) {
               menuId = insert[0];
            } else {
               process = false;
            }
         }

         if (isMain === "yes") {
            isMain = 1;
         } else {
            isMain = 0;
         }
         if (isUse === "unused") {
            isUse = 0;
         } else {
            isUse = 1;
         }

         let sCount = await Store.categoryListLength(menuId);
         if (sCount != undefined && sCount != null) {
            if (sCount[0].count != null) {
               sCount = parseInt(sCount[0].count) + 1;
            } else {
               sCount = 0;
            }
         } else {
            process = false;
         }

         let checkTitle = await Store.checkCategoryTitle(menuId, sContent);
         if (checkTitle != undefined && checkTitle != null) {
            if (checkTitle[0].count > 0) {
               process = false;
               oResult.resultCd = "8888";
               oResult.resultMsg = "같은 이름의 카테고리가 존재합니다";
            }
         } else {
            process = false;
         }

         if (process) {
            const insertCategory = await Store.insertCategory(menuId, sContent, isMain, isUse, sCount);
            if (insertCategory[0] != undefined) {
               oResult.resultCd = "0000";
               oResult.resultMsg = "등록되었습니다";
            }
         }
      } catch (error) {
         console.log("error", error);
      }
   }

   res.status(200).json(oResult);

}

RegisterController.deleteCategory = async (req, res) => {
   const categoryId = req.body.category_id;
   const storeId = req.body.storeId;

   let oResult = false;

   const checkWebServiceYn = await checkStorePermissionYn(storeId);
   if (checkWebServiceYn) {
      try {
         const result = await Store.deleteCategory(categoryId);
         if (result != undefined) {
            oResult = true;
         }
      } catch (error) {
         console.log("error", error);
      }
   }
   res.status(200).json(oResult);
}

RegisterController.editCategoryList = async (req, res) => {
   const sContent = req.body.sContent;
   const menuId = req.body.menuId;
   const storeId = req.body.storeId;

   let isMain = req.body.isMain;
   let isUse = req.body.isUse;

   let oResult = false;
   const checkWebServiceYn = await checkStorePermissionYn(storeId);
   if (checkWebServiceYn) {
      try {
         if (isMain === "yes") {
            isMain = 1;
         } else {
            isMain = 0;
         }
         if (isUse === "unused") {
            isUse = 0;
         } else {
            isUse = 1;
         }

         const result = await Store.editcategory(sContent, menuId, isMain, isUse);
         if (result != undefined) {
            oResult = true;
         }
      } catch (error) {
         console.log("error", error);
      }
   }
   res.status(200).json(oResult);

}

RegisterController.changeIndexCategory = async (req, res) => {
   const sList = req.body.sIndex;
   const storeId = req.body.store_id;

   let oResult = {
      resultCd: "9999",
      resultMsg: "네트워크에러입니다 잠시 후 다시 시도바랍니다"
   };

   const checkWebServiceYn = await checkStorePermissionYn(storeId);
   if (checkWebServiceYn) {
      try {
         if (sList.length > 1) {
            const result = await Store.categorySwitch(sList);
            if (result === "0000") {
               oResult.resultCd = "0000";
               oResult.resultMsg = "변경되었습니다";
            }
         } else {
            oResult.resultCd = "8888";
         }
      } catch (error) {
         console.log("error", error);
      }
   }

   res.status(200).json(oResult);
}

RegisterController.insertOption = async (req, res) => {
   const sData = req.body.sData;
   const store_id = req.body.store_id;
   const type = req.body.type;

   let isProcess = true;
   let count = 0;
   let sGroupTitle = req.body.sGroupTitle;
   let oResult = {
      resultCd: "9999",
      resultMsg: "네트워크에러입니다 잠시 후 다시 시도바랍니다"
   };

   const checkWebServiceYn = await checkStorePermissionYn(store_id);
   if (checkWebServiceYn) {
      try {
         if (sData.length > 0) {
            if (req.body.maxCount != undefined) {
               count = parseInt(req.body.maxCount);
            }
            if (sData.length < count) {
               isProcess = false;
               oResult.resultCd = "7777";
               oResult.resultMsg = "최대 선택가능 횟수가 입력된 옵션보다 큽니다";
            }

            if (isProcess) {
               const makeOption = await Store.makeOption(store_id, sGroupTitle, type, count, sData);
               if (makeOption === "0000") {
                  oResult.resultCd = "0000";
                  oResult.resultMsg = "등록되었습니다";
               }
            }
         } else {
            oResult.resultCd = "8888";
            oResult.resultMsg = "옵션리스트를 작성해주세요";
         }
      } catch (error) {
         console.log("error", error);
      }
   }

   res.status(200).json(oResult);
}


RegisterController.registerMenu = async (req, res) => {
   const sFileList = req.body.sFileList;
   const sTitle = req.body.sTitle;
   const sCategory = req.body.sCategory;
   const iPrice = req.body.iPrice;
   const options = req.body.options;
   const optionYn = req.body.optionYn;
   const sDesc = req.body.sDesc;
   const store_id = req.body.store_id;

   let oResult = {
      resultCd: "9999",
      resultMsg: "네트워크에러입니다 잠시 후 다시 시도바랍니다"
   };

   const checkWebServiceYn = await checkStorePermissionYn(store_id);
   if (checkWebServiceYn) {
      try {
         if (sTitle === "") {
            oResult.resultCd = "1111";
            oResult.resultMsg = "메뉴명을 입력하세요"

         } else if (parseInt(iPrice) == null) {
            oResult.resultCd = "2222";
            oResult.resultMsg = "가격을 입력하세요";

         } else if (sCategory == null || sCategory == undefined) {
            oResult.resultCd = "3333";
            oResult.resultMsg = "카테고리를 선택하세요";

         } else {
            let process = true;
            let sCount = await Store.productListLength(sCategory);
            if (sCount != undefined && sCount != null) {
               if (sCount[0].count != null) {
                  sCount = parseInt(sCount[0].count) + 1;
               } else {
                  sCount = 0;
               }
            } else {
               process = false;
            }

            if (process) {
               const insertMenu = await Store.insertMenu(store_id, sTitle, sDesc, iPrice, sCount, sFileList, sCategory, optionYn, options);
               if (insertMenu === "0000") {
                  oResult.resultCd = "0000";
                  oResult.resultMsg = "정상적으로 처리되었습니다";
               }
            }
         }
      } catch (error) {
         console.log("error", error);
      }
   }

   res.status(200).json(oResult);

}

RegisterController.editMenu = async (req, res) => {
   const sFileList = req.body.sFileList;
   const sTitle = req.body.sTitle;
   const sCategory = req.body.sCategory;
   const iPrice = req.body.iPrice;
   const options = req.body.options;
   const optionYn = req.body.optionYn;
   const sDesc = req.body.sDesc;
   const productId = req.body.product_id;
   const mediaId = req.body.media_id;
   const preOptionList = req.body.pre_option_list;
   const store_id = req.body.store_id;

   let isUse = req.body.is_use;
   let oResult = {
      resultCd: "9999",
      resultMsg: "네트워크에러입니다 잠시 후 다시 시도바랍니다"
   };

   const checkWebServiceYn = await checkStorePermissionYn(store_id);
   if (checkWebServiceYn) {
      try {
         if (isUse === "use") {
            isUse = 1;
         } else {
            isUse = 0;
         }

         const editMenu = await Store.editMenu(mediaId, productId, sFileList, sTitle, sDesc, iPrice, isUse, sCategory, preOptionList, optionYn, options);
         if (editMenu === "0000") {
            oResult.resultCd = "0000";
            oResult.resultMsg = "정상적으로 처리되었습니다";
         }

      } catch (error) {

      }
   }
   res.status(200).json(oResult);
}


RegisterController.changeIndexMenu = async (req, res) => {
   const sList = req.body.sIndex;
   const store_id = req.body.store_id;

   let oResult = {
      resultCd: "9999",
      resultMsg: "네트워크에러입니다 잠시 후 다시 시도바랍니다"
   };

   const checkWebServiceYn = await checkStorePermissionYn(store_id);
   if (checkWebServiceYn) {
      try {
         if (sList.length > 1) {
            const result = await Store.menuSwitch(sList);
            if (result === "0000") {
               oResult.resultCd = "0000";
               oResult.resultMsg = "변경되었습니다";
            }
         } else {
            oResult.resultCd = "8888";
         }
      } catch (error) {
         console.log("error", error);
      }
   }

   res.status(200).json(oResult);

}


RegisterController.editOption = async (req, res) => {
   const sData = req.body.sData;
   const optionId = req.body.option_id;
   const store_id = req.body.store_id;

   let isProcess = true;
   let count = 0;
   let productList = [];
   let optionIdList = [];
   let xAction = false;
   let sGroupTitle = req.body.sGroupTitle;
   let oResult = {
      resultCd: "9999",
      resultMsg: "네트워크에러입니다 잠시 후 다시 시도바랍니다"
   };

   const checkWebServiceYn = await checkStorePermissionYn(store_id);
   if (checkWebServiceYn) {
      try {
         if (sData.length > 0) {
            if (req.body.maxCount != undefined) {
               count = parseInt(req.body.maxCount);
            }
            if (sData.length < count) {
               isProcess = false;
               oResult.resultCd = "7777";
               oResult.resultMsg = "최대 선택가능 횟수가 입력된 옵션보다 큽니다";
            }

            const checkUp = await Store.checkHaveProduct(optionId);
            if (checkUp.length > 0) {
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

            if (isProcess) {
               const editOption = await Store.editOption(sGroupTitle, optionId, count, sData, optionIdList, productList, xAction);
               if (editOption === "0000") {
                  oResult.resultCd = "0000";
                  oResult.resultMsg = "수정되었습니다";
               }
            }
         } else {
            oResult.resultCd = "8888";
            oResult.resultMsg = "옵션리스트를 작성해주세요";
         }
      } catch (error) {
         console.log("error", error);
      }
   }

   res.status(200).json(oResult);
}


RegisterController.deleteMenu = async (req, res) => {
   const menuId = req.body.menu_id;
   const store_id = req.body.store_id;

   let oResult = false;

   const checkWebServiceYn = await checkStorePermissionYn(store_id);
   if (checkWebServiceYn) {
      try {
         const result = await Store.deleteMenu(menuId);
         if (result != undefined) {
            oResult = true;
         }
      } catch (error) {
         console.log("error", error);
      }
   }
   res.status(200).json(oResult);
}

RegisterController.deleteOption = async (req, res) => {
   const oData = req.body.sIndex;
   const store_id = req.body.store_id;

   let oResult = false;
   let xAction = false;
   const checkWebServiceYn = await checkStorePermissionYn(store_id);
   if (checkWebServiceYn) {
      try {
         const checkUp = await Store.checkHaveProduct(oData.id);
         if (checkUp.length > 0) {
            xAction = true;
         }

         const result = await Store.deleteOption(oData.id, xAction);
         if (result === "0000") {
            oResult = true;
         }
      } catch (error) {
         console.log("error", error);
      }
   }

   res.status(200).json(oResult);

}


RegisterController.categoryList = async (req, res) => {
   const store_id = req.params.store_id;

   let sResult = [];
   let noList = "none";
   let sLimit = false;
   let limitMain = 1;
   try {
      const checkCategory = await Store.checkCategory(store_id);
      if (checkCategory[0].menu_id != undefined && checkCategory[0].menu_id != null) {
         noList = parseInt(checkCategory[0].menu_id);
         const result = await Store.getCategoryList(noList);
         if (result.length > 0) {
            let count = 1;
            for await (let i of result) {
               let temp = {};
               temp.key = count;
               temp.name = i.name;
               temp.index = i.id_order;
               temp.id = i.category_id;
               temp.useYn = "미사용";
               temp.isMain = "아니오";
               if (i.status > 0) {
                  temp.useYn = "사용중";
               }
               if (i.is_main > 0) {
                  temp.isMain = "예";
                  limitMain++;
               }
               count++;

               sResult.push(temp);
            }
         }
      }
      if (limitMain > 1) {
         sLimit = true;
      }
   } catch (error) {
      console.log("error", error);
   }
   res.status(200).json({ sResult, noList, sLimit });
}

RegisterController.optionList = async (req, res) => {
   const store_id = req.params.store_id;

   let sResult = [];
   try {
      const result = await Store.getoptionList(store_id);
      if (result.length > 0) {
         let count = 1;
         for await (let i of result) {
            let temp = {};
            temp.key = count;
            temp.name = i.name;
            temp.count = i.input_max;
            temp.id = i.option_type_id;
            if (i.input_type === "radio") {
               temp.type = "선택영역";
            } else {
               temp.type = "체크박스";
            }

            count++;

            sResult.push(temp);
         }
      }
   } catch (error) {
      console.log("error", error);
   }
   res.status(200).json(sResult);
}

RegisterController.detailOptionRow = async (req, res) => {
   const optionId = req.params.option_id;

   let oResult = {
      resultCd: "9999",
      resultMsg: "네트워크에러입니다 잠시 후 다시 시도바랍니다"
   };
   let sResult = [];
   let result = {}
   try {
      if (optionId != undefined) {
         const getOptionList = await Store.getOptionList(optionId);
         if (getOptionList.length > 0) {
            let count = 1;
            for await (let i of getOptionList) {
               let temp = {};
               temp.key = count;
               temp.name = i.optionName;
               temp.price = parseFloat(i.price);

               count++;

               sResult.push(temp);
            }

            result.sGroupTitle = getOptionList[0].groupTitle;
            if (getOptionList[0].maxCount > 0) {
               result.maxCount = parseInt(getOptionList[0].maxCount);
            } else {
               result.maxCount = 0;
            }
            result.list = sResult;

            oResult.resultCd = "0000";
            oResult.resultData = result;
         }

      }
   } catch (error) {
      console.log("error", error);
   }

   res.status(200).json(oResult);
}

RegisterController.detailMenuList = async (req, res) => {
   const store_id = req.params.store_id;

   let sResult = [];
   let aResult = [];
   let noList = "none";

   try {
      const checkCategory = await Store.checkCategory(store_id);
      if (checkCategory[0].menu_id != undefined && checkCategory[0].menu_id != null) {
         noList = parseInt(checkCategory[0].menu_id);
         const getCategoryList = await Store.getCategoryList(noList);
         if (getCategoryList.length > 0) {
            let count = 1;
            for await (let i of getCategoryList) {
               let temp = {};
               temp.key = count;
               temp.name = i.name;
               temp.id = i.category_id;
               if (i.is_deleted < 1) {
                  sResult.push(temp);
               }
               count++;
            }
         }
      }

      const getoptionList = await Store.getoptionList(store_id);
      if (getoptionList.length > 0) {
         let count = 1;
         for await (let i of getoptionList) {
            let temp = {};
            temp.key = count;
            temp.name = i.name;
            temp.id = i.option_type_id;
            if (i.status > 0) {
               aResult.push(temp);
            }
            count++;

         }
      }

   } catch (error) {
      console.log("error", error);
   }
   res.status(200).json({ sResult, aResult });
}


RegisterController.menuList = async (req, res) => {
   const category_id = req.params.category_id;

   let sResult = [];
   try {
      const getMenuList = await Store.getMenuList(category_id);
      if (getMenuList.length > 0) {
         let count = 1;
         for await (let i of getMenuList) {
            let temp = {};
            temp.key = count;
            temp.name = i.name;
            temp.id = i.product_id;
            temp.categoryId = category_id;

            if (i.is_soldout > 0) {
               temp.soldOut = "일시품절";
            } else {
               temp.soldOut = "주문가능";
            }
            sResult.push(temp);
            count++;
         }
      }
   } catch (error) {
      console.log("error", error);
   }
   res.status(200).json(sResult);

}


RegisterController.getMenuDetail = async (req, res) => {
   const menu_id = req.params.menu_id;

   let oResult = {};
   let option = [];
   let optionIds = [];
   try {
      const getMenuDetail = await Store.getMenuDetail(parseInt(menu_id));
      if (getMenuDetail != undefined && getMenuDetail != null) {
         const optionList = await Store.getOptionListByMenuId(parseInt(menu_id));
         if (optionList != undefined && optionList != null && optionList.length > 0) {
            oResult.optionYn = true;
            for await (let i of optionList) {
               optionIds.push(i.option_type_id);
               option.push(i.name.toString());
            }
         } else {
            oResult.optionYn = false;
         }

         if (getMenuDetail[0].url_path == null || getMenuDetail[0].url_path === "") {
            oResult.url_path = "";
         } else {
            oResult.url_path = getMenuDetail[0].url_path;
         }

         if (getMenuDetail[0].is_soldout > 0) {
            oResult.soldOut = "일시품절";
            oResult.status = "use";
         } else {
            oResult.soldOut = "주문가능";
            oResult.status = "unused";
         }

         oResult.option_name = option.join(',');
         oResult.option_nameList = option;
         oResult.optionIdList = optionIds;
         oResult.productId = getMenuDetail[0].product_id;
         oResult.categoryId = getMenuDetail[0].category_id;
         oResult.category_name = getMenuDetail[0].category_name;
         oResult.product_name = getMenuDetail[0].product_name;
         oResult.base_price = Math.floor(parseFloat(getMenuDetail[0].base_price));
         oResult.description = getMenuDetail[0].description;
         oResult.mediaId = getMenuDetail[0].product_media_id;
      }
   } catch (error) {
      console.log("error", error);
   }
   res.status(200).json(oResult);

}

const createAwsS3Bucket = async (sBucketName) => {

   const checkBucketExists = async (sBucket) => {
      const s3 = new oAWS.S3();
      const options = {
         Bucket: sBucket,
      };
      try {
         await s3.headBucket(options).promise();
         return true;
      } catch (error) {
         console.log('error', error);
         if (error.statusCode === 404) {
            return false;
         }
         throw error;
      }
   };

   let sEnv = 'dev-';
   if (config.environment === 'production') {
      sEnv = 'prd-';
   }
   sBucketName = sEnv + sBucketName;

   let bExist = await checkBucketExists(sBucketName);

   if (bExist === false) {

      const oS3 = new oAWS.S3({
         accessKeyId: config.keys.awsBucketId,
         secretAccessKey: config.keys.awsBucketSecret
      });

      const oParams = {
         Bucket: sBucketName,
         CreateBucketConfiguration: {
            LocationConstraint: "ap-northeast-2"
         }
      };

      oS3.createBucket(oParams, function (err, data) {
         if (err) console.log(err, err.stack);
         else console.log('Bucket Created Successfully', data);
      });
   }
}

const resizeImageAndUploadToS3 = async (sBucketName, sFileLocation, sFileName, iStoreId, bUploadOnly) => {

   const padString = (n, width, z) => {
      z = z || '0';
      n = n + '';
      return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
   }

   let sEnv = 'dev-';
   if (config.environment === 'production') {
      sEnv = 'prd-';
   }
   sBucketName = sEnv + sBucketName;

   const oImage = sharp(sFileLocation);
   let sFileN = sFileName.replace(/\.[^/.]+$/, "").toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
   let sKey = 'store-id-' + padString(iStoreId, 7) + '/' + sFileN;

   const oS3 = new oAWS.S3({
      accessKeyId: config.keys.awsBucketId,
      secretAccessKey: config.keys.awsBucketSecret
   });

   let oUploadRes = {};

   return new Promise( async (resolve, reject) => {
      if(bUploadOnly != undefined && bUploadOnly){
         const fileContent = await fs.readFileSync(sFileLocation);
         console.log("bUploadOnly",bUploadOnly);
         sFileN = sFileName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
         sKey = 'store-id-' + padString(iStoreId, 7) + '/' + sFileN;

         await oS3.upload({
            Bucket: sBucketName,
            Key: sKey,
            ACL: 'public-read',
            ContentType: 'image/jpg',
            ContentLength: oImage.length,
            ContentDisposition: '',
            Body: fileContent
         }, (err, oResult) => {
            if (err === null) {
               oUploadRes.file_name = sFileN;
               oUploadRes.full_path = oResult.key;
               oUploadRes.url_path = oResult.Location;
            } else {
               oUploadRes = false;
            }

            resolve(oUploadRes);
            return;
         })
         return;
      } else {
         oImage.metadata().then(function (metadata) {
            let sImageType = metadata.format;
            return oImage
               .rotate()
               .resize({ width: 500, height: null, withoutEnlargement: true, quality: 80 })
               .toFormat('jpeg')
               .toBuffer();
         }).then(async function (data) {
            let sExtension = '-500.jpg';
            await oS3.putObject({
               Bucket: sBucketName,
               Key: sKey + sExtension,
               ACL: 'public-read',
               ContentType: 'image/jpg',
               ContentLength: data.length,
               ContentDisposition: '',
               Body: data
            }, (err, oResult) => {
            });
         }).catch(function (error) {
            console.log('error 1', error);
         });
   
         oImage.metadata().then(function (metadata) {
            let sImageType = metadata.format;
            return oImage
               .rotate()
               .resize({ width: 300, height: null, withoutEnlargement: true, quality: 80 })
               .toFormat('jpeg')
               .toBuffer();
         }).then(async function (data) {
            let sExtension = '-300.jpg';
            await oS3.putObject({
               Bucket: sBucketName,
               Key: sKey + sExtension,
               ACL: 'public-read',
               ContentType: 'image/jpg',
               ContentLength: data.length,
               ContentDisposition: '',
               Body: data
            }, (err, oResult) => {
            });
         }).catch(function (error) {
            console.log('error 2', error);
         });
   
         oImage.metadata().then(function (metadata) {
            let sImageType = metadata.format;
            return oImage
               .rotate()
               .resize({ width: 150, height: null, withoutEnlargement: true, quality: 80 })
               .toFormat('jpeg')
               .toBuffer();
         }).then(async function (data) {
            let sExtension = '-150.jpg';
            await oS3.putObject({
               Bucket: sBucketName,
               Key: sKey + sExtension,
               ACL: 'public-read',
               ContentType: 'image/jpg',
               ContentLength: data.length,
               ContentDisposition: '',
               Body: data
            }, (err, oResult) => {
            });
         }).catch(function (error) {
            console.log('error 3', error);
         });
   
         oImage.metadata().then(function (metadata) {
            let sImageType = metadata.format;
            return oImage
               .rotate()
               .resize({ width: 1024, height: null, withoutEnlargement: true, quality: 80 })
               .toFormat('jpeg')
               .toBuffer();
         }).then(async function (data) {
            let sExtension = '-1024.jpg';
   
            await oS3.upload({
               Bucket: sBucketName,
               Key: sKey + sExtension,
               ACL: 'public-read',
               ContentType: 'image/jpg',
               ContentLength: data.length,
               ContentDisposition: '',
               Body: data
            }, (err, oResult) => {
               if (err === null) {
                  oUploadRes.file_name = sFileN + sExtension;
                  oUploadRes.full_path = oResult.key;
                  oUploadRes.url_path = oResult.Location;
               } else {
                  oUploadRes = false;
               }
   
               resolve(oUploadRes);
            });
   
         }).catch(function (error) {
            console.log('error', error);
         });
      }
   })

}

const fileUploadToS3 = async (sBucketName, sFileLocation, sFileName, iStoreId, sMimeType) => {

   const padString = (n, width, z) => {
      z = z || '0';
      n = n + '';
      return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
   }

   let sEnv = 'dev-';
   if (config.environment === 'production') {
      sEnv = 'prd-';
   }
   sBucketName = sEnv + sBucketName;

   const sFileN = sFileName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
   let sKey = 'store-id-' + padString(iStoreId, 7) + '/' + sFileN;

   const oS3 = new oAWS.S3({
      accessKeyId: config.keys.awsBucketId,
      secretAccessKey: config.keys.awsBucketSecret
   });

   let oUploadRes = {};
   const fileContent = await fs.readFileSync(sFileLocation);

   return new Promise((resolve, reject) => {
      oS3.upload({
         Bucket: sBucketName,
         Key: sKey,
         ACL: 'public-read',
         ContentType: sMimeType,
         Body: fileContent
      }, (err, oResult) => {
         if (err === null) {
            oUploadRes.file_name = sFileN;
            oUploadRes.full_path = oResult.key;
            oUploadRes.url_path = oResult.Location;
         } else {
            oUploadRes = false;
         }

         resolve(oUploadRes);
      });
   });
}

module.exports = RegisterController;
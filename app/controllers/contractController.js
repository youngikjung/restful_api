'use strict';

var jwt = require('jsonwebtoken');
var config = require('../config');

const Store = require('../models/store');
const User = require('../models/user');
const Order = require('../models/order');

const CryptoJS = require('crypto-js');
const crypto = require("crypto");
const axios = require('axios').default;
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

var oValidate = require("validate.js");

const { async } = require('validate.js');

const encrypt = ((val) => {
   let cipher = crypto.createCipheriv('aes-256-cbc'.toString(), config.keys.passSecretKey, config.keys.passIV);
   let encrypted = cipher.update(val, 'utf8', 'base64');
   encrypted += cipher.final('base64');
   return encrypted;
});

const passAuthorizedResult = async (reqTxId,certTxId,sPhoneNm,sUserNm) => {
   let oResult = {};

   const phoneNo = await encrypt(sPhoneNm);
   const userNm = await encrypt(sUserNm);

   const formBody = {
      companyCd: '00081', 
      reqTxId,
      certTxId,
      phoneNo,
      userNm,
   }

   try {
      let sUrl = config.keys.passAccessUrl; 
      let sToken = config.keys.passAccessToken;

      const pass = await axios({
         url: sUrl + `/certification/result`,
         method: "post",
         timeout: (15 * 1000),
         headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'Authorization' : 'Bearer ' + sToken,
         },
         data: formBody,
         transformResponse: [ (data) => {
            return data;
         }],
      });
      const parsing = await JSON.parse(pass.data);
      if(parsing.resultTycd === "1"){
         oResult.resultCd = "0000";
         oResult.resultMsg = "인증이 완료되었습니다";
         oResult.reqTxId = parsing.reqTxId;
         oResult.telcoTxId = parsing.telcoTxId;
         oResult.certTxId = parsing.certTxId;
         oResult.digitalSign = parsing.digitalSign;
         oResult.resultDttm = parsing.resultDttm;
         oResult.telcoTycd = parsing.telcoTycd;
         
      } else if (parsing.resultTycd === "2"){
         oResult.resultCd = "1111";
         oResult.resultMsg = "인증 대기중입니다 인증 완료 후 다음 버튼을 눌러주세요";
      } else if (parsing.resultTycd === "3"){
         oResult.resultCd = "1122";
         oResult.resultMsg = "서명검증에 실패하였습니다.";
      } else if (parsing.resultTycd === "4"){
         oResult.resultCd = "1133";
         oResult.resultMsg = "인증요청을 거절 또는 취소하였습니다";
      } else {
         oResult.resultCd = "1144";
         oResult.resultMsg = "인증요청이 만료되었습니다";
      }

   } catch (error) {
      const err = JSON.parse(error.response.data);
      if(err.errorCd != undefined && err.errorCd != null){
         if(6100 < err.errorCd < 6102){
            oResult.resultCd = "3101";
            oResult.resultMsg = "입력하신 값이 누락되었습니다 다시 확인해주세요.";

         } else if (6101 < err.errorCd < 6103){
            oResult.resultCd = "3102";
            oResult.resultMsg = "정확하지 않은 정보입니다 입력하신 정보를 다시 확인해주세요.";

         } else if (6102 < err.errorCd < 6104){
            oResult.resultCd = "3103";
            oResult.resultMsg = err.errorMessage;
            
         } else {
            oResult.resultCd = "9999";
            oResult.resultMsg = "일시적인 오류가 발생했습니다. 잠시 후 다시 요청해 주세요.";
         }
      } else {
         oResult.resultCd = "9999";
         oResult.resultMsg = "일시적인 오류가 발생했습니다. 잠시 후 다시 요청해 주세요.";
      }
   }

   return oResult; 
}

const passAuthorized = async (sPhoneNm,sUserNm,stringList,sTele) => {
   let oResult = {};
   
   if(sPhoneNm == undefined || sPhoneNm == null || sPhoneNm === ""){
      oResult.resultCd = "1111";
      oResult.resultMsg = "전화번호를 입력해주세요";
   } else if (sUserNm == undefined || sUserNm == null || sUserNm === "") {
      oResult.resultCd = "1112";
      oResult.resultMsg = "이름을 입력해주세요";
   } else if (sTele == undefined || sTele == null || sTele === "") {
      oResult.resultCd = "1116";
      oResult.resultMsg = "통신사를 선택해주세요";
   } else {
      const pdfUrl = 'https://api.ivid.kr/ceo/contractForm/' + stringList;
      const phoneNo = await encrypt(sPhoneNm);
      const userNm = await encrypt(sUserNm);
      const signTarget = await encrypt(pdfUrl);
      const transactionId = 'CTR' + getCurrentDatetime('nodivider');

      const formBody = {
         companyCd: '00081', 
         serviceTycd: 'S1001',
         telcoTycd: sTele,
         phoneNo,
         userNm,
         reqTitle: "스루 서비스 계약서 인증",
         reqContent: `회사 스루, 파트너 ${sUserNm}의 계약 체결 증빙을 요청합니다`, 
         reqCSPhoneNo: '1670-5324', 
         reqEndDttm: moment().add(5, "minutes").format("YYYY-MM-DD HH:mm:ss"),
         signTargetTycd: '3',
         originalInfo: {
            originalTycd: "CT",
            originalURL: pdfUrl,
            originalFormatCd: "2",
         },
         signTarget,
         reqTxId: transactionId,
      }

      try {
         let sUrl = config.keys.passAccessUrl; 
         let sToken = config.keys.passAccessToken;

         const pass = await axios({
            url: sUrl + `/v1/certification/notice`,
            method: "post",
            timeout: (15 * 1000),
            headers: {
               'Content-Type': 'application/json;charset=UTF-8',
               'Authorization' : 'Bearer ' + sToken,
            },
            data: formBody,
            transformResponse: [ (data) => {
               return data;
            }],
         });
         const parsing = await JSON.parse(pass.data);
         oResult.resultCd = "0000";
         oResult.reqTxId = parsing.reqTxId;
         oResult.certTxId = parsing.certTxId;
   
      } catch (error) {
         const err = JSON.parse(error.response.data);
         console.log("err",err);
         if(err.errorCd != undefined && err.errorCd != null){
            if(3100 < err.errorCd && err.errorCd < 3102){
               oResult.resultCd = "3101";
               oResult.resultMsg = "입력하신 값이 누락되었습니다 다시 확인해주세요.";

            } else if (3101 < err.errorCd && err.errorCd < 3103){
               oResult.resultCd = "3102";
               oResult.resultMsg = "정확하지 않은 정보입니다 입력하신 정보를 다시 확인해주세요.";

            } else if (3102 < err.errorCd && err.errorCd < 3104){
               oResult.resultCd = "3103";
               oResult.resultMsg = err.errorMessage;

            } else if (3103 < err.errorCd && err.errorCd < 3105){
               oResult.resultCd = "3104";
               oResult.resultMsg = err.errorMessage;

            } else if (3104 < err.errorCd && err.errorCd < 3106){
               oResult.resultCd = "3105";
               oResult.resultMsg = err.errorMessage;

            } else if (3105 < err.errorCd && err.errorCd < 3107){
               oResult.resultCd = "3106";
               oResult.resultMsg = err.errorMessage;

            } else if (3106 < err.errorCd && err.errorCd < 3108){
               oResult.resultCd = "3107";
               oResult.resultMsg = err.errorMessage;
               
            } else {
               oResult.resultCd = "9999";
               oResult.resultMsg = "일시적인 오류가 발생했습니다. 잠시 후 다시 요청해 주세요.";
            }
         } else {
            oResult.resultCd = "9999";
            oResult.resultMsg = "일시적인 오류가 발생했습니다. 잠시 후 다시 요청해 주세요.";
         }
      }
   }

   return oResult; 
}

// The admin controller.
var ContractController = {}

ContractController.index = function (req, res) {
   res.status(200).json({ message: 'Welcome to the store area !' });
}

ContractController.contract = async (req, res) => {
   const teleType = req.body.sTelecom;
   const sTitle = req.body.sTitle;
   const firstNm = req.body.firstNm;
   const phoneNm = req.body.phoneNm;
   const sCompany = req.body.sCompany;
   
   let oResult = {};
   let phone = firstNm + phoneNm;
   let sTele = "L";
   if(teleType === "SKT"){
      sTele = "S";
   } else if (teleType === "KT") {
      sTele = "K";
   }

   const result = await passAuthorized(phone,sTitle,sCompany,sTele);
   if(result.resultCd === "0000"){
      oResult.resultCd = "0000";
      oResult.reqTxId = result.reqTxId;
      oResult.certTxId = result.certTxId;
   } else {
      oResult.resultCd = "1111";
      oResult.resultMsg = result.resultMsg;
   }

   res.status(200).json(oResult);

}

ContractController.passNoticeResult = async (req, res) => {
   const reqTxId = req.body.reqTxId;
   const certTxId = req.body.certTxId;
   const firstNm = req.body.firstNm;
   const phoneNm = req.body.phoneNm;
   const sTitle = req.body.sTitle;
   const sCompany = req.body.sCompany;

   let phone = firstNm + phoneNm;
   let sReqTxId = "null";
   let sTelcoTxId = "null";
   let sCertTxId = "null";
   let sDigitalSign = "null";
   let sResultDttm = "null";
   let sTelcoTycd = "null";

   let oResult = {};

   const result = await passAuthorizedResult(reqTxId,certTxId,phone,sTitle);
   if(result.resultCd === "0000"){

      if(result.reqTxId != undefined && result.reqTxId != null){
         sReqTxId = result.reqTxId;
      }
      if(result.telcoTxId != undefined && result.telcoTxId != null){
         sTelcoTxId = result.telcoTxId;
      }
      if(result.certTxId != undefined && result.certTxId != null){
         sCertTxId = result.certTxId;
      }
      if(result.digitalSign != undefined && result.digitalSign != null){
         sDigitalSign = result.digitalSign;
      }
      if(result.resultDttm != undefined && result.resultDttm != null){
         sResultDttm = result.resultDttm;
      }
      if(result.telcoTycd != undefined && result.telcoTycd != null){
         sTelcoTycd = result.telcoTycd;
      }

      const insert = await User.insertPassAuthorize(sReqTxId,sTelcoTxId,sCertTxId,sDigitalSign,sResultDttm,sTelcoTycd,sTitle,phone,sCompany);  
      if(insert != undefined){
         oResult.resultCd = "0000";
         oResult.resultId = insert[0];
      } else {
         oResult.resultCd = "2222";
         oResult.resultMsg = "네트워크 에러입니다 잠시 후 다시 시도바랍니다";
      } 
   } else {
      oResult.resultCd = result.resultCd;
      oResult.resultMsg = result.resultMsg;
   }

   res.status(200).json(oResult);

}




module.exports = ContractController;


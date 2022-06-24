'use strict';

var jwt = require('jsonwebtoken');
var config = require('../config');

const axios = require("axios");
const ipLocation = require("iplocation");

const Home = require('../models/home');
const Store = require('../models/store');
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

const {
   sendEmail,
   inquireToEmail
} = require('../helpers/emailSender');

const helpers = require('../helpers/imageHelper');

const {
   convertToKRW,
   padString,
   groupArrayByKey
} = require('../helpers/stringHelper');

var oValidate = require("validate.js");
const { async } = require('validate.js');

const getConvert = (sText, iText) => {
   let temp;
   if(sText != undefined){
      if(sText != null){
         temp = sText;
      } else {
         temp = iText;
      }
   } else {
      temp = iText;
   }

   return temp;
}



// The admin controller.
var HomeController = {}

HomeController.index = function (req, res) {
   res.status(200).json({ message: 'Welcome to the store area !' });
}

HomeController.getThrooArticle = async (req, res) => {
   let oResult = [];
   
   try {
      const oResponse = await Home.getThrooArticle();
      if(oResponse !== undefined && oResponse !== null && oResponse.length > 0){
         for await (const iterator of oResponse) {
            let temp = {};
            temp.title = iterator.title;
            temp.date = moment(iterator.created_at).format("YYYY-MM");
            temp.subTitle = iterator.thumbnail;
            temp.article = iterator.thumbnail_url;
            oResult.push(temp);
         }
      }

   } catch (error) {
      console.log("error",error);
   }

   res.status(200).json(oResult);
}

HomeController.checkInfo = async (req, res) => {
   const isMobile = req.body.isMobile;
   const osName = req.body.osName;
   const currentPath = req.body.currentPath;
   const token = req.body.token;
   let sType = "homepage";
   
   try {
      let ipAddress = req.headers;
      ipAddress = ipAddress['x-forwarded-for'];
      
      if(req.body.typeField !== undefined && req.body.typeField !== null && req.body.typeField !== ""){
         sType = req.body.typeField
      }
      
      await Home.keepInfomationHomepage(sType, token, isMobile, osName, currentPath, ipAddress);

   } catch (error) {
      console.log("error",error);
   }
}

HomeController.writingToInquire = async (req, res) => {
   const storeName = req.body.storeName;
   const sPhoneNm = req.body.sPhoneNm;
   const sEmail = req.body.sEmail;
   const sText = req.body.sText;

   let oResult = false;
   try {
      const sTitle = storeName.toString() + "에서 입점문의가 들어왔습니다";
      const resultSendEmail = await inquireToEmail(storeName,sTitle,sPhoneNm,sText);
      if(resultSendEmail){
         const insert = await Home.homeInquire(sEmail,storeName,sPhoneNm,sTitle,sText);
         if(insert != undefined){
            oResult = true;
         }
      }
   } catch (error) {
      console.log("error",error);
   }
   res.status(200).json(oResult);
}

HomeController.contentData = async (req, res) => {
   let oResult = {
      resultCd : "9999",
      list : {},
   };

   try {
      const sParam = req.params.sParam;
      const sList = await Home.contentData(sParam);
      console.log("sList",sList);
      if(sList != undefined && sList != null){
         oResult.resultCd = "0000";
         oResult.list = sList;
      }

   } catch (error) {
      console.log("error",error);
   }
   
   res.status(200).json(oResult);
}

HomeController.contentList = async (req, res) => {
   let oResult = {
      resultCd : "9999",
      resultData : [],
      contentData : [],
   };

   try {
      const nList = await Home.noticeList(3);
      if(nList.length > 0){
         oResult.resultCd = "0000";
         oResult.resultData = nList;
      }

      const sList = await Home.contentList(4);
      if(sList.length > 0){
         oResult.resultCd = "0000";
         oResult.contentData = sList;
      }

   } catch (error) {
      console.log("error",error);
   }
   
   res.status(200).json(oResult);
}

HomeController.bannerImgCeo = async (req, res) => {
   let oResult = {
      resultCd : "9999",
      list : [],
      mobileList : []
   };

   try {
      const result = await Home.bannerImg();
      if(result.length > 0){
         for await (let sData of result) {
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
                  oResult.mobileList.push(temp);
               } else {
                  oResult.list.push(temp);
               }
            }

            oResult.resultCd = "0000";
         }
      }
   } catch (error) {
      console.log("error",error);
   }
   res.status(200).json(oResult);
}

HomeController.bannerImg = async (req, res) => {
   let oResult = {
      resultCd : "9999",
      list : [],
      mobileList : []
   };

   try {
      const result = await Home.bannerImg();
      if(result.length > 0){
         for await (let sData of result) {
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
            
            if(sData.site === "throo"){
               if(sData.type === "mobile"){
                  oResult.mobileList.push(temp);
               } else {
                  oResult.list.push(temp);
               }
            }

            oResult.resultCd = "0000";
         }
      }
   } catch (error) {
      console.log("error",error);
   }
   res.status(200).json(oResult);
   
}

HomeController.bannerEvent = async (req, res) => {
   const sEmail = req.body.sEmail;
   const iValue = req.body.iValue;
   const sItem = req.body.sItem;
   const storeName = req.body.storeName;
   const sAddress = req.body.sAddress + req.body.sExtraAddress;
   const sPhoneNm = req.body.sPhoneNm;

   let oResult = false;
   let eventItem = "";
   try {
      if(sItem === "xBanner01"){
         eventItem = "X배너_거치대 포함 1번";
      } else if (sItem === "xBanner02"){
         eventItem = "X배너_거치대 포함 2번";
      } else if (sItem === "xBanner03"){
         eventItem = "X배너_거치대 포함 3번";
      } else if (sItem === "xBanner04"){
         eventItem = "X배너_거치대 포함 4번";
      } else if (sItem === "xBanner05"){
         eventItem = "X배너_거치대 포함 5번";
      } else if (sItem === "xBanner06"){
         eventItem = "X배너_거치대 포함 6번";
      } else if (sItem === "poster01"){
         eventItem = "a2 포스터";
      } else if (sItem === "poster02"){
         eventItem = "a4 포스터";
      }

      const resultSendEmail = await sendEmail(storeName,eventItem);
      if(resultSendEmail){
         let sTitle = "입점 신청 EVENT 우리 매장 홍보 아이템";
         let sContent = iValue.toString() + "님 -- " + eventItem.toString();
         const insert = await Home.homeEvent(sEmail,storeName,sAddress,sPhoneNm,"event",sTitle,sContent);
         if(insert != undefined){
            oResult = true;
         }
      }
   } catch (error) {
      console.log("error",error);
   }
   res.status(200).json(oResult);
   
}

HomeController.bannerEventV2 = async (req, res) => {
   const storeName = req.body.storeName;
   const sAddress = req.body.sAddress + req.body.sExtraAddress + req.body.iValue + "귀하";
   const sPhoneNm = req.body.sPhoneNm;

   let oResult = false;
   let sTitle = "홍보물 신청";
   let sContent = "";

   try {
      sContent = storeName.toString();
      const insert = await Home.homeEventV2("",storeName.toString(),sAddress,sPhoneNm,"event",sTitle,storeName.toString(),"","");
      if(insert != undefined){
         oResult = true;
      }
      // if(sFileInfo !== undefined && sFileInfo !== null && sFileInfo.url_path !== undefined){
      //    if(sFileInfo.file_type === "application/postscript"){
      //       sImgType = "application/postscript";
      //    } else if (sFileInfo.file_type === "application/pdf") {
      //       sImgType = "application/pdf";
      //    } else {
      //       sImgType = "image";
      //    }
      //    sImgUrl = sFileInfo.url_path;
      // }
      
      
   } catch (error) {
      console.log("error",error);
   }
   res.status(200).json(oResult);
   
}


module.exports = HomeController;
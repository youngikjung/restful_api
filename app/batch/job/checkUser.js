
   'use strict';

   var config = require('../../config');

   const FormData = require('form-data');
   const axios = require('axios').default;
   const fs = require('fs');
   const ExcelJS = require('exceljs');
   const moment = require('moment-timezone');
   require('moment/locale/ko');

   const Store = require('../../models/store');
   const Order = require('../../models/order');
   const Management = require('../../models/management');
   const Sales = require('../../models/sales');
   const User = require('../../models/user');
   const Merchant = require('../../models/merchant');

   const {
      convincedEmailToOwner1,
      convincedEmailToOwner2,
      convincedEmailToOwner3,
      convincedEmailToOwner4,
      convincedEmailToOwner5,
      confirmCheckUserEmail,
      confirmStoreAppPushEmail,
      settlementEmail
   } = require("../../helpers/emailSender");

   const {
      convertToKRW,
      mysqlDateToYMD,
      padString,
      getCurrentDatetime
   } = require('../../helpers/stringHelper');

   const {
      oFirebaseAdminAppSales,
      oFirebaseAdminAppCeo
   } = require('../../services/firebaseAdmin');

   const { smsCodeUpdate } = require('../../models/user');

   async function* asyncGenerator(sIndex) {
      let count = 0;
      while (count < sIndex) 
      yield count++;
   };

   const fileMove =async  (kParam) => {
      try { 
         const oldPath = process.cwd() + '/settlement.xlsx';
         const newPath = process.cwd() + `/public/settlement/${kParam}.xlsx`;
         await fs.rename(oldPath, newPath, function (err) {
            if (err) throw "fail";
            return "succ";
         })
         return err;
      } catch(err) {
         return err;
      }
   }

   const excelSheet = async (sParam,iParam,kParam,dParam,eParam) => {
      let isgoing = false;
      let workbook = new ExcelJS.Workbook();
      const summarySheet = workbook.addWorksheet("요약");
      summarySheet.columns = [
         { header : "주문금액(할인전 총주문액)", key: "totalAmount", width: 30},
         { header : "할인지원금(스루 지원)", key: "discount", width: 30},
         { header : "혜택할인금(매장 자체 할인)", key: "store", width: 30},
         { header : "고객 결제금액", key: "payment", width: 30},
         { header : "PG결제수수료(3%,부가세별도)", key: "fee", width: 30},
         { header : "입금받을금액", key: "return", width: 30},
      ];
      summarySheet.getRow(1).eachCell((cell) => {
         cell.font = { bold: true, bgColor: "#ADD1FE" };
      });

      const summaryData = {
         totalAmount : sParam.totalAmount,
         discount : sParam.discount,
         store : sParam.store,
         payment : sParam.payment,
         fee : sParam.fee,
         return : sParam.return,
      };
      await summarySheet.addRow(summaryData);
      
      const dataSheet = workbook.addWorksheet("상세");
      dataSheet.columns = [
         { header : "날짜", key: "date", width: 30},
         { header : "주문금액", key: "amount", width: 30},
         { header : "할인지원금", key: "discount", width: 30},
         { header : "혜택지원금", key: "reward", width: 30},
         { header : "카드결제", key: "card", width: 30},
         { header : "결제수수료", key: "fee", width: 30},
         { header : "입금받을금액", key: "return", width: 30},
      ];
      dataSheet.getRow(1).eachCell((cell) => {
         cell.font = { bold: true, bgColor: "#ADD1FE" };
      });

      for await (let sItem of iParam) {
         const dataPageData = {
            date: sItem.date,
            amount: sItem.amount,
            discount: sItem.discount,
            reward: sItem.reward,
            card: sItem.card,
            fee: sItem.fee,
            return: sItem.return,
         };
         await dataSheet.addRow(dataPageData);
      }

      await workbook.xlsx.writeFile("settlement.xlsx");

      const renameXlsx = await fileMove(kParam);
      if(renameXlsx !== "fail"){
         const newPath = process.cwd() + `/public/settlement/${kParam}.xlsx`;
         const sender = await settlementEmail(eParam.toString(),kParam,newPath,dParam);
         if(sender){
            isgoing = true;
            await fs.stat(process.cwd() + `/public/settlement/${kParam}.xlsx`, function (err, stats) {
               if (!err) {
                  fs.unlink(process.cwd() + `/public/settlement/${kParam}.xlsx`,function(error){
                     if (error) {
                        console.log("file unlink err =>>>>>> ", moment(), "storeName => ",kParam);
                     }
                  });  
               }
            });
         }
      }

      return isgoing;
   };

   const excelData = async (getMonthlyData) => {
      let result = {};
      let totalData = [];
      let summaryList = {};
      let iTotalAmt = 0;
      let iThrooDiscount = 0;
      let iStoreDiscount = 0;
      let sPayment = 0;
      let iFee = 0;
      let iReturn = 0;
   
      for (const iterator of getMonthlyData) {
         let tempTotalAmt = 0;
         let tempThrooDiscount = 0;
         let tempStoreDiscount = 0;
         let tempThrooCoupon = 0;
         let tempThrooPoint = 0;
         let tempFee = 0;
         let tempPayment = 0;
         let tempReturn = 0;
         
         let temp = {};
         temp.date = "";
         temp.amount = 0;
         temp.discount = 0;
         temp.reward = 0;
         temp.card = 0;
         temp.fee = 0;
         temp.return = 0;
   
         if(iterator.created_at !== undefined && iterator.created_at !== null){
            temp.date = iterator.created_at; 
         }
   
         if(iterator.total_amount_org !== undefined && iterator.total_amount_org !== null){
            tempTotalAmt = Math.floor(parseFloat(iterator.total_amount_org)); 
            temp.amount = convertToKRW(Math.floor(parseFloat(iterator.total_amount_org)), true); 
         }
   
         if(iterator.total_amount_incl !== undefined && iterator.total_amount_incl !== null){
            tempFee = Math.floor(parseFloat(iterator.total_amount_incl) * 0.033);
            tempPayment = Math.floor(parseFloat(iterator.total_amount_incl));
            temp.card = convertToKRW(Math.floor(parseFloat(iterator.total_amount_incl)), true);
            temp.fee = convertToKRW(Math.floor(parseFloat(iterator.total_amount_incl) * 0.033), true);
         }
   
         if(iterator.coupon_amount !== undefined && iterator.coupon_amount !== null && parseInt(iterator.coupon_amount) > 0){
            tempThrooCoupon = Math.floor(parseFloat(iterator.coupon_amount));
         }
   
         if(iterator.points_amount !== undefined && iterator.points_amount !== null && parseInt(iterator.points_amount) > 0){
            tempThrooPoint = Math.floor(parseFloat(iterator.points_amount));
         }
   
         if(iterator.coupon_partner_amount !== undefined && iterator.coupon_partner_amount !== null && parseInt(iterator.coupon_partner_amount) > 0){
            tempStoreDiscount = Math.floor(parseFloat(iterator.coupon_partner_amount));
         }
   
         tempThrooDiscount = tempThrooCoupon + tempThrooPoint;
         tempReturn = tempTotalAmt - (tempFee + tempStoreDiscount);
         temp.return = convertToKRW(tempReturn, true);
         temp.discount = convertToKRW(tempThrooDiscount, true);
         temp.reward = convertToKRW(tempStoreDiscount, true);
         totalData.push(temp);
   
         iTotalAmt = tempTotalAmt + iTotalAmt;
         iThrooDiscount = tempThrooDiscount + iThrooDiscount;
         iStoreDiscount = tempStoreDiscount + iStoreDiscount;
         sPayment = tempPayment + sPayment;
         iFee = tempFee + iFee;
         iReturn = tempReturn + iReturn;
      }
   
      summaryList.totalAmount = iTotalAmt;
      summaryList.discount = iThrooDiscount;
      summaryList.store = iStoreDiscount;
      summaryList.payment = sPayment;
      summaryList.fee = iFee;
      summaryList.return = iReturn;
   
      result.summaryList = summaryList;
      result.orderData = totalData;
   
      return result;
   }

   const getToken = async () => {
      let oResult = {
         resultCode : "9999",
         token: "",
      };

      try {
         const sAuth = {
            apikey: config.keys.aligosmskey,
            userid: config.keys.aligosmsid,
         }
         let postData = {};
         for (let key in sAuth) {
            // 인증정보
            postData[key] = sAuth[key]
         }
         let form = new FormData();
         for (let key in postData) {
            if (key == 'image' || key == 'fimage') {
               // 파일만 별도로 담아주기
               form.append(key, fs.createReadStream(postData[key][0].path), { filename: postData[key][0].originalFilename, contentType: postData[key][0].headers['content-type'] });
            } else {
               form.append(key, postData[key])
            }
         }
         let formHeaders = form.getHeaders();
         const result = await axios({
            url: `https://kakaoapi.aligo.in/akv10/token/create/2022/y`,
            method: "post",
            timeout: (15 * 1000),
            headers: {
               ...formHeaders
            },
            data: form,
            transformResponse: [ (data) => {
               return data;
            }],
         });
         const parsing = await JSON.parse(result.data);
         if(parsing.code.toString() === "0"){
            oResult.resultCode = "0000";
            oResult.token = parsing.token;
            oResult.urlencode = parsing.urlencode;
         }
      } catch (error) {
         console.log("getToken fail error ======>",error);
      }

      return oResult;
   }

   const getFriendList = async (sToken) => {
      let oResult = {
         resultCode : "9999",
         list: "",
      };

      try {
         const sAuth = {
            apikey: config.keys.aligosmskey,
            userid: config.keys.aligosmsid,
            token: sToken
         }
         let postData = {};
         for (let key in sAuth) {
            // 인증정보
            postData[key] = sAuth[key]
         }
         let form = new FormData();
         for (let key in postData) {
            if (key == 'image' || key == 'fimage') {
               // 파일만 별도로 담아주기
               form.append(key, fs.createReadStream(postData[key][0].path), { filename: postData[key][0].originalFilename, contentType: postData[key][0].headers['content-type'] });
            } else {
               form.append(key, postData[key])
            }
         }
         let formHeaders = form.getHeaders();
         const result = await axios({
            url: 'https://kakaoapi.aligo.in/akv10/profile/list/',
            method: "post",
            timeout: (15 * 1000),
            headers: {
               ...formHeaders
            },
            data: form,
            transformResponse: [ (data) => {
               return data;
            }],
         });
         const parsing = await JSON.parse(result.data);
         if(parsing.code.toString() === "0"){
            oResult.resultCode = "0000";
            oResult.list = parsing.list;
         }
      } catch (error) {
         console.log("getFriendList fail error ======>",error);
      }

      return oResult;
   }

   const getTemplateList = async (sToken,sType) => {
      let oResult = {
         resultCode : "9999",
         list: "",
      };

      try {
         const sAuth = {
            apikey: config.keys.aligosmskey,
            userid: config.keys.aligosmsid,
            token: sToken,
            senderkey: (sType !== undefined && sType !== null) ? config.keys.aligoCustomerKakaoKey : config.keys.aligoKakaoKey,
         }
         let postData = {};
         for (let key in sAuth) {
            // 인증정보
            postData[key] = sAuth[key]
         }
         let form = new FormData();
         for (let key in postData) {
            if (key == 'image' || key == 'fimage') {
               // 파일만 별도로 담아주기
               form.append(key, fs.createReadStream(postData[key][0].path), { filename: postData[key][0].originalFilename, contentType: postData[key][0].headers['content-type'] });
            } else {
               form.append(key, postData[key])
            }
         }
         let formHeaders = form.getHeaders();
         const result = await axios({
            url: 'https://kakaoapi.aligo.in/akv10/template/list/',
            method: "post",
            timeout: (15 * 1000),
            headers: {
               ...formHeaders
            },
            data: form,
            transformResponse: [ (data) => {
               return data;
            }],
         });
         const parsing = await JSON.parse(result.data);
         if(parsing.code.toString() === "0"){
            oResult.resultCode = "0000";
            oResult.list = parsing.list;
         }
      } catch (error) {
         console.log("getTemplateList fail error ======>",error);
      }

      return oResult;
   }

   const actKakaoTalk = async (sToken,sCode,sReceiver,iSubject,iMessage,sType) => {
      let oResult =  "9999";

      try {
         const sAuth = {
            apikey: config.keys.aligosmskey,
            userid: config.keys.aligosmsid,
            token: sToken,
            senderkey: (sType !== undefined && sType !== null) ? config.keys.aligoCustomerKakaoKey : config.keys.aligoKakaoKey,
            tpl_code: sCode,
            sender: "16705324",
            receiver_1: sReceiver,
            subject_1: iSubject,
            message_1: iMessage,
            failover: "Y",
            fsubject_1: "안녕하세요 스루입니다",
            fmessage_1: iMessage
         }
         let postData = {};
         for (let key in sAuth) {
            // 인증정보
            postData[key] = sAuth[key]
         }
         let form = new FormData();
         for (let key in postData) {
            if (key == 'image' || key == 'fimage') {
               // 파일만 별도로 담아주기
               form.append(key, fs.createReadStream(postData[key][0].path), { filename: postData[key][0].originalFilename, contentType: postData[key][0].headers['content-type'] });
            } else {
               form.append(key, postData[key])
            }
         }
         let formHeaders = form.getHeaders();
         const result = await axios({
            url: 'https://kakaoapi.aligo.in/akv10/alimtalk/send/',
            method: "post",
            timeout: (15 * 1000),
            headers: {
               ...formHeaders
            },
            data: form,
            transformResponse: [ (data) => {
               return data;
            }],
         });
         const parsing = await JSON.parse(result.data);
         if(parsing.code.toString() === "0"){
            oResult = "0000";
         }
      } catch (error) {
         console.log("actKakaoTalk fail error ======>",error);
      }

      return oResult;
   }

   const addKakaoTalk = async (sToken,sTitle,sContent,sType) => {
      let oResult = {
         resultCode : "9999",
         code : ""
      };

      try {
         const sAuth = {
            apikey: config.keys.aligosmskey,
            userid: config.keys.aligosmsid,
            token: sToken,
            senderkey: (sType !== undefined && sType !== null) ? config.keys.aligoCustomerKakaoKey : config.keys.aligoKakaoKey,
            tpl_name: sTitle,
            tpl_content: sContent
         }
         let postData = {};
         for (let key in sAuth) {
            // 인증정보
            postData[key] = sAuth[key]
         }
         let form = new FormData();
         for (let key in postData) {
            if (key == 'image' || key == 'fimage') {
               // 파일만 별도로 담아주기
               form.append(key, fs.createReadStream(postData[key][0].path), { filename: postData[key][0].originalFilename, contentType: postData[key][0].headers['content-type'] });
            } else {
               form.append(key, postData[key])
            }
         }
         let formHeaders = form.getHeaders();
         const result = await axios({
            url: 'https://kakaoapi.aligo.in/akv10/template/add/',
            method: "post",
            timeout: (15 * 1000),
            headers: {
               ...formHeaders
            },
            data: form,
            transformResponse: [ (data) => {
               return data;
            }],
         });
         const parsing = await JSON.parse(result.data);
         console.log("parsing",parsing);
         if(parsing.code.toString() === "0"){
            oResult.resultCode = "0000";
            oResult.code = parsing.data.templtCode;
         }
      } catch (error) {
         console.log("addKakaoTalk fail error ======>",error);
      }

      return oResult;
   }

   const requestKakaoTalk = async (sToken,sCode,sType) => {
      let oResult = {
         resultCode : "9999",
      };

      try {
         const sAuth = {
            apikey: config.keys.aligosmskey,
            userid: config.keys.aligosmsid,
            token: sToken,
            senderkey: (sType !== undefined && sType !== null) ? config.keys.aligoCustomerKakaoKey : config.keys.aligoKakaoKey,
            tpl_code: sCode,
         }
         let postData = {};
         for (let key in sAuth) {
            // 인증정보
            postData[key] = sAuth[key]
         }
         let form = new FormData();
         for (let key in postData) {
            if (key == 'image' || key == 'fimage') {
               // 파일만 별도로 담아주기
               form.append(key, fs.createReadStream(postData[key][0].path), { filename: postData[key][0].originalFilename, contentType: postData[key][0].headers['content-type'] });
            } else {
               form.append(key, postData[key])
            }
         }
         let formHeaders = form.getHeaders();
         const result = await axios({
            url: 'https://kakaoapi.aligo.in/akv10/template/request/',
            method: "post",
            timeout: (15 * 1000),
            headers: {
               ...formHeaders
            },
            data: form,
            transformResponse: [ (data) => {
               return data;
            }],
         });
         const parsing = await JSON.parse(result.data);
         console.log("parsing",parsing);
         if(parsing.code.toString() === "0"){
            oResult.resultCode = "0000";
         }
      } catch (error) {
         console.log("requestKakaoTalk fail error ======>",error);
      }

      return oResult;
   }

   const validateUnRegisterUser = async () => {
      const senderList = [
         { key : "kyg@ivid.kr"},
         { key : "yoon@ivid.kr"},
         { key : "jyi@ivid.kr"},
      ]
      const fromDate = moment().add(-20,"days").format('YYYY-MM-DD');
      const toDate = moment().format('YYYY-MM-DD');
      const firstDate = moment().add(-1, "days").format('YYYY-MM-DD');
      const secondDate = moment().add(-3, "days").format('YYYY-MM-DD');
      const thirdDate = moment().add(-5, "days").format('YYYY-MM-DD');
      const fourthDate = moment().add(-10, "days").format('YYYY-MM-DD');
      const fifthDate = moment().add(-20, "days").format('YYYY-MM-DD');

      let after1 = 0;
      let after2 = 0;
      let after3 = 0;
      let after4 = 0;
      let after5 = 0;
      let fail1 = 0;
      let fail2 = 0;
      let fail3 = 0;
      let fail4 = 0;
      let fail5 = 0;
      let kakaoSuc1 = 0;
      let kakaoSuc2 = 0;
      let kakaoSuc3 = 0;
      let kakaoSuc4 = 0;
      let kakaoSuc5 = 0;
      let kakaoFail1 = 0;
      let kakaoFail2 = 0;
      let kakaoFail3 = 0;
      let kakaoFail4 = 0;
      let kakaoFail5 = 0;

      if(moment().format('HH') === "13"){
         console.log("매장 등록 촉구 이메일 전송 job start =>> ",moment());

         const getList = await Store.checkUnRegisterStore(fromDate,toDate);
         for await (const iterator of getList) {
            if(iterator.email !== undefined && iterator.email !== null && iterator.email !== "" && iterator.phoneNm !== undefined && iterator.phoneNm !== null && iterator.phoneNm !== ""){
               let userPhone = iterator.phoneNm.toString();
               let userEmail = iterator.email.toString();
               if(moment(iterator.createDate).format('YYYY-MM-DD') === firstDate){
                  const result = await convincedEmailToOwner1(userEmail,iterator.ownerNm);
                  if(result){
                     after1 += 1
                  } else {
                     fail1 += 1;
                  }
                  
                  const kakaoResult = await sendAlertMessage(userPhone,"TF_4394");
                  if(kakaoResult === "0000"){
                     kakaoSuc1 += 1
                  } else {
                     kakaoFail1 += 1;
                  }

               } else if (moment(iterator.createDate).format('YYYY-MM-DD') === secondDate){
                  const result = await convincedEmailToOwner2(userEmail,iterator.ownerNm);
                  if(result){
                     after2 += 1
                  } else {
                     fail2 += 1;
                  }

                  const kakaoResult = await sendAlertMessage(userPhone,"TF_4397");
                  if(kakaoResult === "0000"){
                     kakaoSuc2 += 1
                  } else {
                     kakaoFail2 += 1;
                  }

               } else if (moment(iterator.createDate).format('YYYY-MM-DD') === thirdDate){
                  const result = await convincedEmailToOwner3(userEmail,iterator.ownerNm);
                  if(result){
                     after3 += 1
                  } else {
                     fail3 += 1;
                  }

                  const kakaoResult = await sendAlertMessage(userPhone,"TF_4399");
                  if(kakaoResult === "0000"){
                     kakaoSuc3 += 1
                  } else {
                     kakaoFail3 += 1;
                  }

               } else if (moment(iterator.createDate).format('YYYY-MM-DD') === fourthDate){
                  const result = await convincedEmailToOwner4(userEmail,iterator.ownerNm);
                  if(result){
                     after4 += 1
                  } else {
                     fail4 += 1;
                  }

                  const kakaoResult = await sendAlertMessage(userPhone,"TF_4400");
                  if(kakaoResult === "0000"){
                     kakaoSuc4 += 1
                  } else {
                     kakaoFail4 += 1;
                  }

               } else if (moment(iterator.createDate).format('YYYY-MM-DD') === fifthDate){
                  const result = await convincedEmailToOwner5(userEmail,iterator.ownerNm);
                  if(result){
                     after5 += 1
                  } else {
                     fail5 += 1;
                  }

                  const kakaoResult = await sendAlertMessage(userPhone,"TF_4416");
                  if(kakaoResult === "0000"){
                     kakaoSuc5 += 1
                  } else {
                     kakaoFail5 += 1;
                  }

               }
            }
         }

         const emailTitle = `스루 시스템 모니터에서 등록 촉구 이메일 전송 결과를 알려드립니다.`;
         const centerMsg = "가입후 오픈미정인 가게 총" + getList.length + "개";
         const after1day = "가입후 1일 경과 대상자 : 총 " + (after1 + fail1) + "명 " + after1 + "명에게 메일전송 완료 | " + fail1 + "명에게 메일전송 실패 | " + kakaoSuc1 + "명에게 카카오톡전송 완료 | " + kakaoFail1 + "명에게 카카오톡전송 실패";
         const after3day = "가입후 3일 경과 대상자 : 총 " + (after2 + fail2) + "명 " + after2 + "명에게 메일전송 완료 | " + fail2 + "명에게 메일전송 실패 | " + kakaoSuc2 + "명에게 카카오톡전송 완료 | " + kakaoFail2 + "명에게 카카오톡전송 실패";
         const after5day = "가입후 5일 경과 대상자 : 총 " + (after3 + fail3) + "명 " + after3 + "명에게 메일전송 완료 | " + fail3 + "명에게 메일전송 실패 | "+ kakaoSuc3 + "명에게 카카오톡전송 완료 | " + kakaoFail3 + "명에게 카카오톡전송 실패";
         const after10day = "가입후 10일 경과 대상자 : 총 " + (after4 + fail4) + "명 " + after4 + "명에게 메일전송 완료 | " + fail4 + "명에게 메일전송 실패 | " + kakaoSuc4 + "명에게 카카오톡전송 완료 | " + kakaoFail4 + "명에게 카카오톡전송 실패";
         const after20day = "가입후 20일 경과 대상자: 총 " + (after5 + fail5) + "명 " + after5 + "명에게 메일전송 완료 | " + fail5 + "명에게 메일전송 실패 | " + kakaoSuc5 + "명에게 카카오톡전송 완료 | " + kakaoFail5 + "명에게 카카오톡전송 실패";
         for await (const iterator of senderList) {
            await confirmCheckUserEmail(iterator.key,centerMsg,after1day,after3day,after5day,after10day,after20day,"",emailTitle);
         }

         console.log("매장 등록 촉구 이메일 전송 job end =>> ",moment());
      }
   }

   const sendAlertMessage = async (phoneNm,tCode) => {
      let oResult = "9999";
      let sToken = "";
      let sCode = "";
      let sReceiver = "";
      let iSubject = "";
      let iMessage = "";

      const token = await getToken();
      if(token.resultCode === "0000"){
         sToken = token.token;
         const templateList = await getTemplateList(sToken);
         if(templateList.resultCode === "0000"){
            if(templateList.list.length > 0){
               for await (const x of templateList.list) {
                  if(x.templtCode === tCode && x.inspStatus === "APR"){
                     sCode = x.templtCode;
                     sReceiver = phoneNm;
                     iSubject = x.templtName;
                     iMessage = x.templtContent;
                  }
               }
            }
            const result = await actKakaoTalk(sToken,sCode,sReceiver,iSubject,iMessage);
            if(result === "0000"){
               oResult = "0000";
            }
         }
      }

      return oResult;
   }

   const sendThrooAlertMessage = async (phoneNm,tCode) => {
      let oResult = "9999";
      let sToken = "";
      let sCode = "";
      let sReceiver = "";
      let iSubject = "";
      let iMessage = "";

      const token = await getToken();
      console.log("token",token);
      if(token.resultCode === "0000"){
         sToken = token.token;
         const templateList = await getTemplateList(sToken,"throo");
         console.log("templateList",templateList);
         if(templateList.resultCode === "0000"){
            if(templateList.list.length > 0){
               for await (const x of templateList.list) {
                  if(x.templtCode === tCode && x.inspStatus === "APR"){
                     sCode = x.templtCode;
                     sReceiver = phoneNm;
                     iSubject = x.templtName;
                     iMessage = x.templtContent;
                  }
               }
            }
            const result = await actKakaoTalk(sToken,sCode,sReceiver,iSubject,iMessage,"throo");
            console.log("result",result);
            if(result === "0000"){
               oResult = "0000";
            }
         }
      }

      return oResult;
   }

   const addAlertMessage = async (iTitle,iContent) => {
      let sToken = "";
      let sTitle = iTitle;
      let sContent = iContent;

      const token = await getToken();
      if(token.resultCode === "0000"){
         sToken = token.token;
         console.log("sToken",sToken);
         const register = await addKakaoTalk(sToken,sTitle,sContent);
         console.log("register",register);
         requestKakaoTalk(sToken,register.code);
      }
   }

   const sendSettlementToStore = async () => {
      const findDay = moment().day();
      const senderList = [
         { key : "jyi@ivid.kr"},
         { key : "yoon@ivid.kr"},
      ]
      
      try {
         let tempCount = 0;
         let tempTotalCount = 0;
         let fail = 0;
         let noneEmail = 0;
         if(parseInt(findDay) === 1){
            console.log("매장별 정산내역 이메일발송 job start =>> ",moment());
            
            const fromDate = moment().startOf('week').add(-6,"days").format('YYYY-MM-DD');
            const toDate = moment().startOf('week').format('YYYY-MM-DD');
            const getMonthlyData = await Order.settlementToEmailSender(fromDate,toDate);
            const settlementDateTitle = fromDate + "~" + toDate;
            if(getMonthlyData.length > 0){
               for await (const sItem of getMonthlyData) {
                  if(sItem.email !== undefined && sItem.email !== null && sItem.email !== ""){
                     const result = await Order.getMonthlySettlementByStoreId(fromDate,toDate,sItem.store_id);
                     if(result.length > 0){
                        const excelResult = await excelData(result);
                        if(excelResult.summaryList !== undefined && excelResult.orderData !== undefined){
                           const excelSheetResult = await excelSheet(excelResult.summaryList,excelResult.orderData,sItem.store_name,settlementDateTitle,sItem.email);
                           if(excelSheetResult){
                              const senderResult = await Management.sendMailSettlement(sItem.store_id);
                              if(senderResult !== undefined){
                                 tempCount += 1;
                              }
                           }
                        }
                     }
                     tempTotalCount += 1;
                  } else {
                     noneEmail += 1;
                  }
               }
               fail = tempTotalCount - tempCount;

               const emailTitle = `스루 시스템 모니터에서 금주 정산내역 이메일 전송 결과를 알려드립니다.`;
               const centerMsg = settlementDateTitle + "기준으로 매출발생한 입점업체들의 정산내역을 이메일전송완료하였습니다"
               const contentMsg1 = "대상자 :  총" + getMonthlyData.length + "개";
               const contentMsg2 = "총" + tempTotalCount + "업체를 대상으로 " + tempCount + "번 메일전송 완료 | " + fail + "번 메일전송 실패";
               const contentMsg3 = "총" + getMonthlyData.length + "업체중 " + tempTotalCount + "개의 매장이 이메일이 등록상태이고";
               const contentMsg4 = "총" + getMonthlyData.length + "업체중 " + noneEmail + "개의 매장이 이메일이 미등록상태입니다";
               for await (const iterator of senderList) {
                  await confirmCheckUserEmail(iterator.key,centerMsg,contentMsg1,contentMsg2,contentMsg3,contentMsg4,"","",emailTitle);
               }
            }
            console.log("매장별 정산내역 이메일발송 job end =>> ",moment());
         }
      } catch (error) {
         console.log("sendSettlementToStore err =>>>", error);
      }
   }

   const sendPushMessageForSales = async (sTitle,sContent) => {
      await Sales.insertMessageList("all",0,sTitle,sContent);

      const pushTitle = "스루영업팀 전체 공지사항";
      const result = await Sales.getTotalSalesTeam();
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
         }
      }
   }

   const sendPushMessageForStoreApp = async (sTitle,sContent) => {
      let failReason = "";
      let sucReason = "";
      let failEmailList = [];
      let sucEmailList = [];
      let today = moment().format("YYYY-MM-DD HH:mm")
      let totalCount = 0;
      let succCount = 0;
      let failCount = 0;
      let oNotiMessage = {
         data: {
               title: sTitle,
               body: sContent,
         },
         notification: {
               title: sTitle,
               body: sContent
         },
         android: {
               priority: "high",
               ttl: 3600 * 1000,
               notification: {
                  channelId: "throo_app_alarm"
               },
         },
      };

      const senderList = [
         { key : "kyg@ivid.kr"},
         { key : "yoon@ivid.kr"},
         { key : "jyi@ivid.kr"},
      ]
      const result = await Merchant.getTotalThrooStoreToken();
      if(result.length > 0){
         for await (const e of result) {
            oNotiMessage.token = e.token.toString();
            const pushResult = await ceoTargetPushMessage(oNotiMessage);
            if(pushResult.resultCd === "0000"){
               let temp = {};
               temp.storeName = "매장명:" + e.store_name;
               temp.phoneNumber = "매장 전화번호:" + e.phone_number;
               sucEmailList.push(temp);
               succCount += 1;
            } else {
               let temp = {};
               temp.storeName = "매장명:" + e.store_name;
               temp.phoneNumber = "매장 전화번호:" + e.phone_number;
               temp.faill = "실패이유" + pushResult.resultMsg;
               failEmailList.push(temp);
               failCount += 1;
            }
            totalCount += 1;
         }
         const emailTitle = `스루 시스템 모니터에서 등록한 공지사항에 대한 스루 스토어 앱 푸시 결과를 알려드립니다.`;
         const centerMsg = today + "기준으로 등록한 공지사항에 대하여 스루 스토어로 푸시를 전송완료하였습니다"
         const contentMsg1 = "스루 스토어 푸시 등록 수 :  총" + totalCount;
         const contentMsg2 = "총" + totalCount + "개 대상으로 " + succCount + "번 완료 | " + failCount + "번 실패";
         if(failEmailList.length > 0){
            failReason = failEmailList.map(function(elem){
               return elem.storeName + " - " + elem.phoneNumber + " - " + elem.faill;
            }).join(", ");
         }
         if(sucEmailList.length > 0){
            sucReason = sucEmailList.map(function(elem){
               return elem.storeName + " - " + elem.phoneNumber;
            }).join(", ");
         }
         for await (const iterator of senderList) {
            await confirmStoreAppPushEmail(iterator.key,emailTitle,centerMsg,contentMsg1,contentMsg2,failReason,sucReason);
         }
      }
   }

   const ceoTargetPushMessage = async (oNotiMessage) => {
      let oRes = {
         resultCd: "9999",
         resultMsg: "none"
      }
      await  oFirebaseAdminAppCeo.messaging()
            .send(oNotiMessage)
            .then((response) => {
               oRes.resultCd = "0000";
               oRes.resultMsg = "성공";
               return oRes
            })
            .catch((error) => {
               console.log("error",error);
               oRes.resultMsg = error;
               return oRes
            });
      return oRes; 
  }

   const senderCancelOrderCoupon = async () => {
      let storeList = [];
      let sucCoupon = 0;
      let senderList = [
         { key : "kyg@ivid.kr"},
         { key : "yoon@ivid.kr"},
         { key : "jyi@ivid.kr"},
      ]
      
      if(moment().format('HH') === "11"){
         console.log("주문취소 쿠폰 전송 job start =>> ",moment());
         
         const startDate = moment().add(-1,"days").format('YYYY-MM-DD');
         const checkUp = await Order.checkUpCancelOrder(startDate);
         if(checkUp.length > 0){
            for await (const e of checkUp) {
               let process = false;
               let store_id = e.store_id;
               storeList.push(e.store_name);
               
               const checkStoreType = await Store.checkCancelOrderCouponType(parseInt(store_id));
               if(checkStoreType.length > 0){
                  process = true;
               }
               
               if(process){
                  if(checkStoreType[0].parent_store_type_id.toString() === "1" || checkStoreType[0].parent_store_type_id.toString() === "8"){
                     sucCoupon += 1;
                     
                  } else if (checkStoreType[0].parent_store_type_id.toString() === "2") {
                     sucCoupon += 1;
                  }
               }
            }
         }

         const emailTitle = `스루 시스템 모니터에서 주문취소 쿠폰 전송 결과를 알려드립니다.`;
         const centerMsg = "쿠폰 대상자 총" + checkUp.length + "명";
         const after5day = "쿠폰생성 생성 고객 : 총 " + sucCoupon + "명 ";
         const after10day = "쿠폰 대상 매장 리스트 : " + storeList.join(',');

         for await (const iterator of senderList) {
            await confirmCheckUserEmail(iterator.key,centerMsg,"","",after5day,after10day,"","",emailTitle);
         }

         console.log("주문취소 쿠폰 전송 job end =>> ",moment());
      }
   }

   const validateUserStamp = async () => {
      
   }
   

   const processCalculateOrder = async () => {
      const findDay = moment().day();
      const senderList = [
         { key : "jyi@ivid.kr"},
         { key : "yoon@ivid.kr"},
      ]
      
      try {
         let count = 0;
         console.log("findDay",findDay);
         if(parseInt(findDay) === 4){
            console.log("매장별 정산처리 job start =>> ",moment());
            const fromDate = moment().startOf('week').add(-6,"days").format('YYYY-MM-DD');
            const toDate = moment().startOf('week').format('YYYY-MM-DD');
            const thisDate = moment().startOf('week').add(1,"days").format('YYYY-MM-DD');
            const transactionDate = moment().startOf('week').add(3,"days").format('YYYY-MM-DD');
            console.log("fromDate",fromDate);
            console.log("toDate",toDate);
            console.log("thisDate",thisDate);
            console.log("transactionDate",transactionDate);
            const getMonthlyData = await Order.getSettlementSenderData(thisDate);
            console.log("getMonthlyData",getMonthlyData);
            const settlementDateTitle = fromDate + "~" + toDate;
            console.log("settlementDateTitle",settlementDateTitle);
            if(getMonthlyData.length > 0){
               for await (const sItem of getMonthlyData) {
                  console.log("sItem",sItem);
                  if(sItem.store_id !== undefined && sItem.store_id !== null && sItem.store_id !== ""){
                     const result = Order.insertStoreInvoice(parseInt(sItem.store_id),transactionDate);
                     console.log("result",result);
                     if(result !== undefined && result !== null){
                        count += 1;
                     }
                  }
               }

               const emailTitle = `스루 시스템 모니터에서 금주 정산처리 결과를 알려드립니다.`;
               const centerMsg = settlementDateTitle + "기준으로 매출발생한 입점업체들의 정산완료하였습니다"
               const contentMsg = "대상자 :  총" + getMonthlyData.length + "개";
               const contentMsg2 = "처리성공 :  총" + count + "개";
               for await (const iterator of senderList) {
                  await confirmCheckUserEmail(iterator.key,centerMsg,contentMsg,contentMsg2,"","","","",emailTitle);
               }
            }
            console.log("매장별 정산처리 job end =>> ",moment());
         }
      } catch (error) {
         console.log("processCalculateOrder err =>>>", error);
      }
   }
   
   module.exports = {
      validateUnRegisterUser,
      addAlertMessage,
      sendSettlementToStore,
      sendAlertMessage,
      sendPushMessageForSales,
      sendPushMessageForStoreApp,
      senderCancelOrderCoupon,
      processCalculateOrder,
      validateUserStamp,
      sendThrooAlertMessage
   }


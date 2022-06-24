'use strict';

var jwt = require('jsonwebtoken');
var config = require('../config');

const nodemailer = require("nodemailer");
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
} = require('./errorHelper');

const helpers = require('./imageHelper');

const {
   convertToKRW,
   mysqlDateToYMD,
   padString,
   getCurrentDatetime
} = require('./stringHelper');

var oValidate = require("validate.js");

const { async } = require('validate.js');

const confirmStoreAppPushEmail = async (aIndex,qIndex,wIndex,eIndex,rIndex,tIndex,yIndex) => {
   let result = false;

   const smtpEndpoint = "email-smtp.ap-northeast-2.amazonaws.com";
   const port = 587;
   const senderAddress = "스루 관리자<contract@ivid.kr>";
   var toAddresses = aIndex;
   const smtpUsername = "AKIA55SPEYY6PQKGIGF7";
   const smtpPassword = "BArP6VJI00nUvsoLLvHJ/vuiDsT70pnNkRn6JshFG3qd";
   var subject = qIndex;
   var body_html = 
   `
   <!DOCTYPE html>
      <html lang="ko">
      <head>
         <meta charset="UTF-8">
         <meta http-equiv="X-UA-Compatible" content="IE=edge">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <title>pass</title>
         <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
         <style>
            /* * {
               padding: 0;
               box-sizing: border-box;
               font-family: 'Noto Sans KR', sans-serif;
               margin: 0 auto;
            } */
         </style>
      </head>
      <body style="background: #f5f4f2; width: 100%; margin: 50px 0; padding: 0 10%; box-sizing: border-box;" >
         <table>
            <table style="background: #fff; width: 100%; padding-top: 80px; border-spacing: 0; box-shadow: 2px 2px 8px 0 #ddd; ">
               <thead>
                     <tr>
                        <th style="height:32px; text-align: left;">
                           <img class="barIcon" width="56px" height="32px" style="height:6px; margin-left: -7px; transform: translate(0, -180%);"  src="https://api.ivid.kr/ceo/useless/38.png" alt="바아이콘">   
                           <img class="throo_logo" width="92px" height="32px" src="https://api.ivid.kr/ceo/useless/12.png" alt="스루로고">   
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 16px 55px 24px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 22px; font-weight: bold; color: #222;">
                           ${qIndex}
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 16px 55px 24px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 500; color: #222;">
                           ${wIndex}
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 16px 55px 24px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 500; color: #222;">
                           ${eIndex}
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 16px 55px 24px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 500; color: #222;">
                           ${rIndex}
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 16px 55px 24px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 500; color: #222;">
                           성공한 매장 리스트
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 16px 55px 24px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px; font-weight: 400; color: #222;">
                           ${yIndex}
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 16px 55px 24px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 500; color: #222;">
                           실패한 매장 리스트
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 16px 55px 24px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px; font-weight: 400; color: #222;">
                           ${tIndex}
                        </th>
                     </tr>
                     
                     <tr>
                        <th style="width: 100%; text-align: left; padding: 0 55px 52px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #707070; border-bottom: 1px solid #ddd;">
                           감사합니다.
                        </th>
                     </tr>
               </thead>
               <tbody style="background: #f1f1f1; ">
                     <tr>
                        <td>
                           <table style="background: #fff; margin:36px 57px;">
                                 <tr >
                                    <td style="padding:12px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px; font-weight: 500; color: #000;">
                                       스루 주문접속 프로그램(POS) 다운받기
                                    </td>
                                 </tr>
                                 <tr >
                                    <td style="padding:0 12px 12px 12px;">
                                       <a href="https://api-stg.ivid.kr/throoposdl" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3; margin-right: 40px;">PC 버전</a>
                                    </td>
                                 </tr>
                                 <tr >
                                    <td style="padding:0 12px 12px 12px;">
                                       <a href="https://play.google.com/store/apps/details?id=kr.throo.pos" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3;">안드로이드 버전</a>
                                    </td>
                                 </tr>
                           </table>
                        </td>
                     </tr>
                     <tr>
                        <td style="font-size: 15px; font-weight: bold; color: #bbb; padding: 0 60px 28px 60px">INVISIBLEIDEAS</td>
                     </tr>
               </tbody>
            </table>
            <table class="footer" style="width: 100%;">
               <thead style="width: 100%;">
                     <tr class="footer-logo">
                        <th style="padding: 23px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 700;">
                           사장님! 궁금하신점은 지금 상담하세요.                   
                        </th>
                     </tr>
               </thead>
               <tbody style="width: 100%;">
                     <tr>
                        <td style="text-align: center;"><a href="http://pf.kakao.com/_tzxkNK/chat"><img src="https://api.ivid.kr/ceo/useless/25.png" width="280px" height="64px"  alt="카카오톡 상담하기"></a></td>
                     </tr>
                     <tr>
                        <td style="padding: 26px 0 16px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">
                           이 메일은 스루 서비스를 이용하기 위해 꼭 필요한 내용으로 정보통신망 이용촉진 및 정보보호 등에 관한 법률에 따라 마케팅 메시지 수신동의 여부와 무관하게 발송되었습니다.
                        </td>
                     </tr>
                     <tr>
                        <td style="padding: 0 0 12px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">스루  |  서울 서초구 서초대로 398 플래티넘타워 7층  |  인비저블아이디어(주)  |  partners@ivid.kr</td>
                     </tr>
               </tbody>
            </table>
         </table>
      </body>
   </html>
   `;
   
   // Create the SMTP transport.
   let transporter = nodemailer.createTransport({
      host: smtpEndpoint,
      port: port,
      secure: false, // true for 465, false for other ports
      auth: {
         user: smtpUsername,
         pass: smtpPassword
      }
   });

   // Specify the fields in the email.
   let mailOptions = {
      from: senderAddress,
      to: toAddresses,
      subject: subject,
      html: body_html,
   };

   // Send the email.
   let info = await transporter.sendMail(mailOptions)

   if(info.messageId != undefined){
      result = true;
   }
   
   return result;
}

const confirmCheckUserEmail = async (aIndex,qIndex,wIndex,eIndex,rIndex,tIndex,yIndex,iIndex,emailTitle) => {
   let result = false;

   const smtpEndpoint = "email-smtp.ap-northeast-2.amazonaws.com";
   const port = 587;
   const senderAddress = "스루 관리자<contract@ivid.kr>";
   var toAddresses = aIndex;
   const smtpUsername = "AKIA55SPEYY6PQKGIGF7";
   const smtpPassword = "BArP6VJI00nUvsoLLvHJ/vuiDsT70pnNkRn6JshFG3qd";
   var subject = emailTitle;
   var body_html = 
   `
   <!DOCTYPE html>
      <html lang="ko">
      <head>
         <meta charset="UTF-8">
         <meta http-equiv="X-UA-Compatible" content="IE=edge">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <title>pass</title>
         <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
         <style>
            /* * {
               padding: 0;
               box-sizing: border-box;
               font-family: 'Noto Sans KR', sans-serif;
               margin: 0 auto;
            } */
         </style>
      </head>
      <body style="background: #f5f4f2; width: 100%; margin: 50px 0; padding: 0 10%; box-sizing: border-box;" >
         <table>
            <table style="background: #fff; width: 100%; padding-top: 80px; border-spacing: 0; box-shadow: 2px 2px 8px 0 #ddd; ">
               <thead>
                     <tr>
                        <th style="height:32px; text-align: left;">
                           <img class="barIcon" width="56px" height="32px" style="height:6px; margin-left: -7px; transform: translate(0, -180%);"  src="https://api.ivid.kr/ceo/useless/38.png" alt="바아이콘">   
                           <img class="throo_logo" width="92px" height="32px" src="https://api.ivid.kr/ceo/useless/12.png" alt="스루로고">   
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 16px 55px 24px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 22px; font-weight: bold; color: #222;">
                           ${emailTitle}
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 0 55px 16px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #333;">
                           ${qIndex}
                           <br />
                           ${wIndex}
                           <br />
                           <br />
                           <br />
                           ${eIndex}
                           <br />
                           <br />
                           ${rIndex}
                           <br />
                           <br />
                           ${tIndex}
                           <br />
                           <br />
                           ${yIndex}
                           <br />
                           ${iIndex}
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%; text-align: left; padding: 0 55px 52px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #707070; border-bottom: 1px solid #ddd;">
                           감사합니다.
                        </th>
                     </tr>
               </thead>
               <tbody style="background: #f1f1f1; ">
                     <tr>
                        <td>
                           <table style="background: #fff; margin:36px 57px;">
                                 <tr >
                                    <td style="padding:12px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px; font-weight: 500; color: #000;">
                                       스루 주문접속 프로그램(POS) 다운받기
                                    </td>
                                 </tr>
                                 <tr >
                                    <td style="padding:0 12px 12px 12px;">
                                       <a href="https://api-stg.ivid.kr/throoposdl" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3; margin-right: 40px;">PC 버전</a>
                                    </td>
                                 </tr>
                                 <tr >
                                    <td style="padding:0 12px 12px 12px;">
                                       <a href="https://play.google.com/store/apps/details?id=kr.throo.pos" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3;">안드로이드 버전</a>
                                    </td>
                                 </tr>
                           </table>
                        </td>
                     </tr>
                     <tr>
                        <td style="font-size: 15px; font-weight: bold; color: #bbb; padding: 0 60px 28px 60px">INVISIBLEIDEAS</td>
                     </tr>
               </tbody>
            </table>
            <table class="footer" style="width: 100%;">
               <thead style="width: 100%;">
                     <tr class="footer-logo">
                        <th style="padding: 23px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 700;">
                           사장님! 궁금하신점은 지금 상담하세요.                   
                        </th>
                     </tr>
               </thead>
               <tbody style="width: 100%;">
                     <tr>
                        <td style="text-align: center;"><a href="http://pf.kakao.com/_tzxkNK/chat"><img src="https://api.ivid.kr/ceo/useless/25.png" width="280px" height="64px"  alt="카카오톡 상담하기"></a></td>
                     </tr>
                     <tr>
                        <td style="padding: 26px 0 16px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">
                           이 메일은 스루 서비스를 이용하기 위해 꼭 필요한 내용으로 정보통신망 이용촉진 및 정보보호 등에 관한 법률에 따라 마케팅 메시지 수신동의 여부와 무관하게 발송되었습니다.
                        </td>
                     </tr>
                     <tr>
                        <td style="padding: 0 0 12px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">스루  |  서울 서초구 서초대로 398 플래티넘타워 7층  |  인비저블아이디어(주)  |  partners@ivid.kr</td>
                     </tr>
               </tbody>
            </table>
         </table>
      </body>
   </html>
   `;
   
   // Create the SMTP transport.
   let transporter = nodemailer.createTransport({
      host: smtpEndpoint,
      port: port,
      secure: false, // true for 465, false for other ports
      auth: {
         user: smtpUsername,
         pass: smtpPassword
      }
   });

   // Specify the fields in the email.
   let mailOptions = {
      from: senderAddress,
      to: toAddresses,
      subject: subject,
      html: body_html,
   };

   // Send the email.
   let info = await transporter.sendMail(mailOptions)

   if(info.messageId != undefined){
      result = true;
   }
   
   return result;
}

const sendEmail = async (cIndex,aIndex) => {
   let result = false;

   const smtpEndpoint = "email-smtp.ap-northeast-2.amazonaws.com";
   const port = 587;
   const senderAddress = "스루 관리자<contract@ivid.kr>";
   var toAddresses = "partners@ivid.kr";
   const smtpUsername = "AKIA55SPEYY6PQKGIGF7";
   const smtpPassword = "BArP6VJI00nUvsoLLvHJ/vuiDsT70pnNkRn6JshFG3qd";
   var subject = `${cIndex}`;
   var body_html = 
   `
   <!DOCTYPE html>
      <html lang="ko">
      <head>
         <meta charset="UTF-8">
         <meta http-equiv="X-UA-Compatible" content="IE=edge">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <title>pass</title>
         <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
         <style>
            /* * {
               padding: 0;
               box-sizing: border-box;
               font-family: 'Noto Sans KR', sans-serif;
               margin: 0 auto;
            } */
         </style>
      </head>
      <body style="background: #f5f4f2; width: 100%; margin: 50px 0; padding: 0 10%; box-sizing: border-box;" >
         <table>
            <table style="background: #fff; width: 100%; padding-top: 80px; border-spacing: 0; box-shadow: 2px 2px 8px 0 #ddd; ">
               <thead>
                     <tr>
                        <th style="height:32px; text-align: left;">
                           <img class="barIcon" width="56px" height="32px" style="height:6px; margin-left: -7px; transform: translate(0, -180%);"  src="https://api.ivid.kr/ceo/useless/38.png" alt="바아이콘">   
                           <img class="throo_logo" width="92px" height="32px" src="https://api.ivid.kr/ceo/useless/12.png" alt="스루로고">   
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 16px 55px 24px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 22px; font-weight: bold; color: #222;">
                           이벤트 : 입점 신청 EVENT 우리 매장 홍보 아이템.
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 0 55px 16px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #333;">
                           신청날짜 : ${moment().format('YYYY-MM-DD')} 신청물품 : ${aIndex}
                           <br />
                           ${cIndex}에서 입점 신청 EVENT 우리 매장 홍보 아이템 신청하였습니다.
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%; text-align: left; padding: 0 55px 52px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #707070; border-bottom: 1px solid #ddd;">
                           감사합니다.
                        </th>
                     </tr>
               </thead>
               <tbody style="background: #f1f1f1; ">
                     <tr>
                        <td>
                           <table style="background: #fff; margin:36px 57px;">
                                 <tr >
                                    <td style="padding:12px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px; font-weight: 500; color: #000;">
                                       스루 주문접속 프로그램(POS) 다운받기
                                    </td>
                                 </tr>
                                 <tr >
                                    <td style="padding:0 12px 12px 12px;">
                                       <a href="https://api-stg.ivid.kr/throoposdl" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3; margin-right: 40px;">PC 버전</a>
                                    </td>
                                 </tr>
                                 <tr >
                                    <td style="padding:0 12px 12px 12px;">
                                       <a href="https://play.google.com/store/apps/details?id=kr.throo.pos" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3;">안드로이드 버전</a>
                                    </td>
                                 </tr>
                           </table>
                        </td>
                     </tr>
                     <tr>
                        <td style="font-size: 15px; font-weight: bold; color: #bbb; padding: 0 60px 28px 60px">INVISIBLEIDEAS</td>
                     </tr>
               </tbody>
            </table>
            <table class="footer" style="width: 100%;">
               <thead style="width: 100%;">
                     <tr class="footer-logo">
                        <th style="padding: 23px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 700;">
                           사장님! 궁금하신점은 지금 상담하세요.                   
                        </th>
                     </tr>
               </thead>
               <tbody style="width: 100%;">
                     <tr>
                        <td style="text-align: center;"><a href="http://pf.kakao.com/_tzxkNK/chat"><img src="https://api.ivid.kr/ceo/useless/25.png" width="280px" height="64px"  alt="카카오톡 상담하기"></a></td>
                     </tr>
                     <tr>
                        <td style="padding: 26px 0 16px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">
                           이 메일은 스루 서비스를 이용하기 위해 꼭 필요한 내용으로 정보통신망 이용촉진 및 정보보호 등에 관한 법률에 따라 마케팅 메시지 수신동의 여부와 무관하게 발송되었습니다.
                        </td>
                     </tr>
                     <tr>
                        <td style="padding: 0 0 12px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">스루  |  서울 서초구 서초대로 398 플래티넘타워 7층  |  인비저블아이디어(주)  |  partners@ivid.kr</td>
                     </tr>
               </tbody>
            </table>
         </table>
      </body>
   </html>
   `;
   
   // Create the SMTP transport.
   let transporter = nodemailer.createTransport({
      host: smtpEndpoint,
      port: port,
      secure: false, // true for 465, false for other ports
      auth: {
         user: smtpUsername,
         pass: smtpPassword
      }
   });

   // Specify the fields in the email.
   let mailOptions = {
      from: senderAddress,
      to: toAddresses,
      subject: subject,
      html: body_html,
   };

   // Send the email.
   let info = await transporter.sendMail(mailOptions)

   if(info.messageId != undefined){
      result = true;
   }
   
   return result;
}

const completeSignUpEmail = async (cIndex) => {
   let result = false;

   const smtpEndpoint = "email-smtp.ap-northeast-2.amazonaws.com";
   const port = 587;
   const senderAddress = "스루 관리자<contract@ivid.kr>";
   var toAddresses = "partners@ivid.kr";
   const smtpUsername = "AKIA55SPEYY6PQKGIGF7";
   const smtpPassword = "BArP6VJI00nUvsoLLvHJ/vuiDsT70pnNkRn6JshFG3qd";
   var subject = `${cIndex}에서 영업을 시작하였습니다`;
   var body_html = 
   `
   <!DOCTYPE html>
      <html lang="ko">
      <head>
         <meta charset="UTF-8">
         <meta http-equiv="X-UA-Compatible" content="IE=edge">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <title>pass</title>
         <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
         <style>
            /* * {
               padding: 0;
               box-sizing: border-box;
               font-family: 'Noto Sans KR', sans-serif;
               margin: 0 auto;
            } */
         </style>
      </head>
      <body style="background: #f5f4f2; width: 100%; margin: 50px 0; padding: 0 10%; box-sizing: border-box;" >
         <table>
            <table style="background: #fff; width: 100%; padding-top: 80px; border-spacing: 0; box-shadow: 2px 2px 8px 0 #ddd; ">
               <thead>
                     <tr>
                        <th style="height:32px; text-align: left;">
                           <img class="barIcon" width="56px" height="32px" style="height:6px; margin-left: -7px; transform: translate(0, -180%);"  src="https://api.ivid.kr/ceo/useless/38.png" alt="바아이콘">   
                           <img class="throo_logo" width="92px" height="32px" src="https://api.ivid.kr/ceo/useless/12.png" alt="스루로고">   
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 16px 55px 24px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 22px; font-weight: bold; color: #222;">
                        ${cIndex}에서 영업을 시작하였습니다.
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 0 55px 16px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #333;">
                           시작날짜 : ${moment().format('YYYY-MM-DD')}
                           <br />
                           ${cIndex}에서 영업을 위한 모든 준비가 완료되었으며 영업을 시작하였습니다.
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%; text-align: left; padding: 0 55px 52px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #707070; border-bottom: 1px solid #ddd;">
                           감사합니다.
                        </th>
                     </tr>
               </thead>
               <tbody style="background: #f1f1f1; ">
                     <tr>
                        <td>
                           <table style="background: #fff; margin:36px 57px;">
                                 <tr >
                                    <td style="padding:12px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px; font-weight: 500; color: #000;">
                                       스루 주문접속 프로그램(POS) 다운받기
                                    </td>
                                 </tr>
                                 <tr >
                                    <td style="padding:0 12px 12px 12px;">
                                       <a href="https://api-stg.ivid.kr/throoposdl" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3; margin-right: 40px;">PC 버전</a>
                                    </td>
                                 </tr>
                                 <tr >
                                    <td style="padding:0 12px 12px 12px;">
                                       <a href="https://play.google.com/store/apps/details?id=kr.throo.pos" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3;">안드로이드 버전</a>
                                    </td>
                                 </tr>
                           </table>
                        </td>
                     </tr>
                     <tr>
                        <td style="font-size: 15px; font-weight: bold; color: #bbb; padding: 0 60px 28px 60px">INVISIBLEIDEAS</td>
                     </tr>
               </tbody>
            </table>
            <table class="footer" style="width: 100%;">
               <thead style="width: 100%;">
                     <tr class="footer-logo">
                        <th style="padding: 23px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 700;">
                           사장님! 궁금하신점은 지금 상담하세요.                   
                        </th>
                     </tr>
               </thead>
               <tbody style="width: 100%;">
                     <tr>
                        <td style="text-align: center;"><a href="http://pf.kakao.com/_tzxkNK/chat"><img src="https://api.ivid.kr/ceo/useless/25.png" width="280px" height="64px"  alt="카카오톡 상담하기"></a></td>
                     </tr>
                     <tr>
                        <td style="padding: 26px 0 16px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">
                           이 메일은 스루 서비스를 이용하기 위해 꼭 필요한 내용으로 정보통신망 이용촉진 및 정보보호 등에 관한 법률에 따라 마케팅 메시지 수신동의 여부와 무관하게 발송되었습니다.
                        </td>
                     </tr>
                     <tr>
                        <td style="padding: 0 0 12px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">스루  |  서울 서초구 서초대로 398 플래티넘타워 7층  |  인비저블아이디어(주)  |  partners@ivid.kr</td>
                     </tr>
               </tbody>
            </table>
         </table>
      </body>
   </html>
   `;
   
   // Create the SMTP transport.
   let transporter = nodemailer.createTransport({
      host: smtpEndpoint,
      port: port,
      secure: false, // true for 465, false for other ports
      auth: {
         user: smtpUsername,
         pass: smtpPassword
      }
   });

   // Specify the fields in the email.
   let mailOptions = {
      from: senderAddress,
      to: toAddresses,
      subject: subject,
      html: body_html,
   };

   // Send the email.
   let info = await transporter.sendMail(mailOptions)

   if(info.messageId != undefined){
      result = true;
   }
   
   return result;
}

const inquireEmail = async (aIndex) => {
    let result = false;
 
    const smtpEndpoint = "email-smtp.ap-northeast-2.amazonaws.com";
    const port = 587;
    const senderAddress = "스루 관리자<contract@ivid.kr>";
    var toAddresses = aIndex;
    const smtpUsername = "AKIA55SPEYY6PQKGIGF7";
    const smtpPassword = "BArP6VJI00nUvsoLLvHJ/vuiDsT70pnNkRn6JshFG3qd";
    var subject = `스루 담당자가 사장님의 입점 문의를 확인하였습니다 곧 연락드리겠습니다.`;
    var body_html = 
    `
    <!DOCTYPE html>
      <html lang="ko">
      <head>
         <meta charset="UTF-8">
         <meta http-equiv="X-UA-Compatible" content="IE=edge">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <title>pass</title>
         <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
         <style>
            /* * {
               padding: 0;
               box-sizing: border-box;
               font-family: 'Noto Sans KR', sans-serif;
               margin: 0 auto;
            } */
         </style>
      </head>
      <body style="background: #f5f4f2; width: 100%; margin: 50px 0; padding: 0 10%; box-sizing: border-box;" >
         <table>
            <table style="background: #fff; width: 100%; padding-top: 80px; border-spacing: 0; box-shadow: 2px 2px 8px 0 #ddd; ">
               <thead>
                     <tr>
                        <th style="height:32px; text-align: left;">
                           <img class="barIcon" width="56px" height="32px" style="height:6px; margin-left: -7px; transform: translate(0, -180%);"  src="https://api.ivid.kr/ceo/useless/38.png" alt="바아이콘">   
                           <img class="throo_logo" width="92px" height="32px" src="https://api.ivid.kr/ceo/useless/12.png" alt="스루로고">   
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 16px 55px 24px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 22px; font-weight: bold; color: #222;">
                           스루에 문의해 주셔서 감사드립니다!
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 0 55px 16px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #333;">
                           안녕하세요, 스루입니다. 
                           <br />
                           저희 서비스에 관심 가져주시고 문의 주셔서 감사합니다!
                           <br />
                           해당 문의 사항은 담당자가 평균적으로 문의 시점 기준 다음 영업일에 즉시 유선 연락 드립니다. 
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%; text-align: left; padding: 0 55px 52px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #707070; border-bottom: 1px solid #ddd;">
                           카카오톡 채널 '스루 사장님 창구'에서 자주 묻는 질문을 확인하실 수 있습니다. 
                           *카카오톡 친구 > 검색 > 스루 > 목록에서 스루 사장님 창구 채널 추가 
                           <br />
                           <br />
                           <br />
                           감사합니다.
                        </th>
                     </tr>
               </thead>
               <tbody style="background: #f1f1f1; ">
                     <tr>
                        <td>
                           <table style="background: #fff; margin:36px 57px;">
                                 <tr >
                                    <td style="padding:12px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px; font-weight: 500; color: #000;">
                                       스루 주문접속 프로그램(POS) 다운받기
                                    </td>
                                 </tr>
                                 <tr >
                                    <td style="padding:0 12px 12px 12px;">
                                       <a href="https://api-stg.ivid.kr/throoposdl" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3; margin-right: 40px;">PC 버전</a>
                                    </td>
                                 </tr>
                                 <tr >
                                    <td style="padding:0 12px 12px 12px;">
                                       <a href="https://play.google.com/store/apps/details?id=kr.throo.pos" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3;">안드로이드 버전</a>
                                    </td>
                                 </tr>
                           </table>
                        </td>
                     </tr>
                     <tr>
                        <td style="font-size: 15px; font-weight: bold; color: #bbb; padding: 0 60px 28px 60px">INVISIBLEIDEAS</td>
                     </tr>
               </tbody>
            </table>
            <table class="footer" style="width: 100%;">
               <thead style="width: 100%;">
                     <tr class="footer-logo">
                        <th style="padding: 23px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 700;">
                           사장님! 궁금하신점은 지금 상담하세요.                   
                        </th>
                     </tr>
               </thead>
               <tbody style="width: 100%;">
                     <tr>
                        <td style="text-align: center;"><a href="http://pf.kakao.com/_tzxkNK/chat"><img src="https://api.ivid.kr/ceo/useless/25.png" width="280px" height="64px"  alt="카카오톡 상담하기"></a></td>
                     </tr>
                     <tr>
                        <td style="padding: 26px 0 16px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">
                           이 메일은 스루 서비스를 이용하기 위해 꼭 필요한 내용으로 정보통신망 이용촉진 및 정보보호 등에 관한 법률에 따라 마케팅 메시지 수신동의 여부와 무관하게 발송되었습니다.
                        </td>
                     </tr>
                     <tr>
                        <td style="padding: 0 0 12px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">스루  |  서울 서초구 서초대로 398 플래티넘타워 7층  |  인비저블아이디어(주)  |  partners@ivid.kr</td>
                     </tr>
               </tbody>
            </table>
         </table>
      </body>
   </html>
    `
    ;
    
    // Create the SMTP transport.
    let transporter = nodemailer.createTransport({
        host: smtpEndpoint,
        port: port,
        secure: false, // true for 465, false for other ports
        auth: {
            user: smtpUsername,
            pass: smtpPassword
        }
    });

    // Specify the fields in the email.
    let mailOptions = {
        from: senderAddress,
        to: toAddresses,
        subject: subject,
        html: body_html,
    };

    // Send the email.
    let info = await transporter.sendMail(mailOptions)

    if(info.messageId != undefined){
        result = true;
    }

    return result;
}

const settlementEmail = async (aIndex,sIndex,bIndex,xParam) => {
    let result = false;
 
    const smtpEndpoint = "email-smtp.ap-northeast-2.amazonaws.com";
    const port = 587;
    const senderAddress = "스루 관리자<partners@ivid.kr>";
    var ccAddresses = "partners@ivid.kr";
    var toAddresses = aIndex;
    const smtpUsername = "AKIA55SPEYY6PQKGIGF7";
    const smtpPassword = "BArP6VJI00nUvsoLLvHJ/vuiDsT70pnNkRn6JshFG3qd";
    var subject = `[스루] ${sIndex}의 ${xParam} 스루 정산 명세서입니다`;
    var body_html = 
    `
    <!DOCTYPE html>
      <html lang="ko">
      <head>
         <meta charset="UTF-8">
         <meta http-equiv="X-UA-Compatible" content="IE=edge">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <title>pass</title>
         <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
         <style>
            /* * {
               padding: 0;
               box-sizing: border-box;
               font-family: 'Noto Sans KR', sans-serif;
               margin: 0 auto;
            } */
         </style>
      </head>
      <body style="background: #f5f4f2; width: 100%; margin: 50px 0; padding: 0 10%; box-sizing: border-box;" >
         <table>
            <table style="background: #fff; width: 100%; padding-top: 80px; border-spacing: 0; box-shadow: 2px 2px 8px 0 #ddd; ">
               <thead>
                     <tr>
                        <th style="height:32px; text-align: left;">
                           <img class="barIcon" width="56px" height="32px" style="height:6px; margin-left: -7px; transform: translate(0, -180%);"  src="https://api.ivid.kr/ceo/useless/38.png" alt="바아이콘">   
                           <img class="throo_logo" width="92px" height="32px" src="https://api.ivid.kr/ceo/useless/12.png" alt="스루로고">   
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 16px 55px 24px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 22px; font-weight: bold; color: #222;">
                           ${xParam} 정산내역 명세서
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 0 55px 16px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #333;">
                           안녕하세요, 스루입니다. 
                           <br />
                           항상 저희 서비스에 관심 가져주셔서 감사합니다
                           <br />
                           ${sIndex}의 ${xParam} 스루 정산내역서 전달드립니다
                           <br />
                           스루에서는 매주 수요일일 정산을하고 있으며
                           <br />
                           매월 정산전 확인차 정산내역서를 전송해드리고 있습니다
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%; text-align: left; padding: 0 55px 52px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #707070; border-bottom: 1px solid #ddd;">
                           카카오톡 채널 '스루 사장님 창구'에서 자주 묻는 질문을 확인하실 수 있습니다. 
                           *카카오톡 친구 > 검색 > 스루 > 목록에서 스루 사장님 창구 채널 추가 
                           <br />
                           <br />
                           <br />
                           감사합니다.
                        </th>
                     </tr>
               </thead>
               <tbody style="background: #f1f1f1; ">
                     <tr>
                        <td>
                           <table style="background: #fff; margin:36px 57px;">
                                 <tr >
                                    <td style="padding:12px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px; font-weight: 500; color: #000;">
                                       스루 주문접속 프로그램(POS) 다운받기
                                    </td>
                                 </tr>
                                 <tr >
                                    <td style="padding:0 12px 12px 12px;">
                                       <a href="https://api-stg.ivid.kr/throoposdl" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3; margin-right: 40px;">PC 버전</a>
                                    </td>
                                 </tr>
                                 <tr >
                                    <td style="padding:0 12px 12px 12px;">
                                       <a href="https://play.google.com/store/apps/details?id=kr.throo.pos" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3;">안드로이드 버전</a>
                                    </td>
                                 </tr>
                           </table>
                        </td>
                     </tr>
                     <tr>
                        <td style="font-size: 15px; font-weight: bold; color: #bbb; padding: 0 60px 28px 60px">INVISIBLEIDEAS</td>
                     </tr>
               </tbody>
            </table>
            <table class="footer" style="width: 100%;">
               <thead style="width: 100%;">
                     <tr class="footer-logo">
                        <th style="padding: 23px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 700;">
                           사장님! 궁금하신점은 지금 상담하세요.                   
                        </th>
                     </tr>
               </thead>
               <tbody style="width: 100%;">
                     <tr>
                        <td style="text-align: center;"><a href="http://pf.kakao.com/_tzxkNK/chat"><img src="https://api.ivid.kr/ceo/useless/25.png" width="280px" height="64px"  alt="카카오톡 상담하기"></a></td>
                     </tr>
                     <tr>
                        <td style="padding: 26px 0 16px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">
                           이 메일은 스루 서비스를 이용하기 위해 꼭 필요한 내용으로 정보통신망 이용촉진 및 정보보호 등에 관한 법률에 따라 마케팅 메시지 수신동의 여부와 무관하게 발송되었습니다.
                        </td>
                     </tr>
                     <tr>
                        <td style="padding: 0 0 12px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">스루  |  서울 서초구 서초대로 398 플래티넘타워 7층  |  인비저블아이디어(주)  |  partners@ivid.kr</td>
                     </tr>
               </tbody>
            </table>
         </table>
      </body>
   </html>
    `;
    
    // Create the SMTP transport.
    let transporter = nodemailer.createTransport({
        host: smtpEndpoint,
        port: port,
        secure: false, // true for 465, false for other ports
        auth: {
            user: smtpUsername,
            pass: smtpPassword
        }
    });

    // Specify the fields in the email.
    let mailOptions = {
        from: senderAddress,
        to: toAddresses,
        subject: subject,
        cc: ccAddresses,
        html: body_html,
        attachments: [
            { filename: "throo_X_" + sIndex + ".xlsx", path: bIndex }
        ],
    };

    // Send the email.
    let info = await transporter.sendMail(mailOptions)

    if(info.messageId != undefined){
        result = true;
    }

    return result;
}


const welcomeEmailStore = async (aIndex,sIndex) => {
   let result = false;

   const smtpEndpoint = "email-smtp.ap-northeast-2.amazonaws.com";
   const port = 587;
   const senderAddress = "스루 관리자<partners@ivid.kr>";
   var ccAddresses = "contract@ivid.kr";
   var toAddresses = aIndex;
   const smtpUsername = "AKIA55SPEYY6PQKGIGF7";
   const smtpPassword = "BArP6VJI00nUvsoLLvHJ/vuiDsT70pnNkRn6JshFG3qd";
   var subject = `[스루] 스루 입점가입을 축하드립니다!`;
   var body_html = 
   `
   <!DOCTYPE html>
      <html lang="ko">
      <head>
         <meta charset="UTF-8">
         <meta http-equiv="X-UA-Compatible" content="IE=edge">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <title>pass</title>
         <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
         <style>
            /* * {
               padding: 0;
               box-sizing: border-box;
               font-family: 'Noto Sans KR', sans-serif;
               margin: 0 auto;
            } */
         </style>
      </head>
      <body style="background: #f5f4f2; width: 100%; margin: 50px 0; padding: 0 10%; box-sizing: border-box;" >
         <table>
            <table style="background: #fff; width: 100%; padding-top: 80px; border-spacing: 0; box-shadow: 2px 2px 8px 0 #ddd; ">
               <thead>
                     <tr>
                        <th style="height:32px; text-align: left;">
                           <img class="barIcon" width="56px" height="32px" style="height:6px; margin-left: -7px; transform: translate(0, -180%);"  src="https://api.ivid.kr/ceo/useless/38.png" alt="바아이콘">   
                           <img class="throo_logo" width="92px" height="32px" src="https://api.ivid.kr/ceo/useless/12.png" alt="스루로고">   
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 16px 55px 24px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 22px; font-weight: bold; color: #222;">
                           안녕하세요 ${sIndex}님 스루에 입점하신 것을 환영합니다.
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 0 55px 16px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #333;">
                           스루는 차량고객이 일반 매장도 드라이브스루처럼
                           이용할 수 있는 픽업 주문 앱 서비스입니다.
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%; text-align: left; padding: 0 55px 16px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #707070;">
                           포스와 프린트 이용 설명서를 보내드립니다 첨부파일을 클릭해서 확인해주세요.
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%; text-align: left; padding: 0 55px 52px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #707070; border-bottom: 1px solid #ddd;">
                           카카오톡 채널 '스루 사장님 창구'에서 자주 묻는 질문을 확인하실 수 있습니다. 
                           *카카오톡 친구 > 검색 > 스루 > 목록에서 스루 사장님 창구 채널 추가 
                           <br />
                           <br />
                           <br />
                           감사합니다.
                        </th>
                     </tr>
               </thead>
               <tbody style="background: #f1f1f1; ">
                     <tr>
                        <td>
                           <table style="background: #fff; margin:36px 57px;">
                                 <tr >
                                    <td style="padding:12px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px; font-weight: 500; color: #000;">
                                       스루 주문접속 프로그램(POS) 다운받기
                                    </td>
                                 </tr>
                                 <tr >
                                    <td style="padding:0 12px 12px 12px;">
                                       <a href="https://api-stg.ivid.kr/throoposdl" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3; margin-right: 40px;">PC 버전</a>
                                    </td>
                                 </tr>
                                 <tr >
                                    <td style="padding:0 12px 12px 12px;">
                                       <a href="https://play.google.com/store/apps/details?id=kr.throo.pos" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3;">안드로이드 버전</a>
                                    </td>
                                 </tr>
                           </table>
                        </td>
                     </tr>
                     <tr>
                        <td style="font-size: 15px; font-weight: bold; color: #bbb; padding: 0 60px 28px 60px">INVISIBLEIDEAS</td>
                     </tr>
               </tbody>
            </table>
            <table class="footer" style="width: 100%;">
               <thead style="width: 100%;">
                     <tr class="footer-logo">
                        <th style="padding: 23px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 700;">
                           사장님! 궁금하신점은 지금 상담하세요.                   
                        </th>
                     </tr>
               </thead>
               <tbody style="width: 100%;">
                     <tr>
                        <td style="text-align: center;"><a href="http://pf.kakao.com/_tzxkNK/chat"><img src="https://api.ivid.kr/ceo/useless/25.png" width="280px" height="64px"  alt="카카오톡 상담하기"></a></td>
                     </tr>
                     <tr>
                        <td style="padding: 26px 0 16px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">
                           이 메일은 스루 서비스를 이용하기 위해 꼭 필요한 내용으로 정보통신망 이용촉진 및 정보보호 등에 관한 법률에 따라 마케팅 메시지 수신동의 여부와 무관하게 발송되었습니다.
                        </td>
                     </tr>
                     <tr>
                        <td style="padding: 0 0 12px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">스루  |  서울 서초구 서초대로 398 플래티넘타워 7층  |  인비저블아이디어(주)  |  partners@ivid.kr</td>
                     </tr>
               </tbody>
            </table>
         </table>
      </body>
   </html>
   `;
   
   // Create the SMTP transport.
   let transporter = nodemailer.createTransport({
       host: smtpEndpoint,
       port: port,
       secure: false, // true for 465, false for other ports
       auth: {
           user: smtpUsername,
           pass: smtpPassword
       }
   });

   // Specify the fields in the email.
   let mailOptions = {
       from: senderAddress,
       to: toAddresses,
       subject: subject,
       cc: ccAddresses,
       html: body_html,
       attachments: [
           { filename: "스루 포스 가이드.pdf", path: process.cwd() + '/public/contractForm/throo_pos.pdf' },
           { filename: "스루 프린터 설정 방법.pdf", path: process.cwd() + '/public/contractForm/throo_printer.pdf' },
       ],
   };

   // Send the email.
   let info = await transporter.sendMail(mailOptions)

   if(info.messageId != undefined){
       result = true;
   }

   return result;
}

const inquireToEmail = async (storeName,sTitle,sPhoneNm,sText) => {
   let result = false;

   const smtpEndpoint = "email-smtp.ap-northeast-2.amazonaws.com";
   const port = 587;
   const senderAddress = "스루 관리자<contract@ivid.kr>";
   var toAddresses = "partners@ivid.kr";
   const smtpUsername = "AKIA55SPEYY6PQKGIGF7";
   const smtpPassword = "BArP6VJI00nUvsoLLvHJ/vuiDsT70pnNkRn6JshFG3qd";
   var subject = `${sTitle}`;
   var body_html = 
   `
   <!DOCTYPE html>
      <html lang="ko">
      <head>
         <meta charset="UTF-8">
         <meta http-equiv="X-UA-Compatible" content="IE=edge">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <title>pass</title>
         <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
         <style>
            /* * {
               padding: 0;
               box-sizing: border-box;
               font-family: 'Noto Sans KR', sans-serif;
               margin: 0 auto;
            } */
         </style>
      </head>
      <body style="background: #f5f4f2; width: 100%; margin: 50px 0; padding: 0 10%; box-sizing: border-box;" >
         <table>
            <table style="background: #fff; width: 100%; padding-top: 80px; border-spacing: 0; box-shadow: 2px 2px 8px 0 #ddd; ">
               <thead>
                     <tr>
                        <th style="height:32px; text-align: left;">
                           <img class="barIcon" width="56px" height="32px" style="height:6px; margin-left: -7px; transform: translate(0, -180%);"  src="https://api.ivid.kr/ceo/useless/38.png" alt="바아이콘">   
                           <img class="throo_logo" width="92px" height="32px" src="https://api.ivid.kr/ceo/useless/12.png" alt="스루로고">   
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 16px 55px 24px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 22px; font-weight: bold; color: #222;">
                           ${sTitle}
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%;  text-align: left; padding: 0 55px 16px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #333;">
                           신청날짜 : ${moment().format('YYYY-MM-DD')} 전화번호 : ${sPhoneNm}
                           <br />
                           ${storeName}에서 입점 문의가 들어왔습니다.
                        </th>
                     </tr>
                     <tr>
                        <th style="width: 100%; text-align: left; padding: 0 55px 52px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #707070; border-bottom: 1px solid #ddd;">
                           ${sText}
                        </th>
                     </tr>
               </thead>
               <tbody style="background: #f1f1f1; ">
                     <tr>
                        <td>
                           <table style="background: #fff; margin:36px 57px;">
                                 <tr >
                                    <td style="padding:12px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px; font-weight: 500; color: #000;">
                                       스루 주문접속 프로그램(POS) 다운받기
                                    </td>
                                 </tr>
                                 <tr >
                                    <td style="padding:0 12px 12px 12px;">
                                       <a href="https://api-stg.ivid.kr/throoposdl" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3; margin-right: 40px;">PC 버전</a>
                                    </td>
                                 </tr>
                                 <tr >
                                    <td style="padding:0 12px 12px 12px;">
                                       <a href="https://play.google.com/store/apps/details?id=kr.throo.pos" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3;">안드로이드 버전</a>
                                    </td>
                                 </tr>
                           </table>
                        </td>
                     </tr>
                     <tr>
                        <td style="font-size: 15px; font-weight: bold; color: #bbb; padding: 0 60px 28px 60px">INVISIBLEIDEAS</td>
                     </tr>
               </tbody>
            </table>
            <table class="footer" style="width: 100%;">
               <thead style="width: 100%;">
                     <tr class="footer-logo">
                        <th style="padding: 23px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 700;">
                           사장님! 궁금하신점은 지금 상담하세요.                   
                        </th>
                     </tr>
               </thead>
               <tbody style="width: 100%;">
                     <tr>
                        <td style="text-align: center;"><a href="http://pf.kakao.com/_tzxkNK/chat"><img src="https://api.ivid.kr/ceo/useless/25.png" width="280px" height="64px"  alt="카카오톡 상담하기"></a></td>
                     </tr>
                     <tr>
                        <td style="padding: 26px 0 16px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">
                           이 메일은 스루 서비스를 이용하기 위해 꼭 필요한 내용으로 정보통신망 이용촉진 및 정보보호 등에 관한 법률에 따라 마케팅 메시지 수신동의 여부와 무관하게 발송되었습니다.
                        </td>
                     </tr>
                     <tr>
                        <td style="padding: 0 0 12px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">스루  |  서울 서초구 서초대로 398 플래티넘타워 7층  |  인비저블아이디어(주)  |  partners@ivid.kr</td>
                     </tr>
               </tbody>
            </table>
         </table>
      </body>
   </html>
   `;
   
   // Create the SMTP transport.
   let transporter = nodemailer.createTransport({
      host: smtpEndpoint,
      port: port,
      secure: false, // true for 465, false for other ports
      auth: {
         user: smtpUsername,
         pass: smtpPassword
      }
   });

   // Specify the fields in the email.
   let mailOptions = {
      from: senderAddress,
      to: toAddresses,
      subject: subject,
      html: body_html,
   };

   // Send the email.
   let info = await transporter.sendMail(mailOptions)

   if(info.messageId != undefined){
      result = true;
   }
   
   return result;
}

const adminConfirmMail = async (aIndex,cIndex) => {
   let result = false;

   const smtpEndpoint = "email-smtp.ap-northeast-2.amazonaws.com";
   const port = 587;
   const senderAddress = "스루 관리자<contract@ivid.kr>";
   var toAddresses = aIndex;
   const smtpUsername = "AKIA55SPEYY6PQKGIGF7";
   const smtpPassword = "BArP6VJI00nUvsoLLvHJ/vuiDsT70pnNkRn6JshFG3qd";
   var subject = `스루 ADMIN접속 본인 확인`;
   var body_html = 
   `
   <!DOCTYPE html>
   <html lang="ko">
   <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>pass</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
      <style>
         /* * {
            padding: 0;
            box-sizing: border-box;
            font-family: 'Noto Sans KR', sans-serif;
            margin: 0 auto;
         } */
      </style>
   </head>
   <body style="background: #f5f4f2; width: 100%; margin: 50px 0; padding: 0 10%; box-sizing: border-box;" >
      <table>
         <table style="background: #fff; width: 100%; padding-top: 80px; border-spacing: 0; box-shadow: 2px 2px 8px 0 #ddd; ">
            <thead>
                  <tr>
                     <th style="height:32px; text-align: left;">
                        <img class="barIcon" width="56px" height="32px" style="height:6px; margin-left: -7px; transform: translate(0, -180%);"  src="https://api.ivid.kr/ceo/useless/38.png" alt="바아이콘">   
                        <img class="throo_logo" width="92px" height="32px" src="https://api.ivid.kr/ceo/useless/12.png" alt="스루로고">   
                     </th>
                  </tr>
                  <tr>
                     <th style="width: 100%;  text-align: left; padding: 16px 55px 24px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 22px; font-weight: bold; color: #222;">
                        본인확인을 위한 정보입니다
                     </th>
                  </tr>
                  <tr>
                     <th style="width: 100%;  text-align: left; padding: 0 55px 16px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #333;">
                        날짜 : ${moment().format('YYYY-MM-DD')}
                        <br />
                        본인확인 숫자 ${cIndex}을 입력하세요
                     </th>
                  </tr>
                  <tr>
                     <th style="width: 100%; text-align: left; padding: 0 55px 52px 55px; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 400; color: #707070; border-bottom: 1px solid #ddd;">
                        감사합니다.
                     </th>
                  </tr>
            </thead>
            <tbody style="background: #f1f1f1; ">
                  <tr>
                     <td>
                        <table style="background: #fff; margin:36px 57px;">
                              <tr >
                                 <td style="padding:12px; font-family: 'Noto Sans KR', sans-serif; font-size: 14px; font-weight: 500; color: #000;">
                                    스루 주문접속 프로그램(POS) 다운받기
                                 </td>
                              </tr>
                              <tr >
                                 <td style="padding:0 12px 12px 12px;">
                                    <a href="https://api-stg.ivid.kr/throoposdl" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3; margin-right: 40px;">PC 버전</a>
                                 </td>
                              </tr>
                              <tr >
                                 <td style="padding:0 12px 12px 12px;">
                                    <a href="https://play.google.com/store/apps/details?id=kr.throo.pos" style="color: #617be3; padding-bottom: 3px; font-family: 'Noto Sans KR', sans-serif; font-size: 18px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #617be3;">안드로이드 버전</a>
                                 </td>
                              </tr>
                        </table>
                     </td>
                  </tr>
                  <tr>
                     <td style="font-size: 15px; font-weight: bold; color: #bbb; padding: 0 60px 28px 60px">INVISIBLEIDEAS</td>
                  </tr>
            </tbody>
         </table>
         <table class="footer" style="width: 100%;">
            <thead style="width: 100%;">
                  <tr class="footer-logo">
                     <th style="padding: 23px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 16px; font-weight: 700;">
                        사장님! 궁금하신점은 지금 상담하세요.                   
                     </th>
                  </tr>
            </thead>
            <tbody style="width: 100%;">
                  <tr>
                     <td style="text-align: center;"><a href="http://pf.kakao.com/_tzxkNK/chat"><img src="https://api.ivid.kr/ceo/useless/25.png" width="280px" height="64px"  alt="카카오톡 상담하기"></a></td>
                  </tr>
                  <tr>
                     <td style="padding: 26px 0 16px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">
                        이 메일은 스루 서비스를 이용하기 위해 꼭 필요한 내용으로 정보통신망 이용촉진 및 정보보호 등에 관한 법률에 따라 마케팅 메시지 수신동의 여부와 무관하게 발송되었습니다.
                     </td>
                  </tr>
                  <tr>
                     <td style="padding: 0 0 12px 0; text-align: center; font-family: 'Noto Sans KR', sans-serif; font-size: 12px; font-weight: 400; word-break: keep-all;">스루  |  서울 서초구 서초대로 398 플래티넘타워 7층  |  인비저블아이디어(주)  |  partners@ivid.kr</td>
                  </tr>
            </tbody>
         </table>
      </table>
   </body>
   </html>
   `;
   
   // Create the SMTP transport.
   let transporter = nodemailer.createTransport({
      host: smtpEndpoint,
      port: port,
      secure: false, // true for 465, false for other ports
      auth: {
         user: smtpUsername,
         pass: smtpPassword
      }
   });

   // Specify the fields in the email.
   let mailOptions = {
      from: senderAddress,
      to: toAddresses,
      subject: subject,
      html: body_html,
   };

   // Send the email.
   let info = await transporter.sendMail(mailOptions)

   if(info.messageId != undefined){
      result = true;
   }
   
   return result;
}

const convincedEmailToOwner1 = async (aIndex,xIndex) => {
   let result = false;

   const smtpEndpoint = "email-smtp.ap-northeast-2.amazonaws.com";
   const port = 587;
   const senderAddress = "스루 관리자<contract@ivid.kr>";
   var toAddresses = aIndex;
   const smtpUsername = "AKIA55SPEYY6PQKGIGF7";
   const smtpPassword = "BArP6VJI00nUvsoLLvHJ/vuiDsT70pnNkRn6JshFG3qd";
   var subject = `드라이브스루 플랫폼 스루의 파트너가 되신걸 환영해요.`;
   var body_html = 
   `
   <!DOCTYPE html>
   <html lang="ko">
   <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>pass</title>
      <link href='//spoqa.github.io/spoqa-han-sans/css/SpoqaHanSans-kr.css' rel='stylesheet' type='text/css'>
   </head>
   <body style= "margin:0; font-family: 'Spoqa Han Sans', 'Spoqa Han Sans JP', 'Sans-serif';  font-size: 18px;" >
      <table class="welcomeMail" style="text-align: left; width: 564px; margin: 0 auto;">
         <thead class="logo">
               <tr>
                  <th style="padding:14px 17px;">
                     <img class="throo_logo" width="86px" height="30px" style="width: auto;" src="https://api.ivid.kr/img/mail/throoLogo.png" alt="스루로고">   
                  </th>
               </tr>
               <tr>
                  <th style="padding:40px 17px 46px 14px; font-size: 20px;">
                     드라이브스루 플랫폼 스루의 파트너가 되신걸 환영해요.
                  </th>
               </tr>
               <tr >
                  <th>
                     <img src="https://api.ivid.kr/img/mail/welcomeImg01.png" alt="스루가입환영이미지">
                  </th>
               </tr>
               <tr>
                  <th style="padding:14px 17px; font-weight: 400;">
                     ${xIndex}님, 스루 파트너 가입이 완료 되었습니다. <br/>
                     사업자 인증후, 바로 영업을 시작해보세요.
                  </th>
               </tr>
               <tr>
                  <th style="padding:17px 17px; font-weight: 700;">
                     스루 간편 입점 프로세스
                  </th>
               </tr>
               <tr>
                  <th style="padding:14px 17px; font-weight: 400;">
                     사업자등록번호 외에는 별도의 서류 첨부 없이 사업자 인증이 가능해요.<br/>
                     *구비서류가 필요할 경우 별도로 연락 드립니다.
                  </th>
               </tr>
         </thead>
         <tbody> 
               <tr>
                  <td style="padding:64px 14px 14px 14px; color: #13166B; font-weight: 700;">
                     파트너님의 입점 단계
                  </td>
               </tr>
               <tr>
                  <td style="padding:24px 14px 64px 14px;">
                     <img src="https://api.ivid.kr/img/mail/guideThroo.png" width="100%" alt="스루입점단계설명이미지">
                  </td>
               </tr>
               <tr>
                  <th style="padding: 44px 17px">
                     <a href="https://ceo.throo.co.kr/selfmanage" style="padding: 6px 63px; color: #fff; font-weight: 400; text-decoration: none; background-color: #13166B; border-radius: 4px; font-size: 16px;">사업자 인증하기</a>
                  </th>
               </tr>
               <tr>
                  <td style="padding: 0px 17px 24px 17px">
                     정산 활성화를 위해 사업자 인증이 필요해요.
                  </td>
               </tr>
               <tr>
                  <td  style=" padding: 20px 17px;">
                     <a href="https://ceo.throo.co.kr/selfmanage" style="font-weight: 400; padding: 6px 70px; color: #fff; text-decoration: none; background-color: #13166B; border-radius: 4px; font-size: 16px;">상품 등록하기</a>
                  </td>
               </tr>
               <tr>
                  <td style="padding: 0px 17px 75px 17px">
                     상품을 등록하면 바로 영업을 시작할 수 있어요, 
                  </td>
               </tr>
         </tbody> 
         <table style="width: 564px; padding: 12px 0; background-color: #E9EEF1; margin: 0 auto;">
                  <thead>
                     <tr>
                           <th style="text-align: left;">
                              <img class="throo_logo" height="30px" style="width: auto; margin: 0; padding: 0 17px;" src="https://api.ivid.kr/img/mail/throoLogo.png" alt="스루로고">   
                           </th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr>
                           <td style="padding: 5px 17px; font-size: 14px; color: #888A9E; padding: 20px 17px 0 17px;">
                              (주)인비저블아이디어 | 대표: 윤언식 | 사업자등록번호: 159-86-01794<br />
                              통신판매업신고: 2020-서울서초-3341<br />
                              서울특별시 서초구 서초대로 398 플래티넘타워4 7층<br />
                              Tel:1670-5324<br />
                           </td>
                     </tr>
                  </tbody>
         </table>
      </table>
   </body>
   </html>
   `;
   
   // Create the SMTP transport.
   let transporter = nodemailer.createTransport({
      host: smtpEndpoint,
      port: port,
      secure: false, // true for 465, false for other ports
      auth: {
         user: smtpUsername,
         pass: smtpPassword
      }
   });

   // Specify the fields in the email.
   let mailOptions = {
      from: senderAddress,
      to: toAddresses,
      subject: subject,
      html: body_html,
   };

   // Send the email.
   let info = await transporter.sendMail(mailOptions)

   if(info.messageId != undefined){
      result = true;
   }
   
   return result;
}

const convincedEmailToOwner2 = async (aIndex,xIndex) => {
   let result = false;

   const smtpEndpoint = "email-smtp.ap-northeast-2.amazonaws.com";
   const port = 587;
   const senderAddress = "스루 관리자<contract@ivid.kr>";
   var toAddresses = aIndex;
   const smtpUsername = "AKIA55SPEYY6PQKGIGF7";
   const smtpPassword = "BArP6VJI00nUvsoLLvHJ/vuiDsT70pnNkRn6JshFG3qd";
   var subject = `간편 사업자 인증 후 바로 영업을 시작해 보세요.`;
   var body_html = 
   `
   <!DOCTYPE html>
   <html lang="ko">
   <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>pass</title>
      <link href='//spoqa.github.io/spoqa-han-sans/css/SpoqaHanSans-kr.css' rel='stylesheet' type='text/css'>
   </head>
   <body style= "margin:0; font-family: 'Spoqa Han Sans', 'Spoqa Han Sans JP', 'Sans-serif';  font-size: 18px;" >
      <table class="welcomMail" style="text-align: left; width: 564px; margin: 0 auto;">
         <thead class="logo">
               <tr>
                  <th style="padding:14px 17px;">
                     <img class="throo_logo" width="86px" height="30px" style="width: auto;" src="https://api.ivid.kr/img/mail/throoLogo.png" alt="스루로고">   
                  </th>
               </tr>
               <tr>
                  <th style="padding:40px 17px 46px 14px; font-size: 20px;">
                     클릭 몇번이면 바로 영업을 시작하실 수 있어요!
                  </th>
               </tr>
               <tr >
                  <th>
                     <img src="https://api.ivid.kr/img/mail/welcomeImg02.png" alt="스루가입환영이미지">
                  </th>
               </tr>
               <tr>
                  <th style="padding:14px 17px; font-weight: 400;">
                  ${xIndex}님, 스루 파트너 가입이 완료 되었습니다. <br/>
                     사업자 인증후, 바로 영업을 시작해보세요.
                  </th>
               </tr>
               <tr>
                  <th style="padding:17px 17px; font-weight: 700;">
                     스루 간편 입점 프로세스
                  </th>
               </tr>
               <tr>
                  <th style="padding:14px 17px; font-weight: 400;">
                     사업자등록번호 외에는 별도의 서류 첨부 없이 사업자 인증이 가능해요.<br/>
                     *구비서류가 필요할 경우 별도로 연락 드립니다.
                  </th>
               </tr>
         </thead>
         <tbody> 
               <tr>
                  <td style="padding:64px 14px 14px 14px; color: #13166B; font-weight: 700;">
                     파트너님의 입점 단계
                  </td>
               </tr>
               <tr>
                  <td style="padding:24px 14px 64px 14px;">
                     <img src="https://api.ivid.kr/img/mail/guideThroo.png"  width="100%" alt="스루입점단계설명이미지">
                  </td>
               </tr>
               <tr>
                  <th style="padding: 44px 17px">
                     <a href="https://ceo.throo.co.kr/selfmanage" style="padding: 6px 63px; color: #fff; font-weight: 400; text-decoration: none; background-color: #13166B; border-radius: 4px; font-size: 16px;">사업자 인증하기</a>
                  </th>
               </tr>
               <tr>
                  <td style="padding: 0px 17px 24px 17px">
                     정산 활성화를 위해 사업자 인증이 필요해요.
                  </td>
               </tr>
               <tr>
                  <td  style=" padding: 20px 17px;">
                     <a href="https://ceo.throo.co.kr/selfmanage" style="font-weight: 400; padding: 6px 70px; color: #fff; text-decoration: none; background-color: #13166B; border-radius: 4px; font-size: 16px;">상품 등록하기</a>
                  </td>
               </tr>
               <tr>
                  <td style="padding: 0px 17px 75px 17px">
                     상품을 등록하면 바로 영업을 시작할 수 있어요, 
                  </td>
               </tr>
         </tbody> 
         <table class="footer" style="width: 564px; padding: 12px 0; background-color: #E9EEF1; margin: 0 auto;">
                  <thead>
                     <tr>
                           <th style="text-align: left;">
                              <img class="throo_logo" height="30px" style="width: auto; margin: 0; padding: 0 17px;" src="https://api.ivid.kr/img/mail/throoLogo.png" alt="스루로고">   
                           </th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr>
                           <td style="padding: 5px 17px; font-size: 14px; color: #888A9E; ">
                              (주)인비저블아이디어 | 대표: 윤언식 | 사업자등록번호: 159-86-01794<br />
                              통신판매업신고: 2020-서울서초-3341<br />
                              서울특별시 서초구 서초대로 398 플래티넘타워4 7층<br />
                              Tel:1670-5324<br />
                           </td>
                     </tr>
                  </tbody>
         </table>
      </table>
   </body>
   </html>
   `;
   
   // Create the SMTP transport.
   let transporter = nodemailer.createTransport({
      host: smtpEndpoint,
      port: port,
      secure: false, // true for 465, false for other ports
      auth: {
         user: smtpUsername,
         pass: smtpPassword
      }
   });

   // Specify the fields in the email.
   let mailOptions = {
      from: senderAddress,
      to: toAddresses,
      subject: subject,
      html: body_html,
   };

   // Send the email.
   let info = await transporter.sendMail(mailOptions)

   if(info.messageId != undefined){
      result = true;
   }
   
   return result;
}

const convincedEmailToOwner3 = async (aIndex,xIndex) => {
   let result = false;

   const smtpEndpoint = "email-smtp.ap-northeast-2.amazonaws.com";
   const port = 587;
   const senderAddress = "스루 관리자<contract@ivid.kr>";
   var toAddresses = aIndex;
   const smtpUsername = "AKIA55SPEYY6PQKGIGF7";
   const smtpPassword = "BArP6VJI00nUvsoLLvHJ/vuiDsT70pnNkRn6JshFG3qd";
   var subject = `운전자 고객이 파트너님을 기다립니다. `;
   var body_html = 
   `
   <!DOCTYPE html>
   <html lang="ko">
   <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>pass</title>
      <link href='//spoqa.github.io/spoqa-han-sans/css/SpoqaHanSans-kr.css' rel='stylesheet' type='text/css'>
   </head>
   <body style= "margin:0; font-family: 'Spoqa Han Sans', 'Spoqa Han Sans JP', 'Sans-serif';  font-size: 18px;">
      <table class="welcomMail" style="text-align: left; width: 564px; margin: 0 auto;">
         <thead class="logo">
               <tr>
                  <th style="padding:14px 17px;">
                     <img class="throo_logo" width="86px" height="30px" style="width: auto;" src="https://api.ivid.kr/img/mail/throoLogo.png" alt="스루로고">   
                  </th>
               </tr>
               <tr>
                  <th style="padding:40px 17px 17px 14px; font-size: 20px;">
                     대한민국 국민 2명중 1명은 운전자 고객입니다.<br />
                     새로운 고객 창출의 기회를 잡으세요!
                  </th>
               </tr>
               <tr >
                  <th>
                     <img src="https://api.ivid.kr/img/mail/welcomeImg03.png" alt="스루가입환영이미지">
                  </th>
               </tr>
               <tr>
                  <th style="padding:14px 17px; font-weight: 400;">
                  ${xIndex}님, 스루 파트너 가입이 완료 되었습니다. <br/>
                     사업자 인증후, 바로 영업을 시작해보세요.
                  </th>
               </tr>
               <tr>
                  <th style="padding:17px 17px; font-weight: 700;">
                     스루 간편 입점 프로세스
                  </th>
               </tr>
               <tr>
                  <th style="padding:14px 17px; font-weight: 400;">
                     사업자등록번호 외에는 별도의 서류 첨부 없이 사업자 인증이 가능해요.<br/>
                     *구비서류가 필요할 경우 별도로 연락 드립니다.
                  </th>
               </tr>
               <tr>
                  <th style="padding: 44px 17px; border-bottom: 1px solid #13166B;">
                     <a href="https://ceo.throo.co.kr/selfmanage" style="padding: 6px 63px; color: #fff; font-weight: 400; text-decoration: none; background-color: #13166B; border-radius: 4px; font-size: 16px;">사업자 인증하기</a>
                  </th>
               </tr>
               <tr>
                  <th style="padding:44px 17px 4px 17px;">
                     스루 사장님창구의 다양한 기능을 미리 체험해보세요
                  </th>
               </tr>
               <tr>
                  <th style="padding:0px 17px 40px 17px; font-weight: 300; font-size: 14px; font-weight: 400;">
                     주문현황부터 상품관리까지 영업에 필요한 다양한 기능을 둘러볼 수 있어요.
                  </th>
               </tr>
               <tr>
                  <th style="padding:14px 17px"> 
                     주문 현황과 상품판매 TOP5 품목을 한번에 확인할 수 있어요.
                  </th>
               </tr>
               <tr >
                  <th style="padding:20px 17px">
                     <img src="https://api.ivid.kr/img/mail/guide01.png" alt="스루 대시보드 가이드">
                  </th>
               </tr>
               <tr>
                  <th style="padding:12px 17px">
                     매장정보 및 운영 정보를 한번에 설정할 수 있어요.
                  </th>
               </tr>
               <tr >
                  <th style="padding:20px 17px">
                     <img src="https://api.ivid.kr/img/mail/guide02.png" alt="스루 매장관리 가이드">
                  </th>
               </tr>
               <tr>
                  <th style="padding:12px 17px">
                     카테코리,상품, 옵션별로 분류하고 등록할 수 있어요.
                  </th>
               </tr>
               <tr >
                  <th style="padding:20px 17px">
                     <img src="https://api.ivid.kr/img/mail/guide03.png" alt="스루 상품관리  가이드">
                  </th>
               </tr>
               <tr>
                  <th style="padding:12px 17px">
                     기간별로 매출 정보를 조회할 수 있어요.
                  </th>
               </tr>
               <tr >
                  <th style="padding:20px 17px">
                     <img src="https://api.ivid.kr/img/mail/guide04.png" alt="스루 매출관리 가이드">
                  </th>
               </tr>
               <tr>
                  <th style="padding:12px 17px">
                     재고를 실시간으로 관리할 수 있어요.
                  </th>
               </tr>
               <tr >
                  <th style="padding:20px 17px">
                     <img src="https://api.ivid.kr/img/mail/guide05.png" alt="스루 재고관리 가이드">
                  </th>
               </tr> 
               <tr>
                  <th style="padding:60px 17px">
                     <a href="https://ceo.throo.co.kr/selfmanage" style="font-weight: 400;padding: 6px 40px;color: #fff; text-decoration: none; background-color: #13166B; border-radius: 4px; font-size: 16px;">매장셀프등록 바로가기</a>
                  </th>
               </tr>
         </thead>
         <tbody> 
               
         </tbody> 
         <table style="width: 564px; padding: 12px 0; background-color: #E9EEF1; margin: 0 auto;">
                  <thead>
                     <tr>
                           <th style="text-align: left;">
                              <img class="throo_logo" height="30px" style="width: auto; margin: 0; padding: 0 17px;" src="https://api.ivid.kr/img/mail/throoLogo.png" alt="스루로고">   
                           </th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr>
                           <td style="padding: 5px 17px; font-size: 14px; color: #888A9E; padding-bottom: 0;">
                              (주)인비저블아이디어 | 대표: 윤언식 | 사업자등록번호: 159-86-01794<br />
                              통신판매업신고: 2020-서울서초-3341<br />
                              서울특별시 서초구 서초대로 398 플래티넘타워4 7층<br />
                              Tel:1670-5324<br />
                           </td>
                     </tr>
                  </tbody>
         </table>
      </table>
   </body>
   </html>
   `;
   
   // Create the SMTP transport.
   let transporter = nodemailer.createTransport({
      host: smtpEndpoint,
      port: port,
      secure: false, // true for 465, false for other ports
      auth: {
         user: smtpUsername,
         pass: smtpPassword
      }
   });

   // Specify the fields in the email.
   let mailOptions = {
      from: senderAddress,
      to: toAddresses,
      subject: subject,
      html: body_html,
   };

   // Send the email.
   let info = await transporter.sendMail(mailOptions)

   if(info.messageId != undefined){
      result = true;
   }
   
   return result;
}

const convincedEmailToOwner4 = async (aIndex,xIndex) => {
   let result = false;

   const smtpEndpoint = "email-smtp.ap-northeast-2.amazonaws.com";
   const port = 587;
   const senderAddress = "스루 관리자<contract@ivid.kr>";
   var toAddresses = aIndex;
   const smtpUsername = "AKIA55SPEYY6PQKGIGF7";
   const smtpPassword = "BArP6VJI00nUvsoLLvHJ/vuiDsT70pnNkRn6JshFG3qd";
   var subject = `스루로 비용없는 추가매출 기회 놓치지 마세요.`;
   var body_html = 
   `
   <!DOCTYPE html>
   <html lang="ko">
   <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>pass</title>
      <link href='//spoqa.github.io/spoqa-han-sans/css/SpoqaHanSans-kr.css' rel='stylesheet' type='text/css'>
   </head>
   <body style= "margin:0; font-family: 'Spoqa Han Sans', 'Spoqa Han Sans JP', 'Sans-serif';  font-size: 18px;">
      <table class="welcomeMail" style="text-align: left; width: 564px; margin: 0 auto;">
         <thead class="logo">
               <tr>
                  <th style="padding:14px 17px;">
                     <img class="throo_logo" width="86px" height="30px" style="width: auto;" src="https://api.ivid.kr/img/mail/throoLogo.png" alt="스루로고">   
                  </th>
               </tr>
               <tr>
                  <th style="padding:40px 17px 17px 14px; font-size: 20px;">
                     지금 이순간에도<br />
                     스루와 함께 수많은 파트너들이 성장하고 있어요.<br />
                     이제 파트너님의 차례입니다.<br />
                  </th>
               </tr>
               <tr> 
                  <th>
                     <img src="https://api.ivid.kr/img/mail/welcomeImg04.png" alt="스루가입환영이미지">
                  </th>
               </tr>
               <tr>
                  <th style="padding:14px 17px; font-weight: 400;">
                     ${xIndex}님, 스루 파트너 가입이 완료 되었습니다. <br />
                     간편하게 사업자 인증하고 바로 영업을 시작해보세요.
                  </th>
               </tr>
         </thead>
         <tbody> 
               <tr>
                  <td style="padding:14px 0 0 14px;">
                     <img style="width: 205px; height: 66px;" src="https://api.ivid.kr/img/mail/self01.png" alt="사업자인증하기">
                  </td>
               </tr>
               <tr>
                  <th style="padding: 44px 17px">
                     <a href="https://ceo.throo.co.kr/selfmanage" style="padding: 6px 63px; color: #fff; font-weight: 400; text-decoration: none; background-color: #13166B; border-radius: 4px; font-size: 16px;">사업자 인증하기</a>
                  </th>
               </tr>
               <tr>
                  <td style="padding:14px 0 0 14px;">
                     <img style="width: 205px; height: 62px;" src="https://api.ivid.kr/img/mail/self02.png" alt="매장정보 등록하기">
                  </td>
               </tr>
               <tr>
                  <th style="padding: 44px 17px">
                     <a href="https://ceo.throo.co.kr/selfmanage" style="padding: 6px 55px; color: #fff; font-weight: 400; text-decoration: none; background-color: #13166B; border-radius: 4px; font-size: 16px;">매장정보 등록하기</a>
                  </th>
               </tr>
               <tr>
                  <td style="padding:14px 0 0 14px;">
                     <img style="width: 205px; height: 62px;" src="https://api.ivid.kr/img/mail/self03.png" alt="상품 등록하기">
                  </td>
               </tr>
               <tr>
                  <th style="padding: 44px 17px">
                     <a href="https://ceo.throo.co.kr/selfmanage" style="padding: 6px 70px; color: #fff; font-weight: 400; text-decoration: none; background-color: #13166B; border-radius: 4px; font-size: 16px;">상품 등록하기</a>
                  </th>
               </tr>
         </tbody> 
         <table style="width: 564px; padding: 12px 0; background-color: #E9EEF1; margin: 0 auto;">
               <thead>
                  <tr>
                     <th style="text-align: left;">
                           <img class="throo_logo" height="30px" style="width: auto; margin: 0; padding: 0 17px;" src="https://api.ivid.kr/img/mail/throoLogo.png" alt="스루로고">   
                     </th>
                  </tr>
               </thead>
               <tbody>
                  <tr>
                     <td style="padding: 5px 17px; font-size: 14px; color: #888A9E; padding-bottom: 0;">
                           (주)인비저블아이디어 | 대표: 윤언식 | 사업자등록번호: 159-86-01794<br />
                           통신판매업신고: 2020-서울서초-3341<br />
                           서울특별시 서초구 서초대로 398 플래티넘타워4 7층<br />
                           Tel:1670-5324<br />
                     </td>
                  </tr>
               </tbody>
      </table>
      </table>
   </body>
   </html>
   `;
   
   // Create the SMTP transport.
   let transporter = nodemailer.createTransport({
      host: smtpEndpoint,
      port: port,
      secure: false, // true for 465, false for other ports
      auth: {
         user: smtpUsername,
         pass: smtpPassword
      }
   });

   // Specify the fields in the email.
   let mailOptions = {
      from: senderAddress,
      to: toAddresses,
      subject: subject,
      html: body_html,
   };

   // Send the email.
   let info = await transporter.sendMail(mailOptions)

   if(info.messageId != undefined){
      result = true;
   }
   
   return result;
}

const convincedEmailToOwner5 = async (aIndex,xIndex) => {
   let result = false;

   const smtpEndpoint = "email-smtp.ap-northeast-2.amazonaws.com";
   const port = 587;
   const senderAddress = "스루 관리자<contract@ivid.kr>";
   var toAddresses = aIndex;
   const smtpUsername = "AKIA55SPEYY6PQKGIGF7";
   const smtpPassword = "BArP6VJI00nUvsoLLvHJ/vuiDsT70pnNkRn6JshFG3qd";
   var subject = `지금도 늦지않았어요! 스루로 월 200만원 추가매출 올리 실 수 있어요.`;
   var body_html = 
   `
   <!DOCTYPE html>
   <html lang="ko">
   <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>pass</title>
      <link href='//spoqa.github.io/spoqa-han-sans/css/SpoqaHanSans-kr.css' rel='stylesheet' type='text/css'>
   </head>
   <body style= "margin:0; font-family: 'Spoqa Han Sans', 'Spoqa Han Sans JP', 'Sans-serif';  font-size: 18px;">
      <table class="welcomeMail" style="text-align: left; width: 564px; margin: 0 auto;">
         <thead class="logo">
               <tr>
                  <th style="padding:14px 17px;">
                     <img class="throo_logo" width="86px" height="30px" style="width: auto;" src="https://api.ivid.kr/img/mail/throoLogo.png" alt="스루로고">   
                  </th>
               </tr>
               <tr>
                  <th style="padding:40px 17px 17px 14px; font-size: 20px;">
                     지금 이 순간에도 스루에서는<br />
                     파트너님을 위한 매출의 기회가 기다리고 있어요
                  </th>
               </tr>
               <tr> 
                  <th>
                     <img src="https://api.ivid.kr/img/mail/welcomeImg05.png" alt="스루가입환영이미지">
                  </th>
               </tr>
               <tr>
                  <th style="padding:14px 17px; font-weight: 400;">
                     ${xIndex}님, 스루 파트너 가입이 완료 되었습니다. <br />
                     간편하게 사업자 인증하고 바로 영업을 시작해보세요.
                  </th>
               </tr>
         </thead>
         <tbody> 
               <tr>
                  <td style="padding:14px 0 0 14px;">
                     <img style="width: 205px; height: 66px;" src="https://api.ivid.kr/img/mail/self01.png" alt="사업자인증하기">
                  </td>
               </tr>
               <tr>
                  <th style="padding: 44px 17px">
                     <a href="https://ceo.throo.co.kr/selfmanage" style="padding: 6px 63px; color: #fff; font-weight: 400; text-decoration: none; background-color: #13166B; border-radius: 4px; font-size: 16px;">사업자 인증하기</a>
                  </th>
               </tr>
               <tr>
                  <td style="padding:14px 0 0 14px;">
                     <img style="width: 205px; height: 62px;" src="https://api.ivid.kr/img/mail/self02.png" alt="매장정보 등록하기">
                  </td>
               </tr>
               <tr>
                  <th style="padding: 44px 17px">
                     <a href="https://ceo.throo.co.kr/selfmanage" style="padding: 6px 55px; color: #fff; font-weight: 400; text-decoration: none; background-color: #13166B; border-radius: 4px; font-size: 16px;">매장정보 등록하기</a>
                  </th>
               </tr>
               <tr>
                  <td style="padding:14px 0 0 14px;">
                     <img style="width: 205px; height: 62px;" src="https://api.ivid.kr/img/mail/self03.png" alt="상품 등록하기">
                  </td>
               </tr>
               <tr>
                  <th style="padding: 44px 17px">
                     <a href="https://ceo.throo.co.kr/selfmanage" style="padding: 6px 70px; color: #fff; font-weight: 400; text-decoration: none; background-color: #13166B; border-radius: 4px; font-size: 16px;">상품 등록하기</a>
                  </th>
               </tr>
         </tbody> 
         <table style="width: 564px; padding: 12px 0; background-color: #E9EEF1; margin: 0 auto;">
               <thead>
                  <tr>
                     <th style="text-align: left;">
                           <img class="throo_logo" height="30px" style="width: auto; margin: 0; padding: 0 17px;" src="https://api.ivid.kr/img/mail/throoLogo.png" alt="스루로고">   
                     </th>
                  </tr>
               </thead>
               <tbody>
                  <tr>
                     <td style="padding: 5px 17px; font-size: 14px; color: #888A9E; padding-bottom: 0;">
                           (주)인비저블아이디어 | 대표: 윤언식 | 사업자등록번호: 159-86-01794<br />
                           통신판매업신고: 2020-서울서초-3341<br />
                           서울특별시 서초구 서초대로 398 플래티넘타워4 7층<br />
                           Tel:1670-5324<br />
                     </td>
                  </tr>
               </tbody>
      </table>
      </table>
   </body>
   </html>
   `;
   
   // Create the SMTP transport.
   let transporter = nodemailer.createTransport({
      host: smtpEndpoint,
      port: port,
      secure: false, // true for 465, false for other ports
      auth: {
         user: smtpUsername,
         pass: smtpPassword
      }
   });

   // Specify the fields in the email.
   let mailOptions = {
      from: senderAddress,
      to: toAddresses,
      subject: subject,
      html: body_html,
   };

   // Send the email.
   let info = await transporter.sendMail(mailOptions)

   if(info.messageId != undefined){
      result = true;
   }
   
   return result;
}

module.exports = {
   confirmCheckUserEmail,
   confirmStoreAppPushEmail,
   completeSignUpEmail,
   inquireToEmail,
   sendEmail,
   adminConfirmMail,
   inquireEmail,
   settlementEmail,
   welcomeEmailStore,
   convincedEmailToOwner1,
   convincedEmailToOwner2,
   convincedEmailToOwner3,
   convincedEmailToOwner4,
   convincedEmailToOwner5
}
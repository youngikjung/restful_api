// The Website model.
'use strict';

var config = require('../config'),
   knex = require('../services/database');

const sWebsiteBanner = 'wm_website_banner';
const sWebsiteInquiry = 'wm_website_inquiry';
const sWebStatsWebUser = 'throo_stats_webuser';

var Home = {};

Home.keepInfomationHomepage = (sType, token, isMobile,osVersion,currentPath, ipAddress) => {
   return knex(sWebStatsWebUser)
      .insert({ type: sType, query: token, mobile: isMobile, os_version : osVersion, current_path: currentPath , ip_address: ipAddress})
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

Home.contentData = (countNm) => {
   let sQuery = knex.raw(`
                  *
      FROM        wm_website_info 
      WHERE       status = 1 
      AND         info_id = ?
   `, [countNm]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Home.noticeList = (countNm) => {
   let sQuery = knex.raw(`
                  ( SELECT COUNT(*) FROM wmpos_notice ) AS count_index,
                  created_at,
                  content,
                  title
      FROM        wmpos_notice
      WHERE       status = 1 
      ORDER BY    created_at DESC
      LIMIT ?
   `, [countNm]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Home.getThrooArticle = () => {
   let sQuery = knex.raw(`
                  title,
                  thumbnail,
                  thumbnail_url,
                  created_at
      FROM        wm_website_info
      WHERE       status = 1 
      ORDER BY    created_at DESC
   `, []);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Home.contentList = (countNm) => {
   let sQuery = knex.raw(`
                  *
      FROM        wm_website_info 
      WHERE       status = 1 
      LIMIT ?
   `, [countNm]);

   let oQuery = knex.select(sQuery);
   return oQuery.then(function (result) {
      return result;
   }).catch((err) => console.log("err",err));
}

Home.bannerImg = () => {
   return  knex.select('banner_id', 'url_path',"mime_type","param", "type","site")
               .from(sWebsiteBanner)
               .where({ status: 1 })
               .then((result) => {
                  return result;
               })
               .catch((err) => console.log(err));
}

Home.homeEvent = (sEmail,storeName,sAddress,sPhoneNm,sEvent,sTitle,sContent) => {
   return knex(sWebsiteInquiry)
      .insert({ email: sEmail, store_name: storeName, address: sAddress, phone_number: sPhoneNm, categories : sEvent, title: sTitle, content : sContent})
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}
Home.homeEventV2 = (sEmail,storeName,sAddress,sPhoneNm,sEvent,sTitle,sContent,sType,sUrl) => {
   return knex(sWebsiteInquiry)
      .insert({ email: sEmail, store_name: storeName, address: sAddress, phone_number: sPhoneNm, categories : sEvent, title: sTitle, content : sContent, img_url: sUrl, file_type: sType })
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}

Home.homeInquire = (sEmail,storeName,sPhoneNm,sEvent,sText) => {
   return knex(sWebsiteInquiry)
      .insert({ email: sEmail, store_name: storeName, phone_number: sPhoneNm, categories : "inquire", title: sEvent, content: sText})
      .then((result) => {
         return result;
      }).catch((err) => console.log(err));
}



module.exports = Home;
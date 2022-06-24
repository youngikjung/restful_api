'use strict';

var router = require('express').Router();

var config = require('../config'),
   validateToken = require('../services/tokenValidator').validateToken,
   allowOnly = require('../services/routesHelper').allowOnly,
   AuthController = require('../controllers/authController'),
   StoreController = require('../controllers/storeController'),
   HomeController = require('../controllers/homeController'),
   ModalController = require('../controllers/modalController'),
   PaymentController = require('../controllers/paymentController'),
   ContractController = require('../controllers/contractController'),
   RegisterController = require('../controllers/registerController'),
   AdminAuthController = require('../controllers/admin/adminAuthController'),
   DashboardController = require('../controllers/admin/dashboardController'),
   DashboardControllerAdmin = require('../controllers/ceoplaza/dashboardController'),
   AuthControllerSalesApp = require('../controllers/salesApp/AuthenticateController'),
   AuthControllerCeoApp = require('../controllers/ceoApp/AuthenticateController'),
   StampController = require('../controllers/stamp/stampController'),
   OrderController = require('../controllers/OrderController'),
   DesignatedController = require('../controllers/ceoApp/DesignatedController'),
   StoreRegisterController = require('../controllers/ceoApp/storeController'),
   CommercialController = require('../controllers/commercialController'),
   SalesController = require('../controllers/salesApp/salesController'),
   TestController = require('../controllers/testController');
   
var APIRoutes = function (passport) {
   // THROO ADMIN
   
   //-login
   router.post('/admin/authenticate', AdminAuthController.authenticateUser);

   //-dashboard
   router.post('/admin/dashboard', DashboardController.dashboard);
   router.post('/test/admin/dashboard', DashboardController.testDashboard);

   //-manage
   router.post('/admin/manage/commercialList', DashboardController.commercialList);
   router.post('/admin/manage/web/bannerList', DashboardController.bannerList);
   router.post('/admin/manage/web/noticeList', DashboardController.noticeWebList);
   router.post('/admin/manage/web/inquiryList', DashboardController.webInquiryList);
   router.post('/admin/manage/web/inquiryList2', DashboardController.webInquiryList2);
   router.post('/admin/manage/web/insertNotice', DashboardController.insertWebNotice);
   router.post('/admin/manage/web/responseInquiry', DashboardController.webResponseInquiry);
   router.post('/admin/manage/web/responseInquiry2', DashboardController.webResponseInquiry2);
   router.post('/admin/manage/app/insertNotice', DashboardController.insertAppNotice);
   router.post('/admin/manage/app/noticeList', DashboardController.noticeAppList);
   router.post('/admin/manage/app/responseInquiry', DashboardController.responseInquiry);
   router.post('/admin/manage/app/inquiryList', DashboardController.inquiryList);
   router.post('/admin/manage/homepage/bannerAction', DashboardController.bannerAction);
   router.post('/admin/manage/homepage/managerCheck', DashboardController.managerCheck);
   router.post('/admin/user/userList', DashboardController.userList);
   router.post('/admin/user/userData', DashboardController.userData);
   router.post('/admin/user/userListExcelDownload', DashboardController.userListExcelDownload);
   router.post('/admin/user/searchUser', DashboardController.searchUser);
   router.post('/admin/user/getUserData', DashboardController.getUserData);
   router.post('/admin/orderList/v2', DashboardController.orderList);
   router.post('/admin/orderInfo/v2', DashboardController.orderInfo);
   router.post('/admin/orderInfo/cancel', DashboardController.orderCancel);
   router.post('/admin/user/userChartList', DashboardController.userChartList);
   router.post('/admin/sales/salesData', DashboardController.salesData);
   router.post('/admin/sales/changeSalesUserStatus', DashboardController.changeSalesUserStatus);
   router.post('/admin/sales/authenticate/signUp/v2', DashboardController.salesUserSignUp);
   router.post('/admin/store/storeList', DashboardController.storeList);
   router.post('/admin/store/storeList/v2', DashboardController.storeListV2);
   router.post('/admin/store/storeInfo/v2', DashboardController.storeInfoV2);
   router.post('/admin/store/storeData', DashboardController.storeData);
   router.post('/admin/store/storeListExcelDownload', DashboardController.storeListExcelDownload);
   router.post('/admin/store/searchStore', DashboardController.searchStore);
   router.post('/admin/store/getStoreData', DashboardController.getStoreData);
   router.post('/admin/store/storeChartList', DashboardController.storeChartList);
   //router.post('/admin/settlement', DashboardController.getMonthlySettlement);
   router.post('/admin/settlement', DashboardController.getMonthlySettlementV2);
   router.post('/admin/getTaxData', DashboardController.getTaxData);
   router.post('/admin/completeSettlement', DashboardController.completeSettlement);

   router.get('/admin/product/productInfo/v2-:sParam', DashboardController.productInfo);
   
   //todo
   router.post('/admin/checkEmailSettlement', DashboardController.checkEmailSettlement);


   // THROO HOMEPAGE
   router.post('/home/bannerEvent', HomeController.bannerEvent);
   router.post('/home/bannerEvent/v2', HomeController.bannerEventV2);
   router.post('/home/checkInfo', HomeController.checkInfo);
   router.post('/home/writingToInquire', HomeController.writingToInquire);

   router.get('/home/bannerImgCEO', HomeController.bannerImgCeo);
   router.get('/home/bannerImg', HomeController.bannerImg);
   router.get('/home/contentList', HomeController.contentList);
   router.get('/home/contentData-:sParam', HomeController.contentData);
   router.get('/home/getThrooArticle', HomeController.getThrooArticle);


   //THROO CEO-PLAZA

   //-login
   router.post('/authenticate/v2', AuthController.authenticateUserV2);
   router.post('/authenticate/auto/v2', AuthController.autoAuthenticateUser);
   router.post('/authenticate/signUp/v2', AuthController.signUpStoreUser);
   
   //sales 
   router.get('/sales/getSalesTeamData-:sales_id', AuthController.getSalesTeamData);
   router.post('/sales/manager/getSalesTeamDataV2', AuthController.getSalesManagerDataV2);
   router.post('/sales/manager/searchSalesStore', AuthController.searchSalesManagerStore);
   router.post('/sales/manager/authenticate/v2', AuthController.salesManagerAuthenticate);
   router.post('/sales/manager/getDesignateStoreProduct', AuthController.getDesignateManagerStoreProduct);
   router.post('/sales/manager/productCopyToStore', AuthController.managerProductCopyToStore);
   router.post('/sales/getSalesTeamDataV2', AuthController.getSalesTeamDataV2);
   router.post('/sales/getSalesTeamDataExceptOne', AuthController.getSalesTeamDataExceptOne);
   router.post('/sales/searchSalesStore', AuthController.searchSalesStore);
   router.post('/sales/getDesignateStoreProduct', AuthController.getDesignateStoreProduct);
   router.post('/sales/productCopyToStore', AuthController.productCopyToStore);
   router.post('/sales/authenticate/v2', AuthController.salesAuthenticate);
   router.post('/sales/authenticate/addStore/v2', AuthController.salesStoreAddStore);
   router.post('/sales/authenticate/sms', AuthController.authenticateSMS);
   router.post('/sales/authenticate/smsAuthenticate', AuthController.authenticateSMSVerify);
   router.post('/sales/payment/listing/v2', PaymentController.getSalesStorePaymentList);
   router.post('/sales/payment/AdjustmentPayment/v2', PaymentController.salesStoreAdjustmentPayment);
   router.post('/sales/calculate/listing/v2', PaymentController.salesStoreCalculate);
   router.post('/sales/deleteStore', AuthController.deleteStore);
   
   //-signup
   router.get('/register/findId-:sIndex', RegisterController.findId);
   router.post('/register/sendSMS', RegisterController.sendSMS);
   router.post('/register/sendSMS/v2', RegisterController.sendSMSV2);
   router.post('/register/verifySms', RegisterController.verifySms);
   router.post('/register/verifySms/v2', RegisterController.verifySmsV2);
   
   //-coupon 
   router.get('/coupon/getData-:store_id', validateToken(passport, StoreController.getCouponData));
   router.post('/coupon/insertCoupon', validateToken(passport, RegisterController.insertCoupon));
   router.post('/coupon/deleteCoupon', validateToken(passport, RegisterController.deleteCoupon));
   
   //-stamp
   router.get('/stamp/list-:store_id', validateToken(passport, RegisterController.storeStampList));
   router.post('/stamp/insertStamp', validateToken(passport, RegisterController.insertStamp));
   router.post('/stamp/edit', validateToken(passport, RegisterController.storeStampEdit));
   router.post('/stamp/delete', validateToken(passport, RegisterController.storeStampDelete));
   router.post('/stamp/changeState', validateToken(passport, RegisterController.storeStampChangeState));

   //-dashboard
   router.get('/store/v2/currentStatus-:sParam', DashboardControllerAdmin.currentStatus);
   router.get('/v2/ceoDashboard-:sParam', DashboardControllerAdmin.getDashBoardData);
   router.post('/store/operationStore', DashboardControllerAdmin.operationStore);
   router.post('/store/changeStatus/v2', validateToken(passport, DashboardControllerAdmin.storeOnOff));

   //inventory
   router.get('/inventory/menuList-:sIndex', validateToken(passport, StoreController.inventoryList));
   router.get('/store/register/categoryList-:store_id', validateToken(passport, StoreController.categoryList));
   router.post('/inventory/changeStatus', validateToken(passport, StoreController.inventoryChangeStatus));


   //payment
   router.get('/payment/getColumnChart/v2-:store_id', validateToken(passport, PaymentController.getColumnChart));
   router.post('/payment/listing/v2', validateToken(passport, PaymentController.getListV2));
   // router.post('/payment/AdjustmentPayment/v2', validateToken(passport, PaymentController.adjustmentPaymentV2));
   router.post('/payment/AdjustmentPayment/v2', validateToken(passport, PaymentController.adjustmentPaymentV3));
   router.post('/payment/getLineChart/v2', validateToken(passport, PaymentController.getLineChart));
   router.post('/payment/taxCalculate/v2', validateToken(passport, PaymentController.taxCalculateV2));
   
   //proprietorship
   router.get('/proprietorship/userBusinessInfo-:sParam', validateToken(passport, StoreController.userBusinessInfo));
   router.post('/proprietorship/register', validateToken(passport, RegisterController.proprietorship));
   router.post('/proprietorship/register/v2', validateToken(passport, RegisterController.proprietorshipV2));
   router.post('/proprietorship/coperation/register', validateToken(passport, RegisterController.addCoperationCompany));
   
   //product
   router.get('/store/register/categoryList/v2-:store_id', validateToken(passport, StoreController.categoryListV2));
   router.get('/store/register/detailOptionRow-:option_id', validateToken(passport, StoreController.detailOptionRow));
   router.get('/store/register/optionList-:store_id', validateToken(passport, StoreController.optionList));
   router.get('/store/register/getMenuDetail-:menu_id', validateToken(passport, StoreController.getMenuDetail));
   router.get('/store/register/getMenuDetail/v2-:menu_id', validateToken(passport, StoreController.getMenuDetailV2));
   router.get('/store/register/menuList-:category_id', validateToken(passport, StoreController.menuList));
   router.get('/store/register/detailMenuList-:store_id', validateToken(passport, StoreController.detailMenuList));

   router.post('/store/register/changeIndexCategory', validateToken(passport, StoreController.changeIndexCategory));
   router.post('/store/register/deleteCategory', validateToken(passport, StoreController.deleteCategory));
   router.post('/store/register/editCategoryList', validateToken(passport, StoreController.editCategoryList));
   router.post('/store/register/insertCategory', validateToken(passport, StoreController.insertCategory));
   router.post('/store/register/deleteOption', validateToken(passport, StoreController.deleteOption));
   router.post('/store/register/insertOption', validateToken(passport, StoreController.insertOption));
   router.post('/store/register/insertOption/v2', validateToken(passport, StoreController.insertOptionV2));
   router.post('/store/register/editOption/v2', validateToken(passport, StoreController.editOptionV2));
   router.post('/store/register/registerMenu/v2', validateToken(passport, StoreController.registerMenuV2));
   router.post('/store/register/editMenu', validateToken(passport, StoreController.editMenu));
   router.post('/store/register/editMenu/v2', validateToken(passport, StoreController.editMenuV2));
   router.post('/store/register/changeIndexMenu', validateToken(passport, StoreController.changeIndexMenu));
   router.post('/store/register/deleteMenu/v2', validateToken(passport, StoreController.deleteMenuV2));
   router.post('/store/register/registerMenu', validateToken(passport, StoreController.registerMenu));

   //store
   router.get('/store/settingStoreDetail-:store_id', validateToken(passport, StoreController.settingStoreDetail));
   router.get('/store/orderTimeDesc-:store_id', validateToken(passport, StoreController.orderTimeDesc));
   router.get('/store/getStoreImage/v2-:store_id', validateToken(passport, StoreController.getStoreMediaImage));
   router.get('/store/pickup/getPickUpInfo-:store_id', validateToken(passport, StoreController.getPickUpInfo));
   router.get('/store/getStoreHoliday-:store_id', validateToken(passport, StoreController.getStoreHoliday));
   router.get('/store/pickup/getPickUpZoneInfo/v2-:store_id', validateToken(passport, StoreController.getPickUpZoneInfo));
   router.get('/store/getStoreOperation-:store_id', validateToken(passport, StoreController.getStoreOperation));

   router.post('/store/register/editStoreInfo', validateToken(passport, StoreController.editStoreInfo));
   router.post('/store/register/orderTime', validateToken(passport, StoreController.orderTime));
   router.post('/store/register/registerImage/v2', validateToken(passport, StoreController.registerImageV2));
   router.post('/store/register/deleteImage/v2', validateToken(passport, StoreController.deleteImage));
   router.post('/store/register/editStoreHoliday', validateToken(passport, StoreController.editStoreHoliday));
   router.post('/store/pickup/editPickUpInfo', validateToken(passport, StoreController.editPickUpInfo));
   router.post('/store/pickup/parkingImage/v2', validateToken(passport, StoreController.editParkingImage));
   router.post('/store/pickup/setPickUpZone/v2', validateToken(passport, StoreController.setPickUpZone));
   router.post('/store/register/editStoreOperation', validateToken(passport, StoreController.editStoreOperation));

   //notice
   router.get('/store/notice-:countNm', StoreController.noticeList);
   router.get('/notice/noticeList/v2', StoreController.noticeListV2);
   
   //upload 
   router.post('/admin/store/register/bannerLogo', RegisterController.bannerLogo);
   router.post('/store/register/filesLogo', RegisterController.filesLogo);
   router.post('/store/register/uploadAIFiles', RegisterController.uploadAIFiles);
   router.post('/store/register/uploadPDFFiles', RegisterController.uploadPDFFiles);
   
   //modal
   router.get('/modal/modalFrontPage-:store_id', ModalController.modalFrontPage);
   router.get('/modal/modalBackPage-:store_id', ModalController.modalBackPage);
   router.get('/modal/getOptionListModal-:store_id', ModalController.getOptionListModal);
   router.get('/modal/modalCategory/v2-:store_id', ModalController.modalCategoryV2);
   router.get('/modal/modalMenu/v2-:category_id', ModalController.modalMenuV2);
   router.get('/modal/modalMenuDetail/v2-:menu_id', ModalController.modalMenuDetailV2);

   //pos
   router.post('/authenticate/app', AuthController.posSignIn);

   //sales_app 
   router.post('/app/sales/authenticate/v3', SalesController.authenticateUserV2);
   router.post('/app/sales/partnersSignUp/v3', SalesController.partnersSignUp);
   router.post('/app/sales/auto/v3', SalesController.autoLogin);
   router.post('/app/sales/insertPushToken/v3', SalesController.updatePushToken);
   router.post('/app/sales/dashboard/v2', SalesController.dashboardData);
   router.post('/app/sales/store/search/enrolling', SalesController.enrollingStoreByName);
   router.post('/app/sales/store/search/enrolled', SalesController.enrolledStoreByName);
   router.post('/app/sales/manager/delete', SalesController.deleteMember);
   router.post('/app/sales/manager/onChangeMember', SalesController.managerChangeMember);

   router.get('/app/sales/store/enrolling-:sales_id', SalesController.enrollingStore);
   router.get('/app/sales/store/enrolled-:sales_id', SalesController.enrolledStore);
   router.get('/app/sales/manager/list-:sales_id', SalesController.managerList);

   router.post('/app/sales/authenticate/v2', AuthControllerSalesApp.authenticateUserV2);
   router.post('/app/sales/auto/v2', AuthControllerSalesApp.autoLogin);
   router.post('/app/sales/dashboard', AuthControllerSalesApp.mainDashboad);
   router.post('/app/sales/exchange/id', AuthControllerSalesApp.editStoreId);
   router.post('/app/sales/exchange/pw', AuthControllerSalesApp.editStorePw);
   router.post('/app/sales/productCopyToStore', AuthControllerSalesApp.productCopyToStore);
   router.post('/app/sales/paymentList', AuthControllerSalesApp.salesStoreCalculate);
   router.post('/app/sales/proprietorship/register', AuthControllerSalesApp.proprietorshipV2);
   router.post('/app/sales/store/register/editStoreInfo', AuthControllerSalesApp.editStoreInfo);
   router.post('/app/sales/store/register/orderTime', AuthControllerSalesApp.orderTime);
   router.post('/app/sales/store/pickup/editPickUpInfo', AuthControllerSalesApp.editPickUpInfo);
   router.post('/app/sales/store/pickup/parkingImage/v2', AuthControllerSalesApp.editParkingImage);
   router.post('/app/sales/store/pickup/setPickUpZone/v2', AuthControllerSalesApp.setPickUpZone);
   router.post('/app/sales/store/register/editStoreOperation', AuthControllerSalesApp.editStoreOperation);
   router.post('/app/sales/store/register/editStoreOperationV2', AuthControllerSalesApp.editStoreOperationV2);
   router.post('/app/sales/store/register/editStoreHoliday', AuthControllerSalesApp.editStoreHoliday);
   router.post('/app/sales/store/register/registerImage/v2', AuthControllerSalesApp.registerImageV2);
   router.post('/app/sales/store/register/insertCategory', AuthControllerSalesApp.insertCategory);
   router.post('/app/sales/store/register/deleteCategory', AuthControllerSalesApp.deleteCategory);
   router.post('/app/sales/store/register/editCategoryList', AuthControllerSalesApp.editCategoryList);
   router.post('/app/sales/store/register/insertOption/v2', AuthControllerSalesApp.insertOptionV2);
   router.post('/app/sales/store/register/registerMenu/v2', AuthControllerSalesApp.registerMenuV2);
   router.post('/app/sales/store/register/product/v3', AuthControllerSalesApp.registerMenuV3);
   router.post('/app/sales/store/register/deleteMenu/v2', AuthControllerSalesApp.deleteMenuV2);
   router.post('/app/sales/store/register/editMenu/v2', AuthControllerSalesApp.editMenuV2);
   router.post('/app/sales/store/register/edit/v3', AuthControllerSalesApp.editMenuV3);
   router.post('/app/sales/store/register/deleteOption', AuthControllerSalesApp.deleteOption);
   router.post('/app/sales/store/register/editOption/v2', AuthControllerSalesApp.editOptionV2);
   router.post('/app/sales/getPushMessageList', AuthControllerSalesApp.getPushMessageList);
   router.post('/app/sales/test', AuthControllerSalesApp.testPushMessage);
   router.post('/app/sales/send/pushMessage', AuthControllerSalesApp.sendMessageForSales);
   router.post('/app/sales/send/groupMessage', AuthControllerSalesApp.groupMessage);
   router.post('/app/sales/send/group/message/v2', AuthControllerSalesApp.groupMessageV2);
   router.post('/app/sales/search/storeUnActiveList', AuthControllerSalesApp.searchStoreUnActiveList);
   router.post('/app/sales/search/storeActiveList', AuthControllerSalesApp.searchStoreActiveList);
   router.post('/app/sales/updatePushToken/v2', AuthControllerSalesApp.updatePushToken);
   router.post('/app/sales/partnersSignUp/v2', AuthControllerSalesApp.partnersSignUp);
   router.post('/app/sales/brand/register', AuthControllerSalesApp.brandStoreRegister);

   router.get('/app/sales/store/store/pickup/getPickUpInfo-:store_id', AuthControllerSalesApp.getPickUpInfo);
   router.get('/app/sales/store/orderTimeDesc-:store_id', AuthControllerSalesApp.orderTimeDesc);
   router.get('/app/sales/proprietorship/userBusinessInfo-:sParam', AuthControllerSalesApp.userBusinessInfo);
   router.get('/app/sales/store/settingStoreDetail-:store_id', AuthControllerSalesApp.settingStoreDetail);
   router.get('/app/sales/store/pickup/getPickUpZoneInfo/v2-:store_id', AuthControllerSalesApp.getPickUpZoneInfo);
   router.get('/app/sales/store/getStoreOperation-:store_id', AuthControllerSalesApp.getStoreOperation);
   router.get('/app/sales/store/getStoreOperationV2-:store_id', AuthControllerSalesApp.getStoreOperationV2);
   router.get('/app/sales/store/getStoreHoliday-:store_id', AuthControllerSalesApp.getStoreHoliday);
   router.get('/app/sales/store/getStoreImage/v2-:store_id', AuthControllerSalesApp.getStoreMediaImage);
   router.get('/app/sales/store/register/categoryList/v2-:store_id', AuthControllerSalesApp.categoryList);
   router.get('/app/sales/store/register/detailMenuList-:store_id', AuthControllerSalesApp.detailMenuList);
   router.get('/app/sales/store/register/menuList-:category_id', AuthControllerSalesApp.menuList);
   router.get('/app/sales/store/register/getMenuDetail/v2-:menu_id', AuthControllerSalesApp.getMenuDetailV2);
   router.get('/app/sales/store/product/info/v3-:menu_id', AuthControllerSalesApp.getMenuDetailV3);
   router.get('/app/sales/store/register/optionList-:store_id', AuthControllerSalesApp.optionList);
   router.get('/app/sales/store/register/detailOptionRow-:option_id', AuthControllerSalesApp.detailOptionRow);
   router.get('/app/sales/storeUnActiveList-:salesId', AuthControllerSalesApp.storeUnActiveList);
   router.get('/app/sales/storeActiveList-:salesId', AuthControllerSalesApp.storeActiveList);
   router.get('/app/sales/register/findEmail-:sIndex', AuthControllerSalesApp.findEmail);

   //throo_ceo_app
   router.post('/app/ceo/authenticate/addStore/v2', AuthControllerCeoApp.signUpStoreUser);
   router.post('/app/ceo/authenticate/v2', AuthControllerCeoApp.authenticateUserV2);
   router.post('/app/ceo/authenticate/check/checkId/v2', AuthControllerCeoApp.authenticateUserCheckId);
   router.post('/app/ceo/authenticate/check/checkPwd/v2', AuthControllerCeoApp.authenticateUserCheckPwd);
   router.post('/app/ceo/authenticate/change/checkPwd/v2', AuthControllerCeoApp.authenticateUserChangePwd);
   router.post('/app/ceo/authenticate/check/sms', RegisterController.sendFindIDSMSV2);
   router.post('/app/ceo/autoAuthenticate/v2', AuthControllerCeoApp.autoLoginV2);
   router.post('/app/user/location/v2', AuthControllerCeoApp.customerLocation);
   router.post('/app/ceo/store/inventory/edit', AuthControllerCeoApp.inventoryEdit);
   router.post('/app/ceo/store/inventory/soldout', AuthControllerCeoApp.onChangeSoldout);
   router.post('/app/ceo/store/quick/product', AuthControllerCeoApp.quickInsert);
   router.post('/app/ceo/orderList', AuthControllerCeoApp.orderList);
   router.post('/app/ceo/store/manualOrder', AuthControllerCeoApp.manualOrder);
   router.post('/app/ceo/store/exChangeStoreStatus', AuthControllerCeoApp.exChangeStoreStatus);
   router.post('/app/ceo/updatePushToken/v2', AuthControllerCeoApp.updatePushToken);
   router.post('/app/ceo/insertPushToken/v2', AuthControllerCeoApp.insertPushToken);
   router.post('/app/ceo/checkupPushToken/v2', AuthControllerCeoApp.checkupPushToken);
   router.post('/app/ceo/store/operationStore', AuthControllerCeoApp.operationStore);
   router.post('/app/ceo/order/chat/getMessage', AuthControllerCeoApp.chatMessage);
   router.post('/app/ceo/order/chat/sendMessage', AuthControllerCeoApp.sendChatMessage);
   router.post('/app/ceo/order/chat/editUserInputMessage', AuthControllerCeoApp.editUserInputMessage);
   router.post('/app/ceo/order/chat/editStoreInputMessage', AuthControllerCeoApp.editStoreInputMessage);
   router.post('/app/ceo/order/changeAuto', AuthControllerCeoApp.changeAuto);
   router.post('/app/ceo/deletePushToken/v2', AuthControllerCeoApp.deletePushToken);
   router.post('/app/ceo/store/changeStoreNoticeText', AuthControllerCeoApp.changeStoreNoticeText);
   router.post('/app/ceo/coupon/insert', AuthControllerCeoApp.storeCouponInsert);
   router.post('/app/ceo/coupon/insertV2', AuthControllerCeoApp.storeCouponInsertV2);
   router.post('/app/ceo/coupon/delete', AuthControllerCeoApp.storeCouponDelete);
   router.post('/app/ceo/coupon/deleteV2', AuthControllerCeoApp.storeCouponDeleteV2);
   router.post('/app/ceo/stamp/insert', AuthControllerCeoApp.storeStampInsert);
   router.post('/app/ceo/stamp/edit', AuthControllerCeoApp.storeStampEdit);
   router.post('/app/ceo/stamp/delete', AuthControllerCeoApp.storeStampDelete);
   router.post('/app/ceo/stamp/changeState', AuthControllerCeoApp.storeStampChangeState);
   router.post('/app/ceo/store/storePause', AuthControllerCeoApp.storePause);
   router.post('/app/ceo/store/information', StoreRegisterController.information);
   router.post('/app/ceo/store/validationBusiness', StoreRegisterController.validationBusiness);
   router.post('/app/ceo/store/storeNotice', StoreRegisterController.storeNotice);
   router.post('/app/ceo/store/introduction', StoreRegisterController.introduction);
   router.post('/app/ceo/store/originIntroduction', StoreRegisterController.originIntroduction);
   router.post('/app/ceo/store/pickup/pickupInfo', StoreRegisterController.pickupInfo);
   router.post('/app/ceo/store/product/changeIndexCategory', StoreRegisterController.changeIndexCategory);
   router.post('/app/ceo/store/product/editOption/v3', AuthControllerSalesApp.editOptionV3);
   router.post('/app/ceo/store/product/insert/mainMenu', StoreRegisterController.insertMainMenu);
   router.post('/app/ceo/store/search/product', StoreRegisterController.searchProduct);
   router.post('/app/ceo/store/search/product/changeIndexMainMenu', validateToken(passport, StoreController.changeIndexMainMenu));

   router.get('/app/ceo/store/categoryList/v3-:store_id', StoreRegisterController.categoryList);
   router.get('/app/ceo/store/storeNotice-:store_id', StoreRegisterController.getStoreNotice);
   router.get('/app/ceo/store/information-:store_id', StoreRegisterController.getInformation);
   router.get('/app/ceo/store/introduction-:store_id', StoreRegisterController.getIntroduction);
   router.get('/app/ceo/store/originIntroduction-:store_id', StoreRegisterController.getOriginIntroduction);
   router.get('/app/ceo/store/storeAlert-:store_id', StoreRegisterController.getStoreAlert);
   router.get('/app/ceo/store/ownerAccount-:store_id', StoreRegisterController.ownerAccount);
   router.get('/app/ceo/store/detailMenuList-:store_id', AuthControllerCeoApp.detailMenuList);
   router.get('/app/ceo/store/menuList-:category_id', AuthControllerCeoApp.menuList);
   router.get('/app/ceo/home/dashboard-:store_id', AuthControllerCeoApp.dashboard);
   router.get('/app/ceo/coupon/list-:store_id', AuthControllerCeoApp.storeCouponList);
   router.get('/app/ceo/stamp/list-:store_id', AuthControllerCeoApp.storeStampList);
   router.get('/app/ceo/store/product/mainMenu-:store_id', StoreRegisterController.mainMenu);
   router.get('/app/ceo/store/product/getAll-:store_id', StoreRegisterController.getAllProduct);
   
   router.post('/app/ceo/stamp/sealOfApproval', StampController.sealOfApproval);
   
   //order
   router.get('/store/order/getall', validateToken(passport, OrderController.getAllOrders));

   router.post('/store/designated/order/getall', DesignatedController.getAllOrders);
   router.post('/store/designated/order/changeNotiType', DesignatedController.changeNotiType);
   router.post('/store/designated/order/changestate', DesignatedController.changeState);

   //todo --release
   router.post('/number-of-traders-Registration', AuthController.tradersRegistration);
   router.post('/authenticate/register/documents', AuthController.documents);
   router.post('/makePdf', AuthController.makePdf);
   router.post('/pass-notice-result', ContractController.passNoticeResult);
   router.post('/payment/AdjustmentPaymentExcel', validateToken(passport, PaymentController.AdjustmentPaymentExcel));
   
   router.get('/payment/chartData-:store_id', validateToken(passport, PaymentController.chartData));

   // email test
   router.post('/test/emailSender', TestController.senderEmail);
   router.post('/test/event/app/push', TestController.sendAppPushMessage);

   //kakaotalk
   router.post('/order/cancel/activate-kakaotalk', DashboardController.activateOrderCancelKakao);
   router.post('/order/new/activate-kakaotalk', DashboardController.activateNewOrderKakao);

   //commercial
   router.get('/store/commercial/getCommercial/-:store_id', validateToken(passport, CommercialController.getCommercial));
   router.get('/store/commercial/used/getCommercial/-:store_id', validateToken(passport, CommercialController.getUsedCommercial));
   router.get('/store/commercial/chart/getCommercial/-:store_id', validateToken(passport, CommercialController.getUsedCommercialChart));
   router.get('/store/commercial/coupon/getCouponList-:store_id', validateToken(passport, CommercialController.getCommercialCouponList));
   router.get('/store/commercial/throoOnly/getThrooOnlyList-:store_id', validateToken(passport, CommercialController.getCommercialThrooOnlyList));
   router.get('/store/commercial/product/getProductList-:store_id', validateToken(passport, CommercialController.getCommercialProductList));
   router.get('/store/commercial/newStore/getStoreDetailList-:store_id', validateToken(passport, CommercialController.getCommercialStoreDetailList));
   
   router.post('/store/commercial/chargedPoint/firstStep', validateToken(passport, CommercialController.chargedPointFirstStep));
   router.post('/store/commercial/chargedPoint/lastStep', validateToken(passport, CommercialController.chargedPointLastStep));
   router.post('/store/commercial/chargedPoint/check', validateToken(passport, CommercialController.chargedPointCheck));
   router.post('/store/commercial/payCommercial/step1', validateToken(passport, CommercialController.paymentCommercial));
   router.post('/store/commercial/payCommercial/step2', validateToken(passport, CommercialController.completePaymentCommercial));
   router.post('/store/commercial/paymentList', validateToken(passport, CommercialController.paymentList));
   router.post('/store/commercial/editBannerCommercial', validateToken(passport, CommercialController.editBannerCommercial));
   router.post('/store/commercial/getChart', CommercialController.getChart);

   return router;
};

module.exports = APIRoutes;
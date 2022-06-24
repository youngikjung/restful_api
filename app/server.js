'use strict';

// NPM dependencies.
var express = require('express'),
   bodyParser = require('body-parser'),
   morgan = require('morgan'),
   passport = require('passport'),
   cors = require('cors'),
   cron = require('node-cron'),
   config = require('../app/config');
var admin = require("firebase-admin");

const {
   validateUnRegisterUser,
   sendSettlementToStore,
   senderCancelOrderCoupon,
   processCalculateOrder,
   validateUserStamp,
   addAlertMessage
} = require('./batch/job/checkUser');

let shell = require("shelljs");
// Server port to listen to
const port = process.env.PORT || 8080;

// App related modules.
var hookJWTStrategy = require('./services/passportStrategy');

// Initializations.
var app = express();

app.use(cors())

// Parse as urlencoded and json.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Hook up the HTTP logger.
app.use(morgan('dev'));

// Hook up Passport.
app.use(passport.initialize());

// Hook the passport JWT strategy.
hookJWTStrategy(passport);

// Set the static files location.
app.use(express.static(__dirname + '/../public'));

// Bundle API routes.
app.use('/', require('./routes/api')(passport));

app.use(require('./middleware/errorMiddleware').all)

cron.schedule('10 13 * * *', async () => {
   if (config.environment == 'production') {
      await validateUnRegisterUser();
      await sendSettlementToStore();
   }
   //await addAlertMessage("스루 자동취소 안내",stext);
});

cron.schedule('01 11 * * *', async () => {
   if (config.environment == 'production') {
      await senderCancelOrderCoupon();
      await processCalculateOrder();
   }
});

// Start the server.
app.listen(port, function () {
   console.log('Magic happens at http://localhost:' + port + '/! We are now all now doomed!');
});
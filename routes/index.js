const express = require('express');
const router = express.Router();
const shippo = require('shippo')(process.env.SHIPKEY);
const bodyParser = require('body-parser');
const formData = require('form-data');
const Mailgun = require('mailgun.js');

const mailgun = new Mailgun(formData);
const mg = mailgun.client({username: 'api', key: process.env.MAILKEY});

const urlencodedParser = bodyParser.urlencoded({ extended: false });

/* GET home page. */
router.get('*', function (req, res, next) {
  res.redirect(301, "https://hurstdentalstudio.com/shipping");
});

/* POST home page. */
router.post('*', urlencodedParser, function (req, res) {

  const addressFrom = {
    "name": req.body.name,
    "company": req.body.company,
    "street1": req.body.street1,
    "city": req.body.city,
    "state": req.body.state,
    "zip": req.body.zip,
    "country": "US",
    "phone": req.body.phone,
    "email": req.body.email,
  };

  const addressTo = {
    "name": "Lab",
    "company": "Hurst Dental Studio",
    "street1": "700 East State Street Ste.200",
    "city": "Eagle",
    "state": "ID",
    "zip": "83616",
    "country": "US",
    "phone": "(208) 378-3506",
    "email": "mitch@hurstdentalstudio.com"
  };

  const parcel = {
    "length": "9",
    "width": "6",
    "height": "4",
    "distance_unit": "in",
    "weight": "1",
    "mass_unit": "lb"
  };

  const shipment = {
    "address_from": addressFrom,
    "address_to": addressTo,
    "parcels": [parcel],
    "async": false
  };

  let carrieraccount = false;
  if (req.body.carrier === "usps_priority") {
    carrieraccount = "00378fce78ec4993b419757bd9e29ba3";
  } else if (req.body.carrier === "fedex_2_day") {
    carrieraccount = "ae6cf7b25f34447483bf75505446a460";
  } else if (req.body.carrier === "ups_ground") {
    carrieraccount = "52b612c778574f2db816e46d709e41b0";
  } else {
    res.send({
      message: "No valid carrier please contact site admin",
      body: req.body
    });
  }

  if (carrieraccount) {
    shippo.transaction.create({
      "shipment": shipment,
      // Selecting carrier accounts
      "carrier_account": carrieraccount,
      "servicelevel_token": req.body.carrier
    }, function (err, transaction) {
      if (transaction.status === "SUCCESS") {
        const messageParams = {
          from: "Mitch Hurst <mitch@hurstdentalstudio.com>",
          to: [req.body.email],
          subject: "Thank you for using Hurst Dental Studio's shipping service.",
          text: `
            Thank you for using Hurst Dental Studio's shipping service.\r\n
            Please keep the following numbers and links for your records and/or package status:\r\n\r\n
            1. Print your label: ${transaction.label_url}\r\n
            2. Tracking Number: ${transaction.tracking_number}\r\n
            3. Tracking URL: ${transaction.tracking_url_provider}
            `,
          html: `
            <p>
            Thank you for using Hurst Dental Studio's shipping service.<br>
            Please keep the following numbers and links for your records and/or package status:
            </p>
            <ol>
            <li><a href="${transaction.label_url}">Print your label</a></li>
            <li>Track your package after you've shipped: <a href="${transaction.tracking_url_provider}">${transaction.tracking_number}</a></li>
            </ol>
            `
        };
        mg.messages.create(process.env.MAILDOMAIN, messageParams)
          .then(msg => {
            console.log(msg);
          }) // logs response data
          .catch(err => {
            console.log(err);
          }); // logs any error
        console.log(transaction);
        res.send({
          status: "SUCCESS"
        });
      } else {
        console.log(err);
        res.send(err);
      }
    });
  }
});

module.exports = router;

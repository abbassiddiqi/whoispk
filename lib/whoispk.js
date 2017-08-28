'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const changeCase = require('change-case');
const querystring = require('querystring');

exports.lookup = lookup;

function lookup (addr, options, done) {
  if( typeof done === "undefined" && typeof options === "function") {
    done = options;
    options = {};
  }
  fetchWhoisFromPKNIC(addr, function(err, domainInfo) {
    if (err) {
      done(err);
    } else {
      done(null, domainInfo);
    }
  });
}

const pknicUrl = "https://pk6.pknic.net.pk/pk5/lookup.PK";

function fetchWhoisFromPKNIC (addr, done) {

  axios
    .post(pknicUrl, querystring.stringify({ name: addr }) )
    .then(function(response) {

      const domainInfo = parseHTMLResponse(response.data);
      domainInfo.address = addr;

      if( typeof done === "function" ) {
        done(null, domainInfo);
      }

    })
    .catch(function (error) {
      if( typeof done === "function" ) {
        done(error);
      }
    });
}

function parseHTMLResponse (data) {

  const domainInfo = {
    isFound: false
  };

  const $ = cheerio.load(data);
  const $formBox = $(".formbox","#Tmain");
  const $whiteBox = $(".whitebox", "#Tmain");

  if ($formBox.length) {
    // Domain Not Found
  }

  if ($whiteBox.length) {
    // Domain Found

    domainInfo.isFound = true;
    domainInfo.data = {};

    const $rows = $whiteBox.find("tr");

    let lastHeading = "";

    $rows.each(function(i, row) {

      const $row = cheerio(row);

      if($row.children().length == 4) {

        let key   = $row.children().eq(1).text().replace(/\s+/g,' ').trim();
        let value = $row.children().eq(3).text().replace(/\s+/g,' ').trim();

        if( key && value ) {

          key = key.replace(/\:$/,'');
          key = changeCase.snakeCase(key);

          if(key == "registrant_name") { key = "registrant"};
          if(key == "agent_organization") {key = "agent_org"};

          domainInfo.data[key] = value;
        }
        if( key && !value ) {
          key = changeCase.snakeCase(key);
          lastHeading = key;
          domainInfo.data[lastHeading] = [];
        }
        if( !key && value ) {
          domainInfo.data[lastHeading].push(value);
        }
      }

    });
  }

  return domainInfo;
}

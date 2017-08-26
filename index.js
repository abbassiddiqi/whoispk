#!/usr/bin/env node

const axios = require('axios');
const cheerio = require('cheerio');
const program = require('commander');
const changeCase = require('change-case');
const querystring = require('querystring');

const pkg = require('./package.json');

exports.lookup = function(addr, options, done) {
  if( typeof done === "undefined" && typeof options === "function") {
    done = options;
    options = {};
  }
  fetchWhois(addr, function(err, domainInfo){
    if(err) {
      done(err);
    } else {
      done(null, domainInfo);
    }
  });
}

program
  .version(pkg.version)
  .description(pkg.description)
  .arguments('<addr>')
  .usage('[options] address');

program.parse(process.argv);

const pknicUrl = "https://pk6.pknic.net.pk/pk5/lookup.PK";

function fetchWhois(addr, done) {

  axios
    .post(pknicUrl, querystring.stringify({ name: addr }) )
    .then(function(response) {

      let domainInfo = {
        isFound: false,
        address: addr
      };

      const $ = cheerio.load(response.data);
      const $formBox = $(".formbox","#Tmain");
      const $whiteBox = $(".whitebox", "#Tmain");

      // Domain Not Found
      if( $formBox.length ) {
        //
      }
      // Domain Found
      if( $whiteBox.length ) {
        domainInfo = parseResult($whiteBox);
      }

      if( typeof done == "function" ) {
        done(null, domainInfo);
      }

      printMessage(domainInfo);
    })
    .catch(function(error){
      console.log("Server connection Error!");
      console.log("Please try again.");
      console.log(error);
      if( typeof done == "function" ) {
        done(error);
      }
    });
}

function parseResult($data) {

  $rows = $data.find("tr");

  let lastHeading = "";
  const domainInfo = { isFound: true, data: {} };
  $rows.each(function(i, row) {
    $row = cheerio(row);
    if($row.children().length == 4) {
      let key = $row.children().eq(1).text().replace(/\s+/g,' ').trim();
      const value = $row.children().eq(3).text().replace(/\s+/g,' ').trim();

      if( key && value ) {
        key = key.replace(/\:$/,'');
        if(key == "Registrant Name") { key = "Registrant"};
        if(key == "Agent Organization") {key = "Agent Org"};
        key = changeCase.snakeCase(key);
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

  return domainInfo;
}

function printMessage(domainInfo) {
  if( !domainInfo.isFound ) {
    console.log("");
    console.log("   Domain not found: " + domainInfo.address);
    console.log("   This domain is not registered and may be available for registration to you.");
    console.log("");
  }

  if( domainInfo.isFound ) {
      console.log("");
      for(const prop in domainInfo.data) {
        if( typeof domainInfo.data[prop] == "object" ) {
          console.log("");
          console.log("   " + changeCase.titleCase(prop) + ":");
          domainInfo.data[prop].forEach(function(item){
            console.log("\t\t" + item);
          });
        } else {
          console.log("   " + changeCase.titleCase(prop) + ":\t" + domainInfo.data[prop]);
        }
      }
      console.log("");
  }
}


// To run the program from command-line
if (!program.args.length) {
  program.help();
} else {
  const address = process.argv.slice(2);
  fetchWhois(address);
}

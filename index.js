#!/usr/bin/env node

const axios = require('axios');
const cheerio = require('cheerio');
const program = require('commander');
const querystring = require('querystring');

const pkg = require('./package.json');

exports.lookup = function(addr, options, done) {
  if( typeof done === "undefined" && typeof options === "function") {
    done = options;
    options = {};
  }
  fetchWhois(addr, done)
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
        isFound: false
      };

      const $ = cheerio.load(response.data);
      const $formBox = $(".formbox","#Tmain");
      const $whiteBox = $(".whitebox", "#Tmain");

      // Domain Not Found
      if( $formBox.length ) {
        domainInfo = {
          isFound: false,
          address: addr
        }
      }
      // Domain Found
      else if( $whiteBox.length ) {
        domainInfo = parseResult($whiteBox);
      }

      printMessage(domainInfo);
    })
    .catch(function(error){
      console.log("Server connection Error!");
      console.log("Please try again.");
      console.log(error);
    });
}

function parseResult($data) {

  $rows = $data.find("tr");

  let lastHeading = "";
  const domainInfo = { isFound: true };
  $rows.each(function(i, row) {
    $row = cheerio(row);
    if($row.children().length == 4) {
      let key = $row.children().eq(1).text().replace(/\s+/g,' ').trim();
      const value = $row.children().eq(3).text().replace(/\s+/g,' ').trim();

      if( key && value ) {
        if(key == "Registrant Name:") { key = "Registrant:"};
        if(key == "Agent Organization:") {key = "Agent Org:"};
        domainInfo[key] = value;
      }
      if( key && !value ) {
        lastHeading = key;
        domainInfo[lastHeading] = [];
      }
      if( !key && value ) {
        domainInfo[lastHeading].push(value);
      }
    }
  });

  return domainInfo;
}

function printMessage(domainInfo) {
  if( !domainInfo.isFound ) {
    console.log("Domain not found: " + domainInfo.address);
    console.log("This domain is not registered and may be available for registration to you.");
    console.log("");
  }

  if( domainInfo.isFound ) {
      console.log("");
      for(const prop in domainInfo) {
        if(prop == "isFound") continue;
        if( typeof domainInfo[prop] == "object" ) {
          console.log("");
          console.log("  " + prop + ": ");
          domainInfo[prop].forEach(function(item){
            console.log("\t\t" + item);
          });
        } else {
          console.log("  " + prop + "\t" + domainInfo[prop]);
        }
      }
      console.log("");
  }
}


// Run the program

if (!program.args.length) program.help();

const address = process.argv.slice(2);
fetchWhois(address);

#!/usr/bin/env node
const program = require('commander');
const changeCase = require('change-case');
const whoispk = require('../lib/whoispk.js');
const pkg = require('../package.json');

program
  .version(pkg.version)
  .description(pkg.description)
  .arguments('<addr>')
  .usage('[optioins] address');

program.parse(process.argv);

// To run the program from command-line
if (!program.args.length) {
  program.help();
} else {

  const address = process.argv.slice(2);

  whoispk.lookup(address, function (err, domainInfo) {
    if(err) {
      console.log("Server connection Error!");
      console.log("Please try again.");
      throw err;
    }
    printMessage(domainInfo);
  });
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

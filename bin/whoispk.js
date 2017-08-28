#!/usr/bin/env node

'use strict';

const program = require('commander');
const changeCase = require('change-case');
const chalk = require('chalk');
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
    if (err) {
      console.log("Server connection Error!");
      console.log("Please try again.");
      throw err;
    }
    printMessage(domainInfo);
  });
}


function printMessage(domainInfo) {
  if (!domainInfo.isFound) {
    console.log("");
    console.log("   Domain not found: " + chalk.inverse(domainInfo.address));
    console.log(chalk.italic.dim("   This domain is not registered and may be available for registration to you."));
    console.log("");
  }

  if (domainInfo.isFound) {
      console.log("");
      for (const prop in domainInfo.data) {
        if (typeof domainInfo.data[prop] == "object") {
          console.log("");
          console.log("   " + chalk.italic(changeCase.titleCase(prop) + ":"));
          domainInfo.data[prop].forEach(function (item) {
            console.log("\t\t" + chalk(item));
          });
        } else {
          console.log("   " + chalk.italic(changeCase.titleCase(prop) + ":\t") + chalk(domainInfo.data[prop]) );
        }
      }
      console.log("");
  }
}

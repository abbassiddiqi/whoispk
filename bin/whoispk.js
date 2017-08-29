#!/usr/bin/env node
'use strict';

const chalk = require('chalk');
const program = require('commander');
const changeCase = require('change-case');

const pkg = require('../package.json');
const whoispk = require('../lib/whoispk.js');

program
  .version(pkg.version)
  .description(pkg.description)
  .arguments('<addr>')
  .action(getDomainInfo)
  .usage('[options] address')
  .parse(process.argv);

if (!program.args.length) {
  program.help();
}

function getDomainInfo (address) {
  whoispk.lookup(address, function (err, domainInfo) {
    if (err) {
      console.log("");
      console.log(chalk.red("   Error!") + " Server connection Error.");
      console.log("         " + " Please try again.");
      console.log("");
      process.exit(1);
    }
    printMessage(domainInfo);
    process.exit(0);
  });
}

function printMessage (domainInfo) {
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

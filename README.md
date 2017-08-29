whoispk
=======

[![npm version](http://img.shields.io/npm/v/whoispk.svg?style=flat)](https://npmjs.org/package/whoispk "View this project on npm")
[![npm](https://img.shields.io/npm/dt/whoispk.svg)]()
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg?colorB=9b59b6)](http://opensource.org/licenses/MIT)

Issue WHOIS lookup for PKNIC (.pk) domain names from the command line.

## Installation

### Global

```sh
npm install -g whoispk
```

#### Usage

    whoispk [options] address

    Options:
      -V, --version  output the version number
      -h, --help     output usage information

### Local

```sh
npm install whoispk
```

#### Usage

Using callback function

```js
const whoispk = require('whoispk');

whoispk.lookup('daraz.pk', function (err, domainInfo) {

  if (err) {
    throw err;
  }

  if (domainInfo.isFound) {
    console.log(domainInfo.data);
  } else {
    console.log('Domain not Found');
  }

});
```

or Using ES6 Promise

```js
const whoispk = require('whoispk');

whoispk
  .lookup('daraz.pk')
  .then(function (domainInfo) {

    if (domainInfo.isFound) {
      console.log(domainInfo.data);
    } else {
      console.log('Domain not Found');
    }
  })
  .catch(function (err) {
    throw err;
  });
```

The console will show following information if domainInfo.isFound is true
```js
{
  domain_name: 'daraz.pk',
  registrant: 'Jade E Services Pakistan {Pvt} Limited',
  address: 'Clifton Karachi; South Sindh 75600Pakistan',
  create_date: 'May 14, 2012',
  expire_date: 'May 14, 2018',
  agent_org: 'iS-Fun Internet Services GmbH',
  technical_contact: [
    'Jade E Services Pakistan {Pvt} Limited',
    'Raja Muneeb Idrees M Admin',
    'Clifton, Karachi; South Sindh75600'
  ],
  billing_contact: [
    'iS-Fun Internet Services GmbH',
    'Robin Fundinger',
    'Karlsbad, 76307'
  ],
  nameservers: [
    'kip.ns.cloudflare.com',
    'naomi.ns.cloudflare.com'
  ]
}
```

Source of information: http://pknic.net.pk

## Contributing

Contributions are welcome.

## License

whoispk is available under [the MIT license](https://github.com/abbassiddiqi/whoispk/blob/master/LICENSE).

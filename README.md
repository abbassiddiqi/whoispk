# whoispk

Issue WHOIS lookup for PKNIC (.pk) domain names from the command line.

## Installation

### Global

Using NPM

```sh
npm install -g whoispk
```

Using YARN

```sh
yarn global add whoispk
```

#### Usage

    whoispk [options] address

    Options:
      -V, --version  output the version number
      -h, --help     output usage information

### Local

Using NPM

```sh
npm install whoispk
```

Using YARN

```sh
yarn add whoispk
```

#### Usage

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

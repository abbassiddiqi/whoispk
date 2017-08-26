# whoispk

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]

Issue WHOIS lookup for PKNIC (.pk) domain names from the command line

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

Source of information: http://pknic.net.pk

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

whoispk.lookup('daraz.pk', function(err, domainInfo) {

  if ( err ) {
    throw err;
  }

  if ( domainInfo.isFound ) {
    console.log(domainInfo.data);
  } else {
    console.log('Domain not Found');
  }

});
```

## Contributing

Contributors are welcome

## License

whoispk is available under [the MIT license](https://github.com/abbassiddiqi/whoispk/blob/master/LICENSE).

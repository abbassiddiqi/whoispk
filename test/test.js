const assert = require('assert');
const whoispk = require('../lib/whoispk.js');

describe('whoispk', function () {

  describe('lookup', function () {

    this.timeout(4 * 4000);

    it('should return domain information via Promise', function (done) {
      whoispk
        .lookup('daraz.pk')
        .then(function (domainInfo) {
          if (domainInfo.isFound) {
            done();
          } else {
            done(new Error('domainInfo.isFound is false'));
          }
        })
        .catch(function (err) {
          done(err);
        });
    });

    it('should return domain information via Callback', function (done) {
      whoispk
        .lookup('daraz.pk', function (err, domainInfo) {
          if (err) {
            done(err);
          } else {
            if (domainInfo.isFound) {
              done();
            } else {
              done(new Error('domainInfo.isFound is false'));
            }
          }
        });
    });

    it('should return domain not found via Promise', function (done) {
      whoispk
        .lookup('daraz.pkdaraz')
        .then(function (domainInfo) {
          if (!domainInfo.isFound) {
            done();
          } else {
            done(new Error('domainInfo.isFound is true'));
          }
        })
        .catch(function (err) {
          done(err);
        });
    });

    it('should return domain not found via Callback', function (done) {
      whoispk.lookup('daraz.pkdaraz', function (err, domainInfo) {
        if (err) {
          done(err);
        } else {
          if (!domainInfo.isFound) {
            done();
          } else {
            done(new Error('domainInfo.isFound is true'));
          }
        }
      });
    });

  });

});

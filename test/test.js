const chai = require('chai');
const expect = require('chai').expect;

const whoispk = require('../lib/whoispk.js');

describe('whoispk', function () {

  describe('lookup', function () {

    it('returns a promise', function () {
      const promise = whoispk.lookup('daraz.pk');
      expect(promise.then).to.be.a('function');
    });

    it('calls callback', function (done) {
      this.timeout(4000);
      whoispk.lookup('daraz.pk', function (err, domainInfo) {
        expect(err).to.be.null;
        expect(domainInfo).to.be.an('object');

        done();
      });
    });

    it('returns domain information via Promise', function (done) {
      this.timeout(4000);
      whoispk
        .lookup('daraz.pk')
        .then(function (domainInfo) {
          expect(domainInfo).to.be.an('object');
          expect(domainInfo.isFound).to.be.true;
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });

    it('returns domain information via Callback', function (done) {
      this.timeout(4000);
      whoispk
        .lookup('daraz.pk', function (err, domainInfo) {
          if (err) {
            done(err);
          } else {
            expect(domainInfo).to.be.an('object');
            expect(domainInfo.isFound).to.be.true;
            done();
          }
        });
    });

    it('returns domain not found via Promise', function (done) {
      this.timeout(4000);
      whoispk
        .lookup('a.pk')
        .then(function (domainInfo) {
          expect(domainInfo.isFound).to.be.false;
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });

    it('returns domain not found via Callback', function (done) {
      this.timeout(4000);
      whoispk.lookup('a.pk', function (err, domainInfo) {
        expect(err).to.be.null;
        expect(domainInfo.isFound).to.be.false;
        done();
      });
    });

  });

});

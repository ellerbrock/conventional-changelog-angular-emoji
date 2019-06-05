'use strict';
var execSync = require('child_process').execSync;
var conventionalChangelogCore = require('conventional-changelog-core');
var preset = require('../src');
var expect = require('chai').expect;
var gitDummyCommit = require('git-dummy-commit');
var shell = require('shelljs');
var through = require('through2');
var betterThanBefore = require('better-than-before')();
var preparing = betterThanBefore.preparing;

betterThanBefore.setups([
  function() {
    shell.config.silent = true;
    shell.rm('-rf', 'tmp');
    shell.mkdir('tmp');
    shell.cd('tmp');
    shell.mkdir('git-templates');
    shell.exec('git init --template=./git-templates');

    gitDummyCommit(':ticket: chore: first commit');
    gitDummyCommit([':sparkles: feat: amazing new module', 'BREAKING CHANGE: Not backward compatible.']);
    gitDummyCommit([':bug: fix(compile): avoid a bug', 'BREAKING CHANGE: The Change is huge.']);
    gitDummyCommit([':rocket: perf(ngOptions): make it faster', ' closes #1, #2']);
    gitDummyCommit(':construction_worker: build(npm): update dependencies');
    gitDummyCommit(':computer: ci(travis): update travis configuration');
    gitDummyCommit(':bug: fix(*): oops');
  },
  function() {
    gitDummyCommit([':sparkles: feat(awesome): addresses the issue brought up in #133']);
  },
  function() {
    gitDummyCommit([':sparkles: feat(awesome): fix #88']);
  },
  function() {
    gitDummyCommit([':sparkles: feat(awesome): issue brought up by @ellerbrock! on Friday']);
  },
  function() {
    gitDummyCommit([':book: docs(readme): make it clear', 'BREAKING CHANGE: The Change is huge.']);
    gitDummyCommit([':gem: style(whitespace): make it easier to read', 'BREAKING CHANGE: The Change is huge.']);
    gitDummyCommit([':package: refactor(code): change a lot of code', 'BREAKING CHANGE: The Change is huge.']);
    gitDummyCommit([':rotating_light: test(*): more tests', 'BREAKING CHANGE: The Change is huge.']);
    gitDummyCommit([':ticket: chore(deps): bump', 'BREAKING CHANGE: The Change is huge.']);
  },
  function() {
    gitDummyCommit([':sparkles: feat(deps): bump', 'BREAKING CHANGES: Also works :)']);
  },
  function() {
    shell.exec('git tag v1.0.0');
    gitDummyCommit(':sparkles: feat: some more features');
  }
]);


describe('angular-emoji preset', function() {

  it('should work if there is no semver tag', function(done) {
    preparing(1);

    conventionalChangelogCore({
      config: preset({
        "userUrlFormat": "https://test.com/{{user}}",
        "issueUrlFormat": "https://test.com/issues/{{id}}",
        "commitUrlFormat": "https://test.com/commit/{{hash}}",
        "compareUrlFormat": "https://test.com/compare/{{previousTag}}...{{currentTag}}"
      }),
    })
      .on('error', function(err) {
        done(err);
      })
      .pipe(through(function(chunk) {
        chunk = chunk.toString();

        expect(chunk).to.include('amazing new module');
        expect(chunk).to.include('**compile:** avoid a bug');
        expect(chunk).to.include('make it faster');
        expect(chunk).to.include(', closes [#1](https://test.com/issues/1) [#2](https://test.com/issues/2)');
        expect(chunk).to.include('Not backward compatible.');
        expect(chunk).to.include('**compile:** The Change is huge.');
        expect(chunk).to.include('Features');
        expect(chunk).to.include('Bug Fixes');
        expect(chunk).to.include('Performance Improvements');
        expect(chunk).to.include('update dependencies');
        expect(chunk).to.include('update travis configuration');
        expect(chunk).to.include('BREAKING CHANGES');

        expect(chunk).to.not.include('feat');
        expect(chunk).to.not.include('fix');
        expect(chunk).to.not.include('perf');
        expect(chunk).to.not.include('revert');
        expect(chunk).to.not.include('***:**');
        expect(chunk).to.not.include(': Not backward compatible.');

        done();
      }));
  });

  it('should replace #[0-9]+ with GitHub issue URL', function(done) {
    preparing(2);

    conventionalChangelogCore({
      config: preset({
        "userUrlFormat": "https://test.com/{{user}}",
        "issueUrlFormat": "https://test.com/issues/{{id}}",
        "commitUrlFormat": "https://test.com/commit/{{hash}}",
        "compareUrlFormat": "https://test.com/compare/{{previousTag}}...{{currentTag}}"
      }),
    })
      .on('error', function(err) {
        done(err);
      })
      .pipe(through(function(chunk) {
        chunk = chunk.toString();
        expect(chunk).to.include('[#133](https://test.com/issues/133)');
        done();
      }));
  });

  it('should remove the issues that already appear in the subject', function(done) {
    preparing(3);

    conventionalChangelogCore({
      config: preset({
        "userUrlFormat": "https://test.com/{{user}}",
        "issueUrlFormat": "https://test.com/issues/{{id}}",
        "commitUrlFormat": "https://test.com/commit/{{hash}}",
        "compareUrlFormat": "https://test.com/compare/{{previousTag}}...{{currentTag}}"
      }),
    })
      .on('error', function(err) {
        done(err);
      })
      .pipe(through(function(chunk) {
        chunk = chunk.toString();
        expect(chunk).to.include('[#88](https://test.com/issues/88)');
        expect(chunk).to.not.include('closes [#88](https://test.com/issues/88)');
        done();
      }));
  });


  it('should replace @username with template user URL', function(done) {
    preparing(4);

    conventionalChangelogCore({
      config: preset({
        "userUrlFormat": "https://test.com/{{user}}",
        "issueUrlFormat": "https://test.com/issues/{{id}}",
        "commitUrlFormat": "https://test.com/commit/{{hash}}",
        "compareUrlFormat": "https://test.com/compare/{{previousTag}}...{{currentTag}}"
      }),
    })
      .on('error', function(err) {
        done(err);
      })
      .pipe(through(function(chunk) {
        chunk = chunk.toString();
        expect(chunk).to.include('[@ellerbrock](https://test.com/ellerbrock)');
        done();
      }));
  });

  it('should not discard commit if there is BREAKING CHANGE', function(done) {
    preparing(5);

    conventionalChangelogCore({
      config: preset({
        "userUrlFormat": "https://test.com/{{user}}",
        "issueUrlFormat": "https://test.com/issues/{{id}}",
        "commitUrlFormat": "https://test.com/commit/{{hash}}",
        "compareUrlFormat": "https://test.com/compare/{{previousTag}}...{{currentTag}}"
      }),
    })
      .on('error', function(err) {
        done(err);
      })
      .pipe(through(function(chunk) {
        chunk = chunk.toString();

        expect(chunk).to.include('Documentation');
        expect(chunk).to.include('Styles');
        expect(chunk).to.include('Code Refactoring');
        expect(chunk).to.include('Tests');
        expect(chunk).to.include('Chores');

        done();
      }));
  });

  it('should BREAKING CHANGES the same as BREAKING CHANGE', function(done) {
    preparing(6);

    conventionalChangelogCore({
      config: preset({
        "userUrlFormat": "https://test.com/{{user}}",
        "issueUrlFormat": "https://test.com/issues/{{id}}",
        "commitUrlFormat": "https://test.com/commit/{{hash}}",
        "compareUrlFormat": "https://test.com/compare/{{previousTag}}...{{currentTag}}"
      }),
    })
      .on('error', function(err) {
        done(err);
      })
      .pipe(through(function(chunk) {
        chunk = chunk.toString();

        expect(chunk).to.include('Also works :)');

        done();
      }));
  });

  it('should work if there is a semver tag', function(done) {
    preparing(7);
    var i = 0;

    conventionalChangelogCore({
      config: preset({
        "userUrlFormat": "https://test.com/{{user}}",
        "issueUrlFormat": "https://test.com/issues/{{id}}",
        "commitUrlFormat": "https://test.com/commit/{{hash}}",
        "compareUrlFormat": "https://test.com/compare/{{previousTag}}...{{currentTag}}"
      }),
      outputUnreleased: true
    })
      .on('error', function(err) {
        done(err);
      })
      .pipe(through(function(chunk, enc, cb) {
        chunk = chunk.toString();

        expect(chunk).to.include('some more features');
        expect(chunk).to.not.include('BREAKING');

        i++;
        cb();
      }, function() {
        expect(i).to.equal(1);
        done();
      }));
  });

  it('should work with unknown host', function(done) {
    preparing(7);
    var i = 0;

    conventionalChangelogCore({
      config: preset({
        "userUrlFormat": "https://test.com/{{user}}",
        "issueUrlFormat": "https://test.com/issues/{{id}}",
        "commitUrlFormat": "https://test.com/commit/{{hash}}",
        "compareUrlFormat": "https://test.com/compare/{{previousTag}}...{{currentTag}}"
      }),
      pkg: {
        path: __dirname + '/fixtures/_unknown-host.json'
      }
    })
      .on('error', function(err) {
        done(err);
      })
      .pipe(through(function(chunk, enc, cb) {
        chunk = chunk.toString();

        expect(chunk).to.include('(https://test.com/compare');
        expect(chunk).to.include('](https://test.com/commit/');

        i++;
        cb();
      }, function() {
        expect(i).to.equal(1);
        done();
      }));
  });
});

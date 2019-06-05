'use strict';
const compareFunc = require('compare-func');
const Q = require('q');
const readFile = Q.denodeify(require('fs').readFile);
const resolve = require('path').resolve;
const path = require('path');

const recommendedBumpOpts = require(`./conventional-recommended-bump`)

let pkgJson = {};

try {
  pkgJson = require(path.resolve(
    process.cwd(),
    './package.json'
  ));
} catch (err) {
  console.error('no root package.json found');
}

const parserOpts = {
  headerPattern: /^(?:.*|:\w*: )?(\w*)(?:\((.*)\))?\: (.*)$/,
  headerCorrespondence: [
    'type',
    'scope',
    'subject'
  ],
  noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
  revertPattern: /^revert:\s([\s\S]*?)\s*This reverts commit (\w*)\./,
  revertCorrespondence: ['header', 'hash']
};

// expand on the simple mustache-style templates supported in
// configuration (we may eventually want to use handlebars for this).
function expandTemplate (template, context) {
  let expanded = template
  Object.keys(context).forEach(key => {
    expanded = expanded.replace(new RegExp(`{{${key}}}`, 'g'), context[key])
  })
  return expanded
}

function getWriterOpts(config) {
  return {
    transform: function(commit, context) {
      let discard = true;
      const issues = [];

      commit.notes.forEach(function(note) {
        note.title = ':bangbang: BREAKING CHANGES';
        discard = false;
      });

      // Angular 2 commit conventions
      // Link: https://github.com/angular/angular/blob/master/CONTRIBUTING.md#type
      // added: build, ci

      if (commit.type === 'feat') {
        commit.type = ':sparkles: Features';
      } else if (commit.type === 'fix') {
        commit.type = ':bug: Bug Fixes';
      } else if (commit.type === 'docs') {
        commit.type = ':book: Documentation';
      } else if (commit.type === 'style') {
        commit.type = ':gem: Styles';
      } else if (commit.type === 'refactor') {
        commit.type = ':package: Code Refactoring';
      } else if (commit.type === 'perf') {
        commit.type = ':rocket: Performance Improvements';
      } else if (commit.type === 'test') {
        commit.type = ':rotating_light: Tests';
      } else if (commit.type === 'build') {
        commit.type = ':construction_worker: Build';
      } else if (commit.type === 'ci') {
        commit.type = ':computer: Continuous Integration';
      } else if (commit.type === 'chore') {
        commit.type = ':ticket: Chores';
      } else if (commit.type === 'revert') {
        commit.type = ':back: Reverts';
      } else if (discard) {
        return;
      }

      if (commit.scope === '*') {
        commit.scope = '';
      }

      if (typeof commit.hash === 'string') {
        commit.hash = commit.hash.substring(0, 7);
      }

      if (typeof commit.subject === 'string') {
        commit.subject = commit.subject.replace(/#([0-9]+)/g, (_, issue) => {
            issues.push(issue)
            const url = expandTemplate(config.issueUrlFormat, {
              host: context.host,
              owner: context.owner,
              repository: context.repository,
              id: issue
            })
            return `[#${issue}](${url})`
          })

          // User URLs.
        commit.subject = commit.subject.replace(/\B@([a-z0-9](?:-?[a-z0-9/]){0,38})/g, (_, user) => {
          // TODO: investigate why this code exists.
          if (user.includes('/')) {
            return `@${user}`
          }

          const usernameUrl = expandTemplate(config.userUrlFormat, {
            host: context.host,
            owner: context.owner,
            repository: context.repository,
            user: user
          })

          return `[@${user}](${usernameUrl})`
        })

        commit.subject = commit.subject;
      }

      // remove references that already appear in the subject
      commit.references = commit.references.filter((reference) => {
        if (issues.indexOf(reference.issue) === -1) {
          return true;
        }

        return false;
      });

      return commit;
    },
    groupBy: 'type',
    commitGroupsSort: 'title',
    commitsSort: ['scope', 'subject'],
    noteGroupsSort: 'title',
    notesSort: compareFunc
  }
}

const owner = '{{#if this.owner}}{{~this.owner}}{{else}}{{~@root.owner}}{{/if}}'
const host = '{{~@root.host}}'
const repository = '{{#if this.repository}}{{~this.repository}}{{else}}{{~@root.repository}}{{/if}}'

module.exports = function(config) {
  const commitUrlFormat = expandTemplate(config.commitUrlFormat, {
    host,
    owner,
    repository
  })
  const compareUrlFormat = expandTemplate(config.compareUrlFormat, {
    host,
    owner,
    repository
  })
  const issueUrlFormat = expandTemplate(config.issueUrlFormat, {
    host,
    owner,
    repository,
    id: '{{this.issue}}'
  })

  return Q.all([
    readFile(resolve(__dirname, 'templates/template.hbs'), 'utf-8'),
    readFile(resolve(__dirname, 'templates/header.hbs'), 'utf-8'),
    readFile(resolve(__dirname, 'templates/commit.hbs'), 'utf-8'),
    readFile(resolve(__dirname, 'templates/footer.hbs'), 'utf-8')
  ])
  .spread(function(template, header, commit, footer) {

    const writerOpts = getWriterOpts(config)

    writerOpts.mainTemplate = template
     writerOpts.headerPartial = header
       .replace(/{{compareUrlFormat}}/g, compareUrlFormat)
     writerOpts.commitPartial = commit
       .replace(/{{commitUrlFormat}}/g, commitUrlFormat)
       .replace(/{{issueUrlFormat}}/g, issueUrlFormat)
     writerOpts.footerPartial = footer

    return {
      parserOpts,
      writerOpts,
      recommendedBumpOpts
    }
  })
}

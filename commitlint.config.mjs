export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce the commit message format
    'type-enum': [
      2,
      'always',
      [
        'build', // Build system or external dependencies changes
        'chore', // Changes to the build process or auxiliary tools and libraries
        'ci', // Changes to our CI configuration files and scripts
        'docs', // Documentation only changes
        'feat', // A new feature
        'fix', // A bug fix
        'perf', // A code change that improves performance
        'refactor', // A code change that neither fixes a bug nor adds a feature
        'revert', // Reverts a previous commit
        'style', // Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
        'test', // Adding missing tests or correcting existing tests
      ],
    ],
    'scope-case': [2, 'always', 'lower-case'], // Enforce lower-case scopes
    'subject-case': [2, 'always', 'lower-case'], // Enforce lower-case subjects
    'subject-empty': [2, 'never'], // Disallow empty subjects
    'subject-full-stop': [2, 'never', '.'], // Disallow full stops in subjects
    'header-max-length': [2, 'always', 100], // Enforce a maximum header length
    'body-leading-blank': [1, 'always'], // Enforce a blank line at the start of the body
    'footer-leading-blank': [1, 'always'], // Enforce a blank line at the start of the footer
    'footer-max-line-length': [2, 'always', 100], // Enforce a maximum footer line length
  },
};

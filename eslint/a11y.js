// cuix's accessibility lint, for consumers:
//   import cuixA11y from '@cirrus/cuix/eslint';
//   export default [...cuixA11y, ...yourConfig];
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  jsxA11y.flatConfigs.strict,
  {
    rules: {
      // A title is never the only channel for a name or a reason.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name=/^(button|a|input|select|textarea)$/] > JSXAttribute[name.name='title']",
          message: 'No `title` on interactive elements: use a visible label, aria-describedby or a Tooltip.',
        },
      ],
    },
  },
];

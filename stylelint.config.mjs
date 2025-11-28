/** @type {import('stylelint').Config} */
export default {
  extends: "stylelint-config-standard",
  customSyntax: "postcss-scss",
  rules: {
    "alpha-value-notation": "number",
    "color-function-notation": "legacy",
    "color-function-alias-notation": null,
    "color-hex-length": null,
    "declaration-property-value-no-unknown": null,
    "selector-class-pattern": null,
    "selector-type-case": null,
    "selector-type-no-unknown": [
      true,
      {
        ignoreTypes: [
          "view",
          "View",
          "text",
          "Text",
          "button",
          "Button",
          "input",
          "Input",
          "textarea",
          "Textarea",
          "image",
          "Image",
          "scroll-view",
          "ScrollView"
        ]
      }
    ],
    "no-invalid-double-slash-comments": null,
    "no-descending-specificity": null,
    "no-duplicate-selectors": null,
    "shorthand-property-no-redundant-values": null,
    "declaration-block-no-shorthand-property-overrides": null,
    "property-no-vendor-prefix": null
  }
};

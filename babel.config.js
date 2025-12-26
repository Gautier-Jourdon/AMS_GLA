export default {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: { node: 'current' },
        useBuiltIns: false
      }
    ]
  ]
};

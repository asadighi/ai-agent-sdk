module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript'
  ],
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  transformIgnorePatterns: [
    'node_modules/(?!(firebase|@firebase)/)'
  ]
}; 
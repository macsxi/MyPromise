const MyPromise = require('./MyPromise');

MyPromise.resolve('aaa').then(value => {
  console.log('[Log] 1-->', value);
  return MyPromise.resolve('bbb');
}).then(value => {
  console.log('[Log] 2-->', value);
})
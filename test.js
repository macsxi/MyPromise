const MyPromise = require('./MyPromise');

MyPromise.resolve('aaa').then(value => {
  console.log('[Log] 1-->', value);
  return MyPromise.resolve('bbb');
}).then(value => {
  console.log('[Log] 2-->', value);
})

const p1 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve('p1');
  }, 1000);
})
const p2 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve('p2');
  }, 1500);
})
const p3 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    reject('p3');
  }, 500);
})

MyPromise.all([p1, p2, p3]).then(values => {
  console.log('[Log] all values-->', values);
}).catch(reason => {
  console.log('[Log] all catch reason-->', reason);
})

MyPromise.race([p1, p2, p3]).then(values => {
  console.log('[Log] race values-->', values);
}).catch(reason => {
  console.log('[Log] race catch reason-->', reason);
})